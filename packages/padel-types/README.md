# @padel/types

Shared TypeScript types for Padel Management System.

## Installation

```bash
npm install @padel/types
```

## Usage

```typescript
import { Player, Match, League, APIResponse } from '@padel/types';

// Use types in your code
const player: Player = {
  id: '123',
  full_name: 'João Silva',
  // ...
};
```

## Types

### Domain Types
- `Player` - Player profile data
- `Match` - Match information
- `League` - League details
- `LeagueParticipant` - League membership
- `LeagueRanking` - League ranking entry
- `RegionalRanking` - Regional ranking entry
- `GlobalRanking` - Global ranking entry
- `RankingHistory` - Historical ranking data
- `QueueEntry` - Matchmaking queue entry
- `SystemStats` - System statistics

### API Types
All request and response types for the REST API, including:
- `PlayerResponse`, `PlayersResponse`
- `MatchResponse`, `MatchesResponse`
- `LeagueResponse`, `LeaguesResponse`
- `CreateLeagueRequest`, `UpdateLeagueRequest`
- And many more...

## Development

Build the package:
```bash
npm run build
```

Watch for changes:
```bash
npm run watch
```

## Versioning

This package follows semantic versioning:
- MAJOR: Breaking changes
- MINOR: New features (backwards compatible)
- PATCH: Bug fixes
