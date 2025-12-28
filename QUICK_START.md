# Quick Start Guide: Repository Separation

This guide gets you up and running with the separated architecture in under 5 minutes.

## Current Status

✅ **READY TO USE** - The project has been successfully separated and is ready for deployment.

## What Was Done

1. Frontend API client updated to use backend API
2. Three independent packages created in `packages/`
3. Documentation and configuration files added
4. All builds tested and verified

## Test Locally (Right Now)

### 1. Start the Backend API

```bash
cd packages/padel-api
npm install
cp .env.example .env
# Edit .env and add your Supabase credentials
npm run dev
```

Backend runs on `http://localhost:3000`

### 2. Start the Frontend

In a new terminal:

```bash
cd /path/to/project/root
npm run dev
```

Frontend runs on `http://localhost:5173` and connects to the backend.

### 3. Test It Works

1. Open `http://localhost:5173`
2. Sign up or log in
3. Complete your profile
4. Try the features

If everything works, you're ready to deploy!

## Deploy to Production

Follow the `DEPLOYMENT_GUIDE.md` for complete instructions:

### Quick Deploy Checklist

1. **Backend (Railway)**
   - [ ] Create GitHub repo for `packages/padel-api`
   - [ ] Deploy to Railway
   - [ ] Set environment variables
   - [ ] Copy the generated URL

2. **Database (Supabase)**
   - [ ] Apply migrations from `supabase/migrations/`
   - [ ] Verify tables exist

3. **Frontend (Vercel)**
   - [ ] Create GitHub repo for frontend
   - [ ] Deploy to Vercel
   - [ ] Set `VITE_API_URL` to Railway URL
   - [ ] Test production deployment

## File Structure

```
packages/
├── padel-types/       # Shared types (publish to NPM)
├── padel-api/         # Backend (deploy to Railway)
└── padel-frontend/    # Frontend config (for Vercel)
```

## Key Changes Made

### Frontend (`src/lib/api.ts`)
- Changed from Supabase Edge Functions to Backend API
- All API calls now go to `VITE_API_URL`

### Environment Variables (`.env`)
- Added `VITE_API_URL=http://localhost:3000`

## Documentation

- `SEPARATION_STATUS.md` - What changed and current status
- `DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
- `MIGRATION_GUIDE.md` - Technical migration details
- `packages/*/README.md` - Package-specific documentation

## Need Help?

1. Check the `DEPLOYMENT_GUIDE.md` for detailed steps
2. Check the `MIGRATION_GUIDE.md` for technical details
3. Check the package README files for specific configurations

## Summary

**What works:** Everything! The separation is complete.

**What changed:** Frontend now uses backend API instead of Supabase Edge Functions.

**What to do next:** Test locally, then deploy to production when ready.

**Time to deploy:** 1-2 hours following the deployment guide.
