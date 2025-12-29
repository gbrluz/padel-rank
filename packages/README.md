# Padel Management System - Multi-Repository Architecture

This directory contains 3 separate packages that will become independent repositories:

## 📦 Packages

### 1. climb-types (padel-types)
**Shared TypeScript types package**

Contains all domain types and API contract types shared between frontend and backend.

- Location: `packages/padel-types/`
- Package Name: `climb-types`
- Deploy: NPM or GitHub Packages
- Purpose: Ensure type safety across all repositories

[View README](./padel-types/README.md)

### 2. padel-api
**Backend API (Express + TypeScript)**

RESTful API that handles all business logic and database operations.

- Location: `packages/padel-api/`
- Deploy: Railway
- Stack: Express, TypeScript, Supabase Client
- Database: Supabase PostgreSQL

[View README](./padel-api/README.md)

### 3. padel-frontend
**Frontend Application (React + Vite)**

Web application for players and administrators.

- Location: `packages/padel-frontend/`
- Deploy: Vercel
- Stack: React, TypeScript, Vite, Tailwind CSS
- Auth: Supabase Auth

[View README](./padel-frontend/README.md)

## 🏗️ Architecture

```
┌─────────────────┐
│  Vercel         │
│  padel-frontend │
│  (React + Vite) │
└────────┬────────┘
         │ JWT Token
         ↓
┌─────────────────┐
│  Railway        │
│  padel-api      │
│  (Express API)  │
└────────┬────────┘
         │ Service Key
         ↓
┌─────────────────┐
│  Supabase       │
│  PostgreSQL     │
│  (Database)     │
└─────────────────┘
```

## 🚀 Quick Start

### Development (All Packages Locally)

1. **Start Types Package**
```bash
cd packages/padel-types
npm install
npm run build
npm link  # For local development
```

2. **Start Backend API**
```bash
cd packages/padel-api
npm install  # climb-types is linked via file:../padel-types
cp .env.example .env
# Configure .env with your Supabase credentials
npm run dev  # Runs on http://localhost:3000
```

3. **Start Frontend**
```bash
cd packages/padel-frontend
npm install  # climb-types is linked via file:../padel-types
cp .env.example .env.local
# Configure .env.local with API URL and Supabase
npm run dev  # Runs on http://localhost:5173
```

## 📝 Environment Variables

### Backend API (.env)
```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 🔄 Workflow for Updates

### Adding New Types
1. Update `packages/padel-types/src/`
2. Build: `npm run build`
3. Publish: `npm version patch && npm publish`
4. Update version in backend and frontend
5. Run `npm install` in both

### Adding New API Endpoint
1. Update types if needed
2. Add controller in `packages/padel-api/src/controllers/`
3. Add route in `packages/padel-api/src/routes/`
4. Update `packages/padel-api/src/server.ts` if needed
5. Test locally
6. Deploy to Railway

### Adding New Frontend Feature
1. Update types if needed
2. Add page/component in `packages/padel-frontend/src/`
3. Use service layer for API calls
4. Test locally
5. Deploy to Vercel

## 📚 Documentation

- [Migration Guide](../MIGRATION_GUIDE.md) - How to separate into 3 repositories
- [Architecture](../ARCHITECTURE.md) - Current architecture (to be updated)
- [Service Layer](../SERVICE_LAYER.md) - Frontend service layer guide

## 🧪 Testing

### Backend
```bash
cd packages/padel-api
npm run typecheck
npm run build
```

### Frontend
```bash
cd packages/padel-frontend
npm run typecheck
npm run build
```

## 🚢 Deployment

### Deploy Backend to Railway
```bash
cd packages/padel-api
railway init
railway up
```

### Deploy Frontend to Vercel
```bash
cd packages/padel-frontend
vercel --prod
```

### Publish Types to NPM
```bash
cd packages/padel-types
npm version patch
npm publish  # Publishes as climb-types
```

## 🔒 Security

- Frontend never accesses database directly
- All API requests require JWT authentication
- Backend uses Supabase Service Role Key
- RLS policies enforced at database level
- CORS configured for specific origins
- Environment variables never committed

## 📦 Dependencies

### Shared Between Packages
- TypeScript 5.5+
- climb-types (custom package)

### Backend Only
- Express
- @supabase/supabase-js
- CORS, Helmet
- Zod (validation)

### Frontend Only
- React 18
- Vite
- Tailwind CSS
- Lucide React (icons)

## 🤝 Contributing

When contributing to this multi-repo setup:

1. Always update types first if data structures change
2. Keep API contract stable and backwards compatible
3. Version types package semantically
4. Document breaking changes
5. Test all 3 packages together before deploying

## 📄 License

MIT
