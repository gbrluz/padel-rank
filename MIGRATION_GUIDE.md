# Migration Guide: Separating into 3 Repositories

This guide explains how to migrate the current monorepo structure into 3 separate repositories.

## Overview

The codebase will be split into:

1. **@padel/types** - Shared TypeScript types (NPM package)
2. **padel-api** - Backend API (Railway deployment)
3. **padel-frontend** - Frontend React app (Vercel deployment)

## Step 1: Create the Types Package Repository

```bash
# Create new repository
git init padel-types
cd padel-types

# Copy types package
cp -r ../current-project/packages/padel-types/* .

# Install and test
npm install
npm run build

# Publish to NPM or GitHub Packages
npm publish
```

## Step 2: Create the Backend API Repository

```bash
# Create new repository
git init padel-api
cd padel-api

# Copy API package
cp -r ../current-project/packages/padel-api/* .

# Copy migrations
cp -r ../current-project/supabase ./

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Test locally
npm run dev

# Deploy to Railway
railway init
railway up
```

### Railway Configuration

Set these environment variables in Railway:

```
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ORIGINS=https://your-app.vercel.app
PORT=3000
```

### Database Migrations

The `supabase/migrations/` folder contains all database schemas. Apply them:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

## Step 3: Create the Frontend Repository

```bash
# Create new repository
git init padel-frontend
cd padel-frontend

# Copy frontend files from current project
cp -r ../current-project/src ./
cp -r ../current-project/public ./
cp ../current-project/index.html ./
cp ../current-project/package.json ./
cp ../current-project/tsconfig*.json ./
cp ../current-project/vite.config.ts ./
cp ../current-project/tailwind.config.js ./
cp ../current-project/postcss.config.js ./
cp ../current-project/eslint.config.js ./
cp ../current-project/.gitignore ./

# Copy new frontend structure
cp -r ../current-project/packages/padel-frontend/.env.example ./
cp ../current-project/packages/padel-frontend/vercel.json ./
cp ../current-project/packages/padel-frontend/README.md ./

# Update API client
cp ../current-project/packages/padel-frontend/src/lib/api.ts ./src/lib/

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API and Supabase URLs

# Test locally
npm run dev

# Deploy to Vercel
vercel --prod
```

### Vercel Configuration

Set these environment variables in Vercel:

```
VITE_API_URL=https://your-api.railway.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Step 4: Update Package Dependencies

### Backend (padel-api)

Update `package.json` to reference the published types package:

```json
{
  "dependencies": {
    "@padel/types": "^1.0.0"
  }
}
```

### Frontend (padel-frontend)

Update `package.json` to reference the published types package (optional):

```json
{
  "dependencies": {
    "@padel/types": "^1.0.0"
  }
}
```

## Step 5: Testing the Separation

### Test the Backend

```bash
cd padel-api
npm run dev

# Test health endpoint
curl http://localhost:3000/health

# Test authenticated endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/players
```

### Test the Frontend

```bash
cd padel-frontend
npm run dev

# Open http://localhost:5173
# Login and test all features
```

## Architecture Changes

### Before (Monorepo)
```
project/
├── src/                    # Frontend
├── supabase/functions/     # Edge Functions
└── supabase/migrations/    # Database
```

### After (3 Repositories)
```
@padel/types/              # NPM Package
├── src/
│   ├── domain.ts
│   └── api.ts
└── package.json

padel-api/                 # Railway
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   └── server.ts
├── supabase/migrations/
└── Dockerfile

padel-frontend/            # Vercel
├── src/
│   ├── pages/
│   ├── components/
│   ├── services/
│   └── lib/api.ts         # New API client
└── vercel.json
```

## Key Differences

### Authentication Flow

**Before:**
```
Frontend → Supabase Edge Functions → Database
```

**After:**
```
Frontend → Backend API → Database
Frontend → Supabase Auth (login only)
```

### API Client Changes

The new API client (`src/lib/api.ts`) now points to:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

Instead of Supabase Functions:
```typescript
const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
```

### Frontend Changes

- Frontend ONLY uses Supabase for authentication (login/logout/signup)
- All data operations go through the backend API
- JWT token from Supabase Auth is passed to backend API
- Services layer remains unchanged

### Backend Changes

- Express API replaces Supabase Edge Functions
- Uses Supabase Service Role Key for database access
- Validates JWT tokens from frontend
- RLS policies still active for security

## Deployment Checklist

### 1. Types Package
- [ ] Published to NPM or GitHub Packages
- [ ] Version tagged and documented

### 2. Backend API
- [ ] Deployed to Railway
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Health endpoint responding
- [ ] CORS configured for frontend domain

### 3. Frontend
- [ ] Deployed to Vercel
- [ ] Environment variables configured
- [ ] API URL pointing to Railway
- [ ] Authentication working
- [ ] All features tested

## Rollback Plan

If issues occur:

1. Keep the old monorepo running
2. Update frontend `.env` to point back to Supabase Functions
3. Restore old `src/lib/api.ts` if needed
4. Debug the new setup in parallel

## Benefits of This Architecture

1. **Independent Scaling**: Scale frontend and backend separately
2. **Team Separation**: Frontend and backend teams work independently
3. **Technology Flexibility**: Easy to change backend framework
4. **Security**: API keys never exposed to frontend
5. **Better Monitoring**: Separate logging and metrics
6. **CI/CD**: Independent deployment pipelines
7. **Type Safety**: Shared types ensure consistency
8. **Cost Optimization**: Deploy frontend to Vercel (free), backend to Railway

## Troubleshooting

### CORS Errors
Check `ALLOWED_ORIGINS` in backend includes your frontend domain.

### 401 Unauthorized
Ensure JWT token is being passed correctly from frontend.

### Database Connection Issues
Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly in backend.

### Types Mismatch
Ensure both frontend and backend use the same version of `@padel/types`.

## Next Steps

1. Set up CI/CD pipelines for all 3 repositories
2. Configure monitoring and logging
3. Set up staging environments
4. Document API endpoints with Swagger
5. Add integration tests
6. Set up automated deployments
