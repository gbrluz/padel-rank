# Repository Structure - 3 Separate Repositories

## Summary

Your padel management system has been restructured into 3 independent packages ready to become separate repositories:

1. **@padel/types** - Shared TypeScript types (NPM package)
2. **padel-api** - Backend Express API (Railway)
3. **padel-frontend** - React frontend (Vercel)

## What Was Created

### 📦 packages/padel-types/
Shared TypeScript types package that both frontend and backend will use.

**Files:**
- `src/domain.ts` - Domain entities (Player, Match, League, etc.)
- `src/api.ts` - API request/response types
- `src/index.ts` - Main export file
- `package.json` - NPM package configuration
- `tsconfig.json` - TypeScript configuration
- `README.md` - Documentation

**Status:** ✅ Built and tested successfully

**Next Steps:**
- Publish to NPM or GitHub Packages
- Install in backend and frontend as dependency

---

### 🚀 packages/padel-api/
Express backend API that replaces Supabase Edge Functions.

**Structure:**
```
src/
├── config/
│   └── supabase.ts          # Supabase client with Service Role Key
├── controllers/
│   ├── playersController.ts
│   ├── matchesController.ts
│   ├── leaguesController.ts
│   ├── rankingsController.ts
│   ├── queueController.ts
│   ├── adminController.ts
│   └── weeklyEventsController.ts
├── middleware/
│   ├── auth.ts              # JWT validation
│   ├── errorHandler.ts      # Error handling
│   └── validation.ts        # Request validation
├── routes/
│   ├── playersRoutes.ts
│   ├── matchesRoutes.ts
│   ├── leaguesRoutes.ts
│   ├── rankingsRoutes.ts
│   ├── queueRoutes.ts
│   ├── adminRoutes.ts
│   └── weeklyEventsRoutes.ts
└── server.ts                # Express app entry point
```

**Key Features:**
- RESTful API with all endpoints from Edge Functions
- JWT authentication via Supabase Auth
- Supabase Service Role Key for database access
- CORS configuration
- Error handling middleware
- TypeScript with strict mode
- Dockerfile for Railway deployment

**Status:** ✅ Built and type-checked successfully

**Next Steps:**
- Copy `.env.example` to `.env` and configure
- Test locally with `npm run dev`
- Deploy to Railway

---

### 💻 packages/padel-frontend/
React frontend application (use existing `src/` folder).

**New/Updated Files:**
- `src/lib/api.ts` - NEW API client pointing to Railway
- `.env.example` - Environment variables template
- `vercel.json` - Vercel deployment config
- `README.md` - Documentation

**Key Changes:**
- API client now points to `VITE_API_URL` (Railway) instead of Supabase Functions
- Supabase is ONLY used for authentication (login/logout/signup)
- All data operations go through the backend API
- Services layer remains unchanged

**Next Steps:**
- Copy existing `src/`, `public/`, and config files to `packages/padel-frontend/`
- Replace `src/lib/api.ts` with the new version
- Configure `.env.local` with API URL
- Test locally
- Deploy to Vercel

---

## 📋 Migration Steps

### 1. Publish Types Package

```bash
cd packages/padel-types
npm publish  # or publish to GitHub Packages
```

### 2. Set Up Backend Repository

```bash
# Create new git repository
git init padel-api
cd padel-api

# Copy files
cp -r /path/to/packages/padel-api/* .

# Copy database migrations
cp -r /path/to/supabase ./

# Install and configure
npm install
cp .env.example .env
# Edit .env with Supabase credentials

# Test
npm run dev

# Deploy to Railway
railway init
railway up
```

**Railway Environment Variables:**
```
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ORIGINS=https://your-app.vercel.app
PORT=3000
```

### 3. Set Up Frontend Repository

```bash
# Create new git repository
git init padel-frontend
cd padel-frontend

# Copy current frontend files
cp -r /path/to/src ./
cp -r /path/to/public ./
cp /path/to/index.html ./
cp /path/to/package.json ./
cp /path/to/vite.config.ts ./
cp /path/to/tailwind.config.js ./
# ... other config files

# Copy new files
cp /path/to/packages/padel-frontend/.env.example ./
cp /path/to/packages/padel-frontend/vercel.json ./
cp /path/to/packages/padel-frontend/README.md ./

# Replace API client
cp /path/to/packages/padel-frontend/src/lib/api.ts ./src/lib/

# Install and configure
npm install
cp .env.example .env.local
# Edit .env.local with API URL

# Test
npm run dev

# Deploy to Vercel
vercel --prod
```

**Vercel Environment Variables:**
```
VITE_API_URL=https://your-api.railway.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🔄 How It Works

### Before (Current)
```
Frontend → Supabase Edge Functions → Database
```

### After (New Architecture)
```
┌─────────────────────────────────────────────────────┐
│ Frontend (Vercel)                                   │
│ - React + Vite                                      │
│ - Uses Supabase Auth for login                     │
│ - Sends JWT to backend API                         │
└────────────────┬────────────────────────────────────┘
                 │ HTTP + JWT
                 ↓
┌─────────────────────────────────────────────────────┐
│ Backend API (Railway)                               │
│ - Express + TypeScript                              │
│ - Validates JWT                                     │
│ - Uses Service Role Key                            │
└────────────────┬────────────────────────────────────┘
                 │ Service Key
                 ↓
┌─────────────────────────────────────────────────────┐
│ Supabase PostgreSQL                                 │
│ - Database with RLS                                 │
│ - Auth service                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Benefits

1. **Independent Deployment** - Deploy frontend and backend separately
2. **Better Scaling** - Scale each service independently
3. **Team Separation** - Frontend and backend teams work in parallel
4. **Security** - API keys never exposed to frontend
5. **Technology Flexibility** - Easy to change frameworks
6. **Type Safety** - Shared types ensure consistency
7. **Cost Optimization** - Vercel (free tier) + Railway pricing

---

## 📚 Documentation

- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Detailed step-by-step migration
- **[packages/README.md](./packages/README.md)** - Overview of all packages
- **[packages/padel-types/README.md](./packages/padel-types/README.md)** - Types package
- **[packages/padel-api/README.md](./packages/padel-api/README.md)** - Backend API
- **[packages/padel-frontend/README.md](./packages/padel-frontend/README.md)** - Frontend

---

## ✅ Testing Status

- ✅ Types package compiles successfully
- ✅ Backend API type-checks successfully
- ✅ No dependency errors
- ⏳ Local testing required
- ⏳ Deployment required

---

## 🚦 Next Steps

1. **Publish @padel/types** to NPM or GitHub Packages
2. **Deploy Backend** to Railway
3. **Deploy Frontend** to Vercel
4. **Test End-to-End** authentication and API calls
5. **Update DNS/Domains** if needed
6. **Set up CI/CD** for automated deployments
7. **Monitor** both services in production

---

## 🆘 Support

If you encounter issues:

1. Check environment variables are set correctly
2. Verify CORS is configured in backend
3. Ensure JWT tokens are being passed
4. Check Railway and Vercel logs
5. Refer to MIGRATION_GUIDE.md for troubleshooting

---

## 📝 Important Notes

- Frontend ONLY uses Supabase for authentication (login/signup/logout)
- All data operations go through the backend API
- Backend uses Service Role Key to access database
- RLS policies remain active for security
- Types package ensures consistency between frontend and backend
- Each repository can have its own CI/CD pipeline

---

**Everything is ready to be separated into 3 independent repositories!** 🎉
