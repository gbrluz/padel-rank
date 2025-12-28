# Padel API

Backend API for Padel Management System built with Express and TypeScript.

## Features

- RESTful API endpoints for all padel management operations
- JWT authentication via Supabase Auth
- Supabase database integration with RLS
- TypeScript with strict type checking
- Error handling and validation
- CORS and security headers

## Setup

### Prerequisites

- Node.js 20+
- Supabase project

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
PORT=3000
NODE_ENV=development

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Players
- `GET /players` - Get current player
- `GET /players/:id` - Get player by ID
- `PUT /players/:id` - Update player

### Matches
- `GET /matches` - List matches
- `PUT /matches/:id/schedule` - Schedule match
- `PUT /matches/:id/availability` - Update availability
- `POST /matches/complete` - Complete match
- `POST /matches/approve` - Approve match

### Leagues
- `GET /leagues` - List leagues
- `POST /leagues` - Create league (admin)
- `GET /leagues/:id` - Get league details
- `PUT /leagues/:id` - Update league (admin)
- `POST /leagues/:id/join` - Join league
- `DELETE /leagues/:id/leave` - Leave league
- `GET /leagues/:id/members` - Get league members
- `GET /leagues/:id/ranking` - Get league ranking
- `GET /leagues/:id/requests` - Get join requests
- `POST /leagues/:id/requests/:requestId/approve` - Approve request
- `POST /leagues/:id/requests/:requestId/reject` - Reject request
- `GET /leagues/:id/events` - Get weekly events
- `POST /leagues/:id/events` - Create weekly event

### Weekly Events
- `GET /weekly-events/:id` - Get event details
- `GET /weekly-events/:id/attendance` - Get attendance
- `POST /weekly-events/:id/confirm` - Confirm attendance
- `POST /weekly-events/:id/cancel` - Cancel attendance
- `POST /weekly-events/:id/generate-duos` - Generate duos
- `POST /weekly-events/:id/score` - Submit score
- `PUT /weekly-events/:id/status` - Update status

### Rankings
- `GET /rankings/regional` - Regional ranking
- `GET /rankings/global` - Global ranking
- `GET /rankings/history/:playerId` - Ranking history

### Queue
- `GET /queue` - Get queue status
- `POST /queue` - Join queue
- `DELETE /queue` - Leave queue

### Admin
- `GET /admin/players` - List all players
- `PUT /admin/players/:id` - Update any player
- `GET /admin/stats` - System statistics

## Authentication

All endpoints require a valid JWT token from Supabase Auth in the Authorization header:

```
Authorization: Bearer <token>
```

## Deployment

### Railway

```bash
# Build and deploy
railway up
```

### Docker

```bash
docker build -t padel-api .
docker run -p 3000:3000 --env-file .env padel-api
```

## Error Handling

The API returns standard HTTP status codes:

- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

Error response format:
```json
{
  "error": "Error message"
}
```
