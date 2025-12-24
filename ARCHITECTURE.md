# Arquitetura do Sistema - Service Layer

## Visão Geral

O sistema possui uma arquitetura em camadas que desacopla completamente o frontend do backend, facilitando manutenção, testes e futuras mudanças de infraestrutura.

## Arquitetura Atual

```
React UI  →  Services (src/services/)  →  API Client (src/lib/api.ts)  →  Edge Functions  →  Supabase Database
```

### Componentes

#### 1. Frontend (React UI)
- **Localização**: `src/pages/`, `src/components/`
- **Função**: Interface do usuário
- **Comunicação**: Usa os Services para todas as operações

#### 2. Services (Camada de Negócio)
- **Localização**: `src/services/`
- **Função**: Encapsula toda a lógica de negócio e regras da aplicação
- **Serviços disponíveis**:
  - `profileService` - Gerenciamento de perfis de usuário
  - `matchService` - Operações relacionadas a partidas
  - `leagueService` - Gestão de ligas e torneios
  - `rankingService` - Rankings e histórico de pontuação
  - `queueService` - Sistema de fila para matchmaking
  - `adminService` - Operações administrativas
- **Benefícios**:
  - Lógica de negócio centralizada e reutilizável
  - Validações e transformações de dados
  - Cálculos e regras de negócio isolados
  - Fácil de testar unitariamente
  - Não expõe detalhes de implementação do backend

#### 3. API Client
- **Localização**: `src/lib/api.ts`
- **Função**: Camada de comunicação HTTP com as Edge Functions
- **Benefícios**:
  - Ponto único de comunicação com o backend
  - Gerenciamento automático de autenticação
  - Tratamento centralizado de erros
  - Tipagem TypeScript para todas as requisições

#### 4. Edge Functions (API Backend)
- **Localização**: `supabase/functions/`
- **Função**: API REST que acessa o banco de dados
- **Segurança**: Autenticação via JWT, validações e RLS

#### 5. Supabase Database
- **Função**: Persistência de dados
- **Acesso**: Apenas através das Edge Functions (exceto Auth)

## Edge Functions Disponíveis

### `/profiles`
- **GET** `/profiles/:id` - Buscar perfil por ID
- **PUT** `/profiles/:id` - Atualizar perfil

### `/matches`
- **GET** `/matches` - Listar partidas do usuário
- **PUT** `/matches/:id/schedule` - Agendar partida
- **PUT** `/matches/:id/availability` - Atualizar disponibilidade

### `/complete-match`
- **POST** `/complete-match` - Completar uma partida

### `/match-approval`
- **POST** `/match-approval` - Aprovar/rejeitar partida

### `/find-match`
- **POST** `/find-match` - Buscar partida automática

### `/leagues`
- **GET** `/leagues` - Listar ligas
- **GET** `/leagues/:id` - Detalhes da liga
- **GET** `/leagues/:id/participants` - Participantes da liga
- **GET** `/leagues/:id/ranking` - Ranking da liga
- **POST** `/leagues` - Criar liga (admin)
- **PUT** `/leagues/:id` - Atualizar liga (admin)
- **POST** `/leagues/:id/join` - Entrar na liga
- **DELETE** `/leagues/:id/leave` - Sair da liga

### `/rankings`
- **GET** `/rankings/regional` - Ranking regional
- **GET** `/rankings/global` - Ranking global
- **GET** `/rankings/history/:playerId` - Histórico de ranking

### `/queue`
- **GET** `/queue` - Status na fila
- **POST** `/queue` - Entrar na fila
- **DELETE** `/queue` - Sair da fila

### `/admin`
- **GET** `/admin/profiles` - Listar todos os perfis
- **GET** `/admin/stats` - Estatísticas do sistema
- **PUT** `/admin/profiles/:id` - Atualizar qualquer perfil

## Como Usar os Services no Frontend

### Importação

```typescript
// Importar um serviço específico
import { profileService } from '@/services';

// Ou importar múltiplos serviços
import { profileService, matchService, leagueService } from '@/services';
```

### Exemplo: profileService

```typescript
import { profileService } from '@/services';

// Buscar perfil atual
const profile = await profileService.getCurrentProfile();

// Buscar perfil por ID
const player = await profileService.getProfileById('user-id');

// Atualizar perfil
await profileService.updateProfile('user-id', {
  full_name: 'Novo Nome',
  preferred_side: 'left'
});

// Atualizar disponibilidade
await profileService.updateAvailability('user-id', {
  'monday': ['18:00', '19:00', '20:00'],
  'wednesday': ['19:00', '20:00']
});

// Verificar se pode entrar em ligas
const canJoin = profileService.canJoinLeagues(profile);

// Calcular taxa de vitória
const winRate = profileService.getWinRate(profile);

// Obter categoria dos pontos
const category = profileService.getCategoryFromPoints(1250);
```

### Exemplo: matchService

```typescript
import { matchService } from '@/services';

// Listar todas as partidas do usuário
const matches = await matchService.listMatches();

// Listar partidas pendentes de aprovação
const pending = await matchService.getPendingApprovalMatches();

// Listar partidas agendadas
const scheduled = await matchService.getScheduledMatches();

// Agendar partida
await matchService.scheduleMatch('match-id', {
  scheduled_date: '2024-12-25',
  scheduled_time: '19:00',
  location: 'Quadra 1'
});

// Completar partida
await matchService.completeMatch('match-id', {
  team_a_score: 2,
  team_b_score: 1,
  winner_team: 'team_a',
  sets: [
    { set_number: 1, team_a_score: 6, team_b_score: 4 },
    { set_number: 2, team_a_score: 4, team_b_score: 6 },
    { set_number: 3, team_a_score: 6, team_b_score: 2 }
  ]
});

// Verificar se jogador está na partida
const isInMatch = matchService.isPlayerInMatch(match, playerId);

// Obter time do jogador
const team = matchService.getPlayerTeam(match, playerId);

// Validar resultado
const error = matchService.validateMatchResult(matchData);
if (error) {
  console.error(error);
}
```

### Exemplo: leagueService

```typescript
import { leagueService } from '@/services';

// Listar ligas abertas
const openLeagues = await leagueService.getOpenLeagues();

// Criar liga (admin)
const league = await leagueService.createLeague({
  name: 'Liga de Verão 2024',
  description: 'Liga masculina categoria 3ª',
  gender: 'male',
  category: '3ª',
  start_date: '2024-01-10',
  max_participants: 32,
  min_matches: 10
});

// Entrar na liga
await leagueService.joinLeague('league-id');

// Verificar se pode entrar
const canJoin = leagueService.canJoin(league, participants);

// Validar dados da liga
const error = leagueService.validateLeagueData(leagueData);
```

### Exemplo: queueService

```typescript
import { queueService } from '@/services';

// Entrar na fila solo
await queueService.joinSolo('male', 'left');

// Entrar na fila com parceiro
await queueService.joinWithPartner('partner-id', 'male');

// Verificar status
const queueEntry = await queueService.getQueueStatus();
const isInQueue = await queueService.isInQueue();

// Sair da fila
await queueService.leaveQueue();

// Obter tempo estimado
const waitTime = queueService.getEstimatedWaitTime(queueEntry);

// Formatar tempo na fila
const time = queueService.formatQueueTime(queueEntry.created_at);
```

### Exemplo: rankingService

```typescript
import { rankingService } from '@/services';

// Ranking regional
const regional = await rankingService.getRegionalRanking({
  state: 'SP',
  city: 'São Paulo',
  gender: 'male'
});

// Ranking global
const global = await rankingService.getGlobalRanking('male');

// Histórico do jogador
const history = await rankingService.getPlayerHistory('player-id');

// Encontrar posição
const position = rankingService.findPlayerPosition(regional, playerId);

// Top 10
const top10 = rankingService.getTopPlayers(regional, 10);

// Mudança de pontos
const change = rankingService.calculatePointsChange(history);

// Formatação
const positionText = rankingService.formatRankingPosition(3); // "3º"
const changeText = rankingService.formatPointsChange(50); // "+50"
```

### Exemplo: adminService

```typescript
import { adminService } from '@/services';

// Buscar todos os perfis
const profiles = await adminService.getAllProfiles();

// Buscar com filtro
const results = await adminService.searchProfiles('joão');

// Estatísticas do sistema
const stats = await adminService.getSystemStats();

// Tornar admin
await adminService.makeAdmin('user-id');

// Atualizar pontos
await adminService.updatePlayerPoints('user-id', 1500);

// Validar atualização
const error = adminService.validateProfileUpdate(updates);
```

### Tratamento de Erros

```typescript
try {
  const profile = await profileService.getCurrentProfile();
  // usar profile
} catch (error) {
  console.error('Erro ao buscar perfil:', error.message);
  // tratar erro
}
```

## Autenticação

A autenticação continua usando o Supabase Auth diretamente:

```typescript
import { supabase } from '../lib/supabase';

// Login
await supabase.auth.signInWithPassword({ email, password });

// Cadastro
await supabase.auth.signUp({ email, password });

// Logout
await supabase.auth.signOut();
```

O token de autenticação é automaticamente incluído em todas as requisições pela API Client.

## Benefícios da Arquitetura em Camadas

1. **Desacoplamento Total**: Frontend não conhece detalhes do backend
2. **Lógica de Negócio Centralizada**: Regras em um único lugar, fácil de manter
3. **Reutilização**: Mesma lógica disponível em toda a aplicação
4. **Testabilidade**: Services podem ser testados sem depender do backend
5. **Validações Consistentes**: Regras aplicadas uniformemente
6. **Cálculos Encapsulados**: Fórmulas complexas isoladas e documentadas
7. **Manutenibilidade**: Mudanças localizadas, sem efeito cascata
8. **Flexibilidade**: Fácil trocar backends ou adicionar novos
9. **Mobile-Ready**: Mesma estrutura para web e mobile
10. **Offline-First**: Possibilita cache e sincronização local

## Padrões de Uso

### ❌ Evite: Acesso direto ao Supabase

```typescript
// Não faça isso no frontend
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

### ❌ Evite: Acesso direto à API

```typescript
// Não faça isso - use services ao invés
const { profile } = await api.profiles.get(userId);
```

### ✅ Correto: Use os Services

```typescript
// Faça isso - use a camada de serviços
const profile = await profileService.getProfileById(userId);

// Com lógica de negócio inclusa
const canJoin = profileService.canJoinLeagues(profile);
const winRate = profileService.getWinRate(profile);
```

## Vantagens dos Services vs API Direta

### Services incluem:
- ✅ Validações de dados
- ✅ Cálculos e regras de negócio
- ✅ Transformações de dados
- ✅ Métodos auxiliares
- ✅ Formatação consistente
- ✅ Lógica reutilizável

### API Client apenas:
- ❌ Chamadas HTTP básicas
- ❌ Sem validações
- ❌ Sem lógica de negócio
- ❌ Dados brutos

## Exemplo Completo: Fluxo de Aprovação de Partida

```typescript
import { matchService, profileService } from '@/services';

async function handleMatchApproval(matchId: string, playerId: string) {
  // 1. Buscar partida
  const matches = await matchService.listMatches();
  const match = matches.find(m => m.id === matchId);

  if (!match) {
    throw new Error('Partida não encontrada');
  }

  // 2. Verificar se jogador está na partida
  if (!matchService.isPlayerInMatch(match, playerId)) {
    throw new Error('Você não participa desta partida');
  }

  // 3. Buscar perfil do jogador
  const profile = await profileService.getProfileById(playerId);

  // 4. Aprovar partida
  await matchService.approveMatch(matchId);

  console.log(`${profile.full_name} aprovou a partida`);
}
```

## Notas Técnicas

- Todas as Edge Functions usam CORS headers apropriados
- Autenticação via Bearer token do Supabase Auth
- Service Role Key usado nas Edge Functions para operações privilegiadas
- RLS policies continuam ativas no banco de dados para segurança adicional
