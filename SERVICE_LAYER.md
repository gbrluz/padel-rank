# Camada de Serviços

## Overview

Toda a lógica de acesso a dados agora está centralizada em **services**. O frontend nunca mais deve chamar Supabase ou API diretamente.

## Estrutura

```
src/services/
├── index.ts              # Exporta todos os services
├── profileService.ts     # Gerenciamento de perfis
├── matchService.ts       # Operações de partidas
├── leagueService.ts      # Gestão de ligas
├── rankingService.ts     # Rankings e histórico
├── queueService.ts       # Sistema de fila
└── adminService.ts       # Operações administrativas
```

## Como Usar

### Importação

```typescript
import { profileService, matchService } from '@/services';
```

### Exemplos Rápidos

#### Profiles
```typescript
const profile = await profileService.getCurrentProfile();
const canJoin = profileService.canJoinLeagues(profile);
await profileService.updateProfile(id, updates);
```

#### Matches
```typescript
const matches = await matchService.listMatches();
const pending = await matchService.getPendingApprovalMatches();
await matchService.scheduleMatch(id, data);
await matchService.completeMatch(id, result);
```

#### Leagues
```typescript
const leagues = await leagueService.getOpenLeagues();
await leagueService.joinLeague(leagueId);
const ranking = await leagueService.getLeagueRanking(leagueId);
```

#### Rankings
```typescript
const regional = await rankingService.getRegionalRanking({ state: 'SP' });
const global = await rankingService.getGlobalRanking();
const history = await rankingService.getPlayerHistory(playerId);
```

#### Queue
```typescript
await queueService.joinSolo('male', 'left');
const isInQueue = await queueService.isInQueue();
await queueService.leaveQueue();
```

#### Admin
```typescript
const profiles = await adminService.getAllProfiles();
const stats = await adminService.getSystemStats();
await adminService.makeAdmin(userId);
```

## O que os Services Oferecem

### ✅ Métodos de Acesso a Dados
- Buscar, criar, atualizar, deletar
- Filtros e queries específicas
- Listas e detalhes

### ✅ Lógica de Negócio
- Validações (ex: `validateMatchResult`)
- Cálculos (ex: `calculatePointsForMatch`)
- Verificações (ex: `canJoinLeagues`)

### ✅ Métodos Auxiliares
- Formatação (ex: `formatRankingPosition`)
- Transformação (ex: `getCategoryFromPoints`)
- Utilidades (ex: `getPlayerTeam`)

### ✅ Regras de Domínio
- Políticas de negócio
- Constantes e limites
- Estado e condições

## Regras

### ❌ NUNCA faça isso

```typescript
// ❌ Acesso direto ao Supabase
const { data } = await supabase.from('profiles').select();

// ❌ Acesso direto à API
const { profile } = await api.profiles.get();

// ❌ Lógica de negócio no componente
if (profile.total_matches >= 5 && !profile.is_provisional) {
  // pode entrar em ligas
}
```

### ✅ SEMPRE faça isso

```typescript
// ✅ Use os services
const profile = await profileService.getCurrentProfile();

// ✅ Use métodos de negócio
const canJoin = profileService.canJoinLeagues(profile);

// ✅ Use validações
const error = matchService.validateMatchResult(data);
if (error) {
  alert(error);
  return;
}
```

## Benefícios

1. **Ponto único de acesso** - Toda lógica em um lugar
2. **Testável** - Services podem ser testados isoladamente
3. **Reutilizável** - Mesma lógica em toda a aplicação
4. **Manutenível** - Mudanças centralizadas
5. **Tipado** - TypeScript em toda a cadeia
6. **Documentado** - Código auto-explicativo

## Próximos Passos

Migrar as páginas existentes para usar os services ao invés de chamadas diretas ao Supabase.

### Exemplo de Migração

**Antes:**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

if (profile.total_matches >= 5) {
  // lógica
}
```

**Depois:**
```typescript
const profile = await profileService.getProfileById(userId);

if (profileService.canJoinLeagues(profile)) {
  // lógica
}
```

## Arquitetura Completa

```
React Components
      ↓
   Services (lógica de negócio)
      ↓
   API Client (HTTP)
      ↓
   Edge Functions
      ↓
   Supabase Database
```

Cada camada tem responsabilidade clara e não conhece detalhes das camadas inferiores.
