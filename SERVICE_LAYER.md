# Camada de Serviços

## Overview

Toda a lógica de acesso a dados está centralizada em **services**. O frontend nunca deve chamar Supabase ou API diretamente.

Os services trabalham com **entidades de domínio** (Player, Match, League) e não com tipos do banco (profiles, tabelas).

## Estrutura

```
src/
├── types/
│   ├── domain.ts         # Entidades do CLIMB
│   ├── mappers.ts        # Conversão DB ↔ Domínio
│   └── index.ts          # Exports
├── services/
│   ├── index.ts          # Exporta todos os services
│   ├── profileService.ts # Gerenciamento de jogadores
│   ├── matchService.ts   # Operações de partidas
│   ├── leagueService.ts  # Gestão de ligas
│   ├── rankingService.ts # Rankings e histórico
│   ├── queueService.ts   # Sistema de fila
│   └── adminService.ts   # Operações administrativas
```

## Entidades de Domínio

### Player
Representa um jogador no CLIMB. Nunca use "Profile", "User" ou "tabela_users".

```typescript
interface Player {
  id: string;
  fullName: string;              // não "full_name"
  gender: Gender;
  state: string;
  city: string;
  category: Category;
  rankingPoints: number;         // não "ranking_points"
  preferredSide: PreferredSide | null;
  availability: Record<string, string[]>;
  totalMatches: number;
  totalWins: number;
  winRate: number;
  isProvisional: boolean;        // não "total_matches < 5"
  isAdmin: boolean;
  avatarUrl: string | null;
  createdAt: string;
}
```

### Match
Partida entre 4 jogadores. Sempre "Match", nunca "partida_data" ou "game_table".

```typescript
interface Match {
  id: string;
  leagueId: string | null;

  teamAPlayer1Id: string;        // não "team_a_player1_id"
  teamAPlayer2Id: string;
  teamBPlayer1Id: string;
  teamBPlayer2Id: string;

  status: MatchStatus;
  scheduledDate: string | null;
  location: string | null;

  teamAScore: number | null;
  teamBScore: number | null;
  winnerTeam: Team | null;
  sets: MatchSet[];

  createdAt: string;
  completedAt: string | null;
}
```

### League
Liga ou torneio. Sempre "League", não "liga_table".

```typescript
interface League {
  id: string;
  name: string;
  description: string | null;
  gender: Gender;
  category: Category | null;
  status: LeagueStatus;
  startDate: string;              // não "start_date"
  endDate: string | null;
  maxParticipants: number | null;
  minMatches: number;
  createdBy: string;
  createdAt: string;
}
```

### Queue
Entrada na fila de matchmaking.

```typescript
interface QueueEntry {
  id: string;
  playerId: string;              // não "player_id"
  partnerId: string | null;
  gender: Gender;
  preferredSide: PreferredSide | null;
  status: QueueStatus;
  createdAt: string;
}
```

## Tipos Auxiliares

```typescript
type Gender = 'male' | 'female';
type PreferredSide = 'left' | 'right' | 'both';
type Category = 'Iniciante' | '7ª' | '6ª' | '5ª' | '4ª' | '3ª' | '2ª' | '1ª';
type MatchStatus = 'pending_approval' | 'scheduled' | 'cancelled' | 'completed';
type Team = 'team_a' | 'team_b';
```

## Como Usar

### Importação

```typescript
// Importar services
import { profileService, matchService, Player } from '@/services';

// Todos os tipos de domínio estão disponíveis
import { Match, League, QueueEntry } from '@/services';
```

### Exemplos Rápidos

#### Players (não "Profiles")
```typescript
// Buscar jogador atual
const player: Player = await profileService.getCurrentPlayer();

// Verificar regras de negócio
const canJoin = profileService.canJoinLeagues(player);
const isProvisional = profileService.isProvisional(player);
const winRate = profileService.getWinRate(player);

// Atualizar jogador
await profileService.updatePlayer(id, {
  fullName: 'João Silva',
  preferredSide: 'left'
});
```

#### Matches
```typescript
// Listar partidas
const matches: Match[] = await matchService.listMatches();
const pending = await matchService.getPendingApprovalMatches();

// Verificar partida
const isInMatch = matchService.isPlayerInMatch(match, playerId);
const team = matchService.getPlayerTeam(match, playerId);

// Agendar e completar
await matchService.scheduleMatch(id, {
  scheduled_date: '2024-12-25',
  scheduled_time: '19:00',
  location: 'Quadra 1'
});

await matchService.completeMatch(id, {
  team_a_score: 2,
  team_b_score: 1,
  winner_team: 'team_a',
  sets: [...]
});
```

#### Leagues
```typescript
const leagues: League[] = await leagueService.getOpenLeagues();
await leagueService.joinLeague(leagueId);
const ranking = await leagueService.getLeagueRanking(leagueId);

// Verificar se pode entrar
const canJoin = leagueService.canJoin(league, participants);
```

#### Rankings
```typescript
const players: Player[] = await rankingService.getRegionalRanking({
  state: 'SP',
  city: 'São Paulo'
});

const position = rankingService.findPlayerPosition(players, playerId);
const top10 = rankingService.getTopPlayers(players, 10);
```

#### Queue
```typescript
await queueService.joinSolo('male', 'left');
const entry: QueueEntry | null = await queueService.getQueueStatus();
const isInQueue = await queueService.isInQueue();
await queueService.leaveQueue();
```

#### Admin
```typescript
const players = await adminService.getAllPlayers();
const stats: SystemStats = await adminService.getSystemStats();
await adminService.makeAdmin(playerId);
await adminService.updatePlayerPoints(playerId, 1500);
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

## Por que Entidades de Domínio?

### Problema: Lógica Vazando do Banco

```typescript
// ❌ Má prática: Nomes de banco no frontend
const user = profile;  // "profile" é tabela do banco
if (user.total_matches < 5) { ... }  // snake_case do banco
```

### Solução: Vocabulário do Produto

```typescript
// ✅ Boa prática: Entidades de domínio
const player: Player = await profileService.getCurrentPlayer();
if (player.isProvisional) { ... }  // camelCase, lógica encapsulada
```

### Benefícios

1. **Vocabulário Consistente**: "Player", não "Profile", "User", "tabela_users"
2. **Desacoplamento**: Trocar banco não afeta o frontend
3. **Lógica Encapsulada**: `isProvisional` ao invés de `total_matches < 5`
4. **TypeScript Forte**: Tipos do produto, não do banco
5. **Manutenibilidade**: Mudanças isoladas na camada de mappers

## Regras

### ❌ NUNCA faça isso

```typescript
// ❌ Acesso direto ao Supabase
const { data } = await supabase.from('profiles').select();

// ❌ Acesso direto à API
const { profile } = await api.profiles.get();

// ❌ Usar tipos do banco
interface Profile { total_matches: number; }  // snake_case

// ❌ Lógica de negócio no componente
if (profile.total_matches >= 5 && !profile.is_provisional) {
  // pode entrar em ligas
}

// ❌ Nomes de tabela
const users = await getUsers();  // "users" é tabela
const match_data = await getMatch();  // snake_case
```

### ✅ SEMPRE faça isso

```typescript
// ✅ Use os services
const player: Player = await profileService.getCurrentPlayer();

// ✅ Use tipos de domínio
interface Player { totalMatches: number; }  // camelCase

// ✅ Use métodos de negócio
const canJoin = profileService.canJoinLeagues(player);

// ✅ Use validações
const error = matchService.validateMatchResult(data);
if (error) {
  alert(error);
  return;
}

// ✅ Nomes de produto
const players = await profileService.getCurrentPlayer();
const match: Match = await matchService.getMatch(id);
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
      ↓ usa entidades de domínio
   Services (lógica de negócio + tipos de domínio)
      ↓ converte via mappers
   API Client (HTTP + tipos do banco)
      ↓
   Edge Functions
      ↓
   Supabase Database (snake_case, tabelas)
```

### Fluxo de Dados

**Frontend → Backend**
```
Player (camelCase) → Mapper → Profile (snake_case) → API → DB
```

**Backend → Frontend**
```
DB → Profile (snake_case) → API → Mapper → Player (camelCase)
```

### Responsabilidades

- **Components**: Renderiza UI, usa entidades de domínio
- **Services**: Lógica de negócio, validações, cálculos
- **Mappers**: Traduz entre domínio e banco
- **API Client**: Comunicação HTTP
- **Edge Functions**: Backend API
- **Database**: Persistência

Cada camada só conhece a camada imediatamente abaixo. Nenhuma camada conhece detalhes de implementação das outras.
