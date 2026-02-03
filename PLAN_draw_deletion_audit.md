# Plano: Sistema de Auditoria para Exclusão de Sorteios

## 1. Análise da Situação Atual

### 1.1 O que acontece ao deletar um sorteio

**Localização**: `handleDeleteDraw` em `src/pages/LeaguesPage.tsx:1759`

**Código atual**:
```typescript
const handleDeleteDraw = async () => {
  if (!selectedLeague || !currentDraw) return;
  if (!confirm('Tem certeza que deseja apagar o sorteio atual?')) return;

  try {
    await supabase
      .from('weekly_event_draws')
      .delete()
      .eq('id', currentDraw.id);

    setCurrentDraw(null);
    setCurrentPairs([]);
  }
}
```

### 1.2 Schema do Banco de Dados

**`weekly_event_draws`**
- id (PK)
- league_id → leagues(id) ON DELETE CASCADE
- event_date
- drawn_at
- drawn_by → players(id) ON DELETE CASCADE

**`weekly_event_pairs`**
- id (PK)
- draw_id → weekly_event_draws(id) **ON DELETE CASCADE** ✅
- player1_id, player2_id
- pair_number, is_top_12

**`weekly_event_matches`**
- id (PK)
- draw_id → weekly_event_draws(id) **ON DELETE CASCADE** ✅
- pair1_id → weekly_event_pairs(id) **ON DELETE CASCADE** ✅
- pair2_id → weekly_event_pairs(id) **ON DELETE CASCADE** ✅

### 1.3 Conclusão Importante

✅ **NÃO HÁ BUG DE DADOS ÓRFÃOS**

O banco de dados já tem CASCADE DELETE configurado corretamente. Quando um `weekly_event_draw` é deletado:
1. Todos os `weekly_event_matches` relacionados são automaticamente deletados
2. Todos os `weekly_event_pairs` relacionados são automaticamente deletados

**Fonte**: Migrations `20251228023807_add_weekly_event_pair_draws.sql` e `20260103061000_create_weekly_event_matches.sql`

### 1.4 O Problema Real

❌ **NÃO HÁ REGISTRO/LOG DE EXCLUSÃO**

Quando um organizador deleta um sorteio:
- É uma exclusão permanente (hard delete)
- Não há histórico de quem deletou
- Não há registro do que foi deletado
- Não há timestamp da exclusão
- Impossível auditar ou reverter

## 2. Opções de Solução

### Opção 1: Soft Delete 🟡

**Descrição**: Adicionar campo `deleted_at` às tabelas. Em vez de deletar, marca como deletado.

**Mudanças necessárias**:
```sql
ALTER TABLE weekly_event_draws ADD COLUMN deleted_at timestamptz;
ALTER TABLE weekly_event_draws ADD COLUMN deleted_by uuid REFERENCES players(id);
```

**Prós**:
- ✅ Simples de implementar
- ✅ Mantém histórico completo
- ✅ Possibilidade de "undelete"
- ✅ Dados nunca são perdidos

**Contras**:
- ❌ Precisa ajustar TODAS as queries: `WHERE deleted_at IS NULL`
- ❌ Aumenta tamanho do banco ao longo do tempo
- ❌ Complexidade em queries com JOINs
- ❌ CASCADE DELETE não funciona mais automaticamente

**Complexidade**: Média-Alta (muitas mudanças)

---

### Opção 2: Tabela de Auditoria Dedicada 🟢 (RECOMENDADA)

**Descrição**: Criar tabela `draw_deletion_audit_log` para registrar exclusões.

**Nova tabela**:
```sql
CREATE TABLE draw_deletion_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL,  -- ID do draw deletado
  league_id uuid NOT NULL REFERENCES leagues(id),
  event_date date NOT NULL,
  deleted_by uuid NOT NULL REFERENCES players(id),
  deleted_at timestamptz NOT NULL DEFAULT now(),

  -- Snapshot dos dados deletados (JSON)
  draw_data jsonb NOT NULL,
  pairs_data jsonb NOT NULL,
  matches_data jsonb,

  -- Metadados
  total_pairs integer NOT NULL,
  total_matches integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_draw_deletion_audit_league ON draw_deletion_audit_log(league_id);
CREATE INDEX idx_draw_deletion_audit_deleted_by ON draw_deletion_audit_log(deleted_by);
```

**Mudanças no código**:
```typescript
const handleDeleteDraw = async () => {
  if (!selectedLeague || !currentDraw) return;
  if (!confirm('Tem certeza que deseja apagar o sorteio atual?')) return;

  try {
    // 1. Buscar todos os dados antes de deletar
    const { data: pairs } = await supabase
      .from('weekly_event_pairs')
      .select('*')
      .eq('draw_id', currentDraw.id);

    const { data: matches } = await supabase
      .from('weekly_event_matches')
      .select('*')
      .eq('draw_id', currentDraw.id);

    // 2. Registrar no log de auditoria
    await supabase
      .from('draw_deletion_audit_log')
      .insert({
        draw_id: currentDraw.id,
        league_id: selectedLeague.id,
        event_date: currentDraw.event_date,
        deleted_by: profile.id,
        draw_data: currentDraw,
        pairs_data: pairs || [],
        matches_data: matches || [],
        total_pairs: pairs?.length || 0,
        total_matches: matches?.length || 0,
      });

    // 3. Deletar (CASCADE cuida do resto)
    await supabase
      .from('weekly_event_draws')
      .delete()
      .eq('id', currentDraw.id);

    setCurrentDraw(null);
    setCurrentPairs([]);
    // ...
  }
}
```

**Prós**:
- ✅ Não afeta schema existente
- ✅ Não precisa mudar queries
- ✅ CASCADE DELETE continua funcionando
- ✅ Histórico completo e consultável
- ✅ Pode armazenar snapshot completo dos dados
- ✅ Fácil adicionar dashboard de auditoria depois

**Contras**:
- ⚠️ Precisa lembrar de gravar log antes de deletar
- ⚠️ Só funciona se deletar via código (não SQL direto)

**Complexidade**: Baixa (mudanças cirúrgicas)

---

### Opção 3: Trigger de Banco de Dados 🟢

**Descrição**: Criar trigger BEFORE DELETE que grava automaticamente no log.

**Trigger**:
```sql
CREATE OR REPLACE FUNCTION audit_draw_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO draw_deletion_audit_log (
    draw_id,
    league_id,
    event_date,
    deleted_by,
    draw_data,
    pairs_data,
    total_pairs
  )
  VALUES (
    OLD.id,
    OLD.league_id,
    OLD.event_date,
    auth.uid(), -- usuário atual
    to_jsonb(OLD),
    (SELECT jsonb_agg(to_jsonb(p.*)) FROM weekly_event_pairs p WHERE p.draw_id = OLD.id),
    (SELECT COUNT(*) FROM weekly_event_pairs WHERE draw_id = OLD.id)
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_draw_deletion_trigger
  BEFORE DELETE ON weekly_event_draws
  FOR EACH ROW
  EXECUTE FUNCTION audit_draw_deletion();
```

**Prós**:
- ✅ Automático - sempre funciona
- ✅ Funciona mesmo deletando direto no banco
- ✅ Não precisa mudar código frontend
- ✅ Impossível esquecer de logar

**Contras**:
- ⚠️ Lógica no banco (mais difícil debugar)
- ⚠️ Precisa conhecimento de PostgreSQL/plpgsql
- ⚠️ Pode ter problemas com RLS policies

**Complexidade**: Média

---

### Opção 4: Log Simples em Código 🔵

**Descrição**: Gravar log minimalista apenas com metadados básicos.

**Nova tabela simplificada**:
```sql
CREATE TABLE draw_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL,
  league_id uuid NOT NULL,
  event_date date NOT NULL,
  deleted_by uuid NOT NULL REFERENCES players(id),
  deleted_at timestamptz NOT NULL DEFAULT now()
);
```

**Prós**:
- ✅ Muito simples
- ✅ Rápido de implementar

**Contras**:
- ❌ Não guarda snapshot dos dados
- ❌ Impossível reverter ou ver o que foi deletado

**Complexidade**: Muito Baixa

## 3. Recomendação

### 🏆 Opção 2: Tabela de Auditoria Dedicada (com snapshot completo)

**Por quê?**
1. **Melhor custo-benefício**: Baixa complexidade, alto valor
2. **Não invasiva**: Não quebra nada existente
3. **Completa**: Guarda snapshot completo para análise/reversão futura
4. **Escalável**: Pode adicionar dashboard de auditoria depois
5. **Performance**: Não afeta queries existentes

**Próximos passos**:
1. Criar migration para tabela `draw_deletion_audit_log`
2. Adicionar RLS policies apropriadas
3. Modificar `handleDeleteDraw` para gravar log antes de deletar
4. Testar fluxo completo
5. (Opcional futuro) Criar página de auditoria para organizadores

## 4. Plano de Implementação Detalhado

### Passo 1: Criar Migration SQL ✅

**Arquivo**: `supabase/migrations/YYYYMMDDHHMMSS_add_draw_deletion_audit.sql`

```sql
/*
  # Add Draw Deletion Audit Log

  ## Purpose
  Track all draw deletions for audit purposes. Stores complete snapshot
  of deleted draws, pairs, and matches for future reference.

  ## New Table
  - draw_deletion_audit_log: Audit trail for deleted draws
*/

CREATE TABLE draw_deletion_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Draw identification
  draw_id uuid NOT NULL,
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  event_date date NOT NULL,

  -- Deletion metadata
  deleted_by uuid NOT NULL REFERENCES players(id) ON DELETE SET NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),

  -- Snapshot of deleted data
  draw_data jsonb NOT NULL,
  pairs_data jsonb NOT NULL,
  matches_data jsonb,

  -- Summary statistics
  total_pairs integer NOT NULL DEFAULT 0,
  total_matches integer NOT NULL DEFAULT 0,

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX idx_draw_deletion_audit_league
  ON draw_deletion_audit_log(league_id);

CREATE INDEX idx_draw_deletion_audit_deleted_by
  ON draw_deletion_audit_log(deleted_by);

CREATE INDEX idx_draw_deletion_audit_event_date
  ON draw_deletion_audit_log(event_date);

CREATE INDEX idx_draw_deletion_audit_deleted_at
  ON draw_deletion_audit_log(deleted_at DESC);

-- Enable RLS
ALTER TABLE draw_deletion_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Organizers can view audit logs for their leagues
CREATE POLICY "Organizers can view deletion logs"
  ON draw_deletion_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM league_organizers
      WHERE league_organizers.league_id = draw_deletion_audit_log.league_id
      AND league_organizers.player_id = auth.uid()
    )
  );

-- Policy: Only system can insert (via application code)
CREATE POLICY "System can insert deletion logs"
  ON draw_deletion_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (deleted_by = auth.uid());

-- Add helpful comments
COMMENT ON TABLE draw_deletion_audit_log IS
  'Audit trail for deleted draws. Stores complete snapshot for accountability and potential recovery.';

COMMENT ON COLUMN draw_deletion_audit_log.draw_data IS
  'Complete snapshot of the draw record at deletion time';

COMMENT ON COLUMN draw_deletion_audit_log.pairs_data IS
  'Array of all pairs that were part of this draw';

COMMENT ON COLUMN draw_deletion_audit_log.matches_data IS
  'Array of all matches that were generated for this draw';
```

### Passo 2: Atualizar TypeScript Interfaces ✅

**Localização**: `src/pages/LeaguesPage.tsx` (após as interfaces existentes)

```typescript
interface DrawDeletionAuditLog {
  id: string;
  draw_id: string;
  league_id: string;
  event_date: string;
  deleted_by: string;
  deleted_at: string;
  draw_data: WeeklyEventDraw;
  pairs_data: WeeklyEventPair[];
  matches_data: WeeklyEventMatch[] | null;
  total_pairs: number;
  total_matches: number;
  created_at: string;
}
```

### Passo 3: Modificar handleDeleteDraw ✅

**Localização**: `src/pages/LeaguesPage.tsx:1759`

**Código novo** (substituir função completa):

```typescript
const handleDeleteDraw = async () => {
  if (!selectedLeague || !currentDraw || !profile) return;

  if (!confirm('Tem certeza que deseja apagar o sorteio atual?')) return;

  setDeletingDraw(true);

  try {
    // 1. Fetch all related data before deletion
    console.log(`📋 Fetching data for draw ${currentDraw.id}...`);

    const { data: pairs, error: pairsError } = await supabase
      .from('weekly_event_pairs')
      .select('*')
      .eq('draw_id', currentDraw.id)
      .order('pair_number');

    if (pairsError) throw pairsError;

    const { data: matches, error: matchesError } = await supabase
      .from('weekly_event_matches')
      .select('*')
      .eq('draw_id', currentDraw.id)
      .order('match_number');

    if (matchesError) throw matchesError;

    console.log(`📊 Found ${pairs?.length || 0} pairs and ${matches?.length || 0} matches`);

    // 2. Create audit log entry
    console.log(`💾 Creating audit log entry...`);

    const { error: auditError } = await supabase
      .from('draw_deletion_audit_log')
      .insert({
        draw_id: currentDraw.id,
        league_id: selectedLeague.id,
        event_date: currentDraw.event_date,
        deleted_by: profile.id,
        draw_data: currentDraw,
        pairs_data: pairs || [],
        matches_data: matches || [],
        total_pairs: pairs?.length || 0,
        total_matches: matches?.length || 0,
      });

    if (auditError) throw auditError;

    console.log(`✅ Audit log created successfully`);

    // 3. Delete the draw (CASCADE will handle pairs and matches)
    console.log(`🗑️ Deleting draw...`);

    const { error: deleteError } = await supabase
      .from('weekly_event_draws')
      .delete()
      .eq('id', currentDraw.id);

    if (deleteError) throw deleteError;

    console.log(`✅ Draw deleted successfully`);

    // 4. Update UI state
    setCurrentDraw(null);
    setCurrentPairs([]);

    if (organizerLeagues.includes(selectedLeague.id)) {
      await loadNextEventAttendances(selectedLeague.id);
    }

    alert('Sorteio apagado com sucesso! O histórico foi registrado para auditoria.');

  } catch (error) {
    console.error('Error deleting draw:', error);
    alert('Erro ao apagar sorteio. Tente novamente.');
  } finally {
    setDeletingDraw(false);
  }
};
```

### Passo 4: Adicionar Estado de Loading ✅

**Localização**: `src/pages/LeaguesPage.tsx` (junto com outros estados)

```typescript
const [deletingDraw, setDeletingDraw] = useState(false);
```

### Passo 5: Atualizar UI do Botão de Deletar ✅

**Localização**: `src/pages/LeaguesPage.tsx:3405` (aproximadamente)

```typescript
<button
  onClick={handleDeleteDraw}
  disabled={deletingDraw}
  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
>
  {deletingDraw ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      Apagando...
    </>
  ) : (
    <>
      <Trash2 className="w-4 h-4" />
      Apagar Sorteio
    </>
  )}
</button>
```

### Passo 6: Testar ✅

**Cenários de teste**:

1. **Teste básico**: Criar e deletar sorteio
   - Verificar se registro aparece em `draw_deletion_audit_log`
   - Verificar se `deleted_by` está correto
   - Verificar se dados foram salvos corretamente

2. **Teste de snapshot**: Verificar dados salvos
   - Confirmar que `draw_data` tem todos os campos
   - Confirmar que `pairs_data` tem todas as duplas
   - Confirmar que `matches_data` tem todos os confrontos

3. **Teste de CASCADE**: Verificar limpeza automática
   - Confirmar que pairs foram deletadas
   - Confirmar que matches foram deletados
   - Confirmar que não há dados órfãos

4. **Teste de permissão**: Tentar acessar log
   - Organizador deve conseguir ver logs
   - Membro comum não deve ver
   - Admin deve conseguir ver

## 5. Melhorias Futuras (Opcional)

### 5.1 Dashboard de Auditoria

Criar página para organizadores visualizarem histórico de exclusões:

- Lista de sorteios deletados
- Quem deletou e quando
- Botão para visualizar snapshot dos dados
- Possível botão "restaurar" (complexo)

### 5.2 Notificações

Enviar notificação para outros organizadores quando sorteio é deletado.

### 5.3 Restauração de Sorteios

Função para "undelete" usando os dados do snapshot:
- Recriar draw
- Recriar pairs
- Recriar matches
- Marcar no audit log como "restaurado"

### 5.4 Retenção de Dados

Adicionar política de limpeza automática:
- Deletar audit logs após X meses
- Ou arquivar em cold storage

## 6. Impacto e Riscos

### Impacto
- ✅ **Zero impacto** em funcionalidades existentes
- ✅ **Zero impacto** em performance (apenas uma query extra ao deletar)
- ✅ **Mínimo impacto** em storage (JSONB compacto)

### Riscos
- ⚠️ **Baixo**: Se esquecer de atualizar handleDeleteDraw, não grava log
  - **Mitigação**: Adicionar teste automatizado
- ⚠️ **Baixo**: Storage pode crescer com muitas exclusões
  - **Mitigação**: Implementar política de retenção futura

### Considerações de Segurança
- ✅ RLS policies impedem acesso não autorizado
- ✅ Apenas organizadores podem ver logs
- ✅ Não expõe dados sensíveis além do necessário

## 7. Estimativa

**Tempo de implementação**: 1-2 horas

- Migration SQL: 20 min
- Interface TypeScript: 5 min
- Modificar handleDeleteDraw: 15 min
- Atualizar UI: 10 min
- Testes: 30 min
- Documentação: 10 min

**Complexidade**: ⭐⭐ (Baixa)
