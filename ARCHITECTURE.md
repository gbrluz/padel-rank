# Arquitetura do Sistema - API Layer

## Visão Geral

O sistema foi reestruturado para desacoplar o frontend do Supabase através de uma camada de API intermediária. Isso proporciona maior flexibilidade, facilita testes e permite mudanças futuras no backend sem impactar o frontend.

## Arquitetura Atual

```
React UI  →  API Client (src/lib/api.ts)  →  Edge Functions  →  Supabase Database
```

### Componentes

#### 1. Frontend (React UI)
- **Localização**: `src/pages/`, `src/components/`
- **Função**: Interface do usuário
- **Comunicação**: Usa o API Client para todas as operações de dados

#### 2. API Client
- **Localização**: `src/lib/api.ts`
- **Função**: Camada de abstração que encapsula todas as chamadas às Edge Functions
- **Benefícios**:
  - Ponto único de comunicação com o backend
  - Tipagem TypeScript para todas as operações
  - Facilita testes e mocks
  - Permite mudanças no backend sem afetar o frontend

#### 3. Edge Functions (API Backend)
- **Localização**: `supabase/functions/`
- **Função**: Lógica de negócio e acesso ao banco de dados
- **Segurança**: Autenticação via JWT, validações e RLS

#### 4. Supabase Database
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

## Como Usar a API no Frontend

### Exemplo Básico

```typescript
import { api } from '../lib/api';

// Buscar perfil do usuário atual
const { profile } = await api.profiles.get();

// Buscar perfil específico
const { profile } = await api.profiles.get('user-id');

// Atualizar perfil
await api.profiles.update('user-id', { full_name: 'Novo Nome' });

// Listar partidas
const { matches } = await api.matches.list();

// Listar partidas filtradas
const { matches } = await api.matches.list({ status: 'scheduled' });

// Entrar na fila
await api.queue.join({ gender: 'male', preferredSide: 'left' });
```

### Tratamento de Erros

```typescript
try {
  const { profile } = await api.profiles.get();
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

## Benefícios da Nova Arquitetura

1. **Desacoplamento**: Frontend independente do provedor de dados
2. **Segurança**: Lógica de negócio protegida no servidor
3. **Flexibilidade**: Fácil trocar ou adicionar backends
4. **Testabilidade**: API Client pode ser facilmente mockado
5. **Manutenção**: Mudanças no backend não afetam o frontend
6. **Offline First**: Possibilita implementação de cache e sincronização
7. **Mobile**: Facilita criação de apps mobile com a mesma API

## Próximos Passos

Para completar a migração, as páginas do frontend precisam ser atualizadas para usar o API Client ao invés de chamar o Supabase diretamente. O AuthContext já foi atualizado como exemplo.

### Padrão de Migração

**Antes:**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

**Depois:**
```typescript
const { profile } = await api.profiles.get(userId);
```

## Notas Técnicas

- Todas as Edge Functions usam CORS headers apropriados
- Autenticação via Bearer token do Supabase Auth
- Service Role Key usado nas Edge Functions para operações privilegiadas
- RLS policies continuam ativas no banco de dados para segurança adicional
