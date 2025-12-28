# Deployment Guide

This guide provides step-by-step instructions for deploying the separated Padel Management System.

## Architecture Overview

The system is now split into 3 independent repositories:

1. **@padel/types** - Shared TypeScript types (NPM package)
2. **padel-api** - Backend API (Express.js on Railway)
3. **padel-frontend** - React frontend (Vercel)

```
┌─────────────────┐
│  padel-frontend │ (Vercel)
│   React + Vite  │
└────────┬────────┘
         │ HTTP + JWT
         ▼
┌─────────────────┐
│   padel-api     │ (Railway)
│     Express     │
└────────┬────────┘
         │ Service Role Key
         ▼
┌─────────────────┐
│    Supabase     │
│   PostgreSQL    │
└─────────────────┘
```

## Prerequisites

- Node.js 20+
- Git
- NPM account (for publishing types package)
- Railway account
- Vercel account
- Supabase project

## Step 1: Prepare the Types Package

The types package needs to be available to both frontend and backend.

### Option A: Publish to NPM (Recommended for Production)

```bash
cd packages/padel-types
npm login
npm publish --access public
```

### Option B: Use Local Package (Development Only)

Keep using `"@padel/types": "file:../padel-types"` in package.json (already configured).

## Step 2: Deploy Backend API to Railway

### Create Repository

```bash
# Create new git repository
mkdir padel-api
cd padel-api

# Copy API package contents
cp -r ../current-project/packages/padel-api/* .

# Copy database migrations
cp -r ../current-project/supabase ./

# Initialize git
git init
git add .
git commit -m "Initial commit"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/padel-api.git
git branch -M main
git push -u origin main
```

### Deploy on Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `padel-api` repository
5. Configure environment variables:

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ORIGINS=https://your-app.vercel.app
```

6. Click "Deploy"
7. Wait for deployment to complete
8. Copy the generated URL (e.g., `https://padel-api-production.up.railway.app`)

### Test the API

```bash
# Health check
curl https://your-api-url.railway.app/health

# Should return: {"status":"ok","timestamp":"..."}
```

## Step 3: Apply Database Migrations

Your database migrations are in `supabase/migrations/`. Apply them to your Supabase project:

### Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to "SQL Editor"
3. Copy and paste each migration file in order
4. Execute them one by one

## Step 4: Deploy Frontend to Vercel

### Create Repository

```bash
# Create new git repository
mkdir padel-frontend
cd padel-frontend

# Copy current frontend files
cp -r ../current-project/src ./
cp -r ../current-project/public ./
cp ../current-project/index.html ./
cp ../current-project/package.json ./
cp ../current-project/vite.config.ts ./
cp ../current-project/tailwind.config.js ./
cp ../current-project/postcss.config.js ./
cp ../current-project/tsconfig*.json ./
cp ../current-project/eslint.config.js ./
cp ../current-project/.gitignore ./

# Copy frontend-specific files
cp ../current-project/packages/padel-frontend/.env.example ./.env.example
cp ../current-project/packages/padel-frontend/vercel.json ./

# Initialize git
git init
git add .
git commit -m "Initial commit"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/padel-frontend.git
git branch -M main
git push -u origin main
```

### Deploy on Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your `padel-frontend` repository
4. Configure build settings (auto-detected):
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. Set environment variables:

```env
VITE_API_URL=https://your-api.railway.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

6. Click "Deploy"
7. Wait for deployment to complete

### Update Backend CORS

After deployment, update your backend's `ALLOWED_ORIGINS` environment variable in Railway:

```env
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-preview.vercel.app
```

## Step 5: Verify Deployment

### Test Frontend

1. Visit your Vercel URL
2. Try to sign up / log in
3. Test creating a profile
4. Test joining the queue
5. Test viewing rankings

### Test Backend

```bash
# Get your JWT token from browser DevTools (Application > Local Storage)
TOKEN="your-jwt-token"
API_URL="https://your-api.railway.app"

# Test authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" $API_URL/players
```

### Check Logs

**Backend (Railway):**
- Go to your Railway project
- Click on "Deployments"
- View logs for errors

**Frontend (Vercel):**
- Go to your Vercel project
- Click on "Deployments"
- View function logs

## Troubleshooting

### CORS Errors

**Problem:** Frontend shows CORS errors in browser console.

**Solution:**
1. Verify `ALLOWED_ORIGINS` in Railway includes your Vercel URL
2. Check that CORS headers are properly set in Express server
3. Redeploy backend after changing environment variables

### 401 Unauthorized Errors

**Problem:** All API requests return 401.

**Solution:**
1. Verify JWT token is being sent in requests
2. Check that `SUPABASE_SERVICE_ROLE_KEY` is correct in Railway
3. Ensure auth middleware is properly validating tokens

### Database Connection Issues

**Problem:** Backend logs show database connection errors.

**Solution:**
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Railway
2. Check that database migrations have been applied
3. Test database connection from Supabase dashboard

### Build Failures

**Backend:**
```bash
# Check TypeScript errors
npm run typecheck

# Test build locally
npm run build
```

**Frontend:**
```bash
# Check TypeScript errors
npm run typecheck

# Test build locally
npm run build
```

## Environment Variables Reference

### Backend (Railway)

| Variable | Example | Required |
|----------|---------|----------|
| `NODE_ENV` | `production` | Yes |
| `PORT` | `3000` | Yes |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Yes |
| `ALLOWED_ORIGINS` | `https://app.vercel.app` | Yes |

### Frontend (Vercel)

| Variable | Example | Required |
|----------|---------|----------|
| `VITE_API_URL` | `https://api.railway.app` | Yes |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Yes |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Yes |

## Monitoring and Maintenance

### Logs

- **Backend:** Railway provides real-time logs
- **Frontend:** Vercel provides function and build logs

### Metrics

- **Backend:** Railway shows CPU, memory, and network usage
- **Frontend:** Vercel analytics for page views and performance

### Database

- Monitor from Supabase dashboard:
  - Query performance
  - Database size
  - Connection pool usage

## Rollback Plan

If deployment fails:

1. **Backend:** Deploy previous version from Railway dashboard
2. **Frontend:** Revert to previous deployment in Vercel
3. **Database:** Restore from Supabase automatic backups

## Cost Estimates

- **Railway:** $5-20/month (depending on usage)
- **Vercel:** Free for personal projects, $20/month for teams
- **Supabase:** Free tier, $25/month for Pro
- **Total:** $0-65/month

## Next Steps

1. Set up custom domains
2. Configure SSL certificates
3. Set up monitoring and alerts
4. Configure automated backups
5. Set up CI/CD pipelines
6. Add staging environments

## Support

For issues with:
- **Railway:** [Railway Discord](https://discord.gg/railway)
- **Vercel:** [Vercel Support](https://vercel.com/support)
- **Supabase:** [Supabase Discord](https://discord.supabase.com)
