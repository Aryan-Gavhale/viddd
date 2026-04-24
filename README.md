# Vidlancing — Video Editing Freelance Marketplace

A full-stack marketplace platform connecting video editors with clients. Built with Fastify, PostgreSQL, Redis, React, and Socket.IO.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js 20+, Fastify 5.x, TypeScript |
| **Database** | PostgreSQL 15+ |
| **Cache/Queues** | Redis 7+, Bull |
| **Frontend** | React 18, Vite 6, Tailwind CSS 3 |
| **Real-time** | Socket.IO with Redis adapter |
| **Payments** | Stripe (escrow, milestones) |
| **Storage** | AWS S3 (multipart uploads, presigned URLs) |
| **Auth** | JWT (httpOnly cookies, CSRF, refresh token rotation) |
| **Monitoring** | Sentry, Winston |

## Prerequisites

- **Node.js** >= 20.x
- **PostgreSQL** >= 15
- **Redis** >= 7
- **npm** >= 9

## Quick Start (Local Development)

### 1. Clone the repository

```bash
git clone https://github.com/Aryan-Gavhale/viddd.git
cd viddd
```

### 2. Set up the backend

```bash
cd vid
npm install
cp .env.example .env
```

Edit `vid/.env` and fill in your values:

```env
# Required — generate secrets with:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<your-64-char-hex>
JWT_REFRESH_SECRET=<different-64-char-hex>
COOKIE_SECRET=<another-secret>

# Database
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/vidlancing

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:5173

# Stripe (get from https://dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket

# Email (optional for dev)
EMAIL_USERNAME=
EMAIL_PASSWORD=

# Frontend URL
APP_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

### 3. Set up the database

Create the PostgreSQL database:

```bash
createdb vidlancing
# OR via psql:
psql -U postgres -c "CREATE DATABASE vidlancing;"
```

Run migrations:

```bash
npm run db:migrate
# Or manually apply schema:
psql $DATABASE_URL -f prisma/migrations/20250305051517_init/migration.sql
# Then apply subsequent migrations in order
```

Seed data (optional):

```bash
npm run seed
npm run seed:categories
npm run seed:badges
```

### 4. Start the backend

```bash
npm run dev
# Server starts at http://localhost:3000
# Health check: http://localhost:3000/health
```

### 5. Set up the frontend

```bash
cd ../vid-frontend
npm install
cp .env.example .env
```

Edit `vid-frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
```

### 6. Start the frontend

```bash
npm run dev
# App opens at http://localhost:5173
```

## Running Tests

### Backend tests

```bash
cd vid
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Type checking

```bash
cd vid
npm run typecheck
```

### Frontend linting

```bash
cd vid-frontend
npm run lint
```

## Docker Setup

### Prerequisites

- Docker and Docker Compose v2

### Run with Docker

```bash
# Create a .env file in the project root with required variables:
# POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, JWT_SECRET, etc.

docker compose up --build
```

**Important**: Set `POSTGRES_USER` and `POSTGRES_PASSWORD` in your environment or a root `.env` file — Docker Compose requires them (no defaults for security).

### Services

| Service | Port | Description |
|---------|------|-------------|
| `api` | 3000 | Backend API |
| `frontend` | 80 | Nginx serving React SPA |
| `postgres` | 5432 | PostgreSQL database |
| `redis` | 6379 | Redis cache/queues |

## Running Bull Workers Separately

For production, run queue workers as a dedicated process:

```bash
# In the API container/machine:
DISABLE_WORKERS=true npm start

# In a separate worker container/machine:
npm run worker
```

## Project Structure

```
viddd/
├── .github/workflows/   # CI pipeline (lint, test, build, security audit)
├── shared/              # Shared types/utilities
├── vid/                 # Backend (Fastify + TypeScript)
│   ├── src/
│   │   ├── Controllers/ # Route handlers
│   │   ├── Middlewares/  # Auth, upload, validation
│   │   ├── Routes/       # Fastify route definitions
│   │   ├── Queues/       # Bull job queues + processors
│   │   ├── Utils/        # Helpers (tokens, cache, logger, S3)
│   │   ├── Config/       # Redis, env validation
│   │   ├── tests/        # Vitest unit tests
│   │   ├── app.ts        # Fastify app setup
│   │   ├── index.ts      # Entry point
│   │   ├── socket.ts     # WebSocket (Socket.IO)
│   │   ├── db.ts         # PostgreSQL pool
│   │   └── worker.ts     # Dedicated Bull worker entry
│   ├── prisma/           # Schema + migrations
│   ├── scripts/          # Migration runner
│   ├── vitest.config.ts  # Test config
│   └── package.json
├── vid-frontend/        # Frontend (React + Vite)
│   ├── src/
│   │   ├── Components/  # React components
│   │   ├── redux/       # Redux Toolkit store
│   │   ├── Hooks/       # Custom hooks
│   │   ├── utils/       # Axios, socket, helpers
│   │   ├── App.jsx      # Routes + layout
│   │   └── main.jsx     # Entry point
│   └── package.json
├── docker-compose.yml
├── VIDLANCING.md        # Detailed architecture docs
└── README.md
```

## Key Features

- **Gig Marketplace** — Freelancers create service packages
- **Job Board** — Clients post jobs, freelancers apply
- **Escrow Payments** — Stripe-backed milestone payments
- **Real-time Chat** — Socket.IO with file attachments
- **Video Calls** — WebRTC signaling
- **Video Review** — Frame-accurate annotations and comments
- **Project Timelines** — Gantt chart visualization
- **Portfolio & Demo Reels** — Auto-generated showreels
- **Skill Verification** — Tests with graded badges
- **Community & Blog** — Posts, comments, likes
- **Template Marketplace** — Buy/sell editing templates
- **AI Editor Matching** — Smart freelancer recommendations
- **Revenue Streams** — Service fees, featured listings, subscriptions

## API Documentation

All endpoints are prefixed with `/api/v1/`. See `VIDLANCING.md` for the complete API reference, architecture details, and deployment guide.

## License

Private — All rights reserved.
