# Padel Frontend

Frontend application for Padel Management System built with React, TypeScript, and Vite.

## Features

- Modern React with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Service layer architecture
- JWT authentication via Supabase Auth
- Responsive design

## Setup

### Prerequisites

- Node.js 20+
- Running backend API

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Architecture

The frontend is structured in layers:

- **Pages** (`src/pages/`) - React page components
- **Components** (`src/components/`) - Reusable React components
- **Services** (`src/services/`) - Business logic layer
- **API Client** (`src/lib/api.ts`) - HTTP communication with backend
- **Auth** (`src/lib/supabase.ts`) - Supabase authentication only
- **Contexts** (`src/contexts/`) - React contexts for state management

## Authentication

Authentication is handled via Supabase Auth:

```typescript
import { supabase } from '@/lib/supabase';

// Login
await supabase.auth.signInWithPassword({ email, password });

// Sign up
await supabase.auth.signUp({ email, password });

// Logout
await supabase.auth.signOut();
```

The JWT token is automatically included in all API requests.

## Deployment

### Vercel

```bash
vercel --prod
```

Environment variables must be configured in Vercel dashboard:
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Project Structure

```
src/
├── pages/          # Page components
├── components/     # Reusable components
├── services/       # Business logic
├── lib/            # Utilities
│   ├── api.ts      # API client
│   └── supabase.ts # Auth only
├── contexts/       # React contexts
├── types/          # TypeScript types
└── App.tsx         # Main app component
```
