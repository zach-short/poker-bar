# Poker Bar Manager

A full-stack bar management app for poker nights. Track players, poker sessions, drink orders, inventory, and costs — all in one place.

## Features

- **Sessions** — Create and manage poker sessions, assign players, track status (active/closed)
- **Players** — Maintain a roster of players across sessions
- **Drink Menu** — Define drink recipes with ingredients, pricing, and cost estimates
- **Orders** — Log drink orders per player per session
- **Inventory** — Track bar stock (spirits, mixers, garnishes, syrups, equipment) with reorder thresholds and cost-per-unit
- **Auth** — Email/password and social login (Google, GitHub) via NextAuth.js

## Tech Stack

- **Frontend** — Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI
- **Backend** — Go (Gin), JWT authentication
- **Database** — MongoDB

## Project Structure

```
poker-bar/
├── frontend/               # Next.js application
│   ├── app/               # App Router pages
│   │   ├── drinks/        # Drink menu management
│   │   ├── inventory/     # Inventory management
│   │   ├── menu/          # Menu view
│   │   ├── session/       # Session management
│   │   └── (protected)/   # Auth-protected routes
│   ├── components/        # React components
│   │   ├── auth/          # Auth components
│   │   ├── shared/        # Navbar, shared UI
│   │   └── ui/            # Radix UI primitives
│   ├── lib/               # Auth config, API client
│   ├── models/            # TypeScript types
│   └── context/           # React contexts
│
└── backend/               # Go backend
    ├── handlers/          # HTTP handlers (auth, drinks, inventory, orders, players, sessions)
    ├── middleware/        # JWT auth middleware
    ├── models/            # Data models
    ├── routes/            # Route definitions
    ├── config/            # DB connection
    └── utils/             # JWT utilities
```

## Setup

### Prerequisites

- Node.js 20+
- Go 1.24+
- MongoDB (local or Atlas)
- Bun (frontend package manager)

### Frontend

```bash
cd frontend
bun install
cp .env.example .env
```

Configure `frontend/.env`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
AUTH_SECRET=your-auth-secret-key-here

# Optional: OAuth providers
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret
```

```bash
bun dev
```

Frontend runs at http://localhost:3000

### Backend

```bash
cd backend
go mod download
cp .env.example .env
```

Configure `backend/.env`:
```env
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/
DATABASE_NAME=poker-bar
JWT_SECRET=your-secret-key-here-change-in-production
PORT=8080
```

```bash
go run main.go
```

Backend runs at http://localhost:8080

## API Routes

### Auth (Public)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Email/password login |
| POST | `/auth/register` | Register new account |
| POST | `/auth/social` | Social login |
| POST | `/auth/check-email` | Check if email exists |

### Bar (Protected)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/sessions` | List / create sessions |
| GET/PUT/DELETE | `/sessions/:id` | Get / update / delete session |
| GET/POST | `/players` | List / create players |
| GET/PUT/DELETE | `/players/:id` | Get / update / delete player |
| GET/POST | `/drinks` | List / create drink recipes |
| GET/PUT/DELETE | `/drinks/:id` | Get / update / delete drink |
| GET/POST | `/inventory` | List / create inventory items |
| GET/PUT/DELETE | `/inventory/:id` | Get / update / delete item |
| GET/POST | `/orders` | List / create orders |
| GET | `/orders/session/:id` | Orders for a session |

## Deployment

### Frontend (Vercel)

1. Push to GitHub
2. Import in Vercel, set env vars, deploy

### Backend

Any Go-compatible host (Railway, Render, Fly.io, DigitalOcean). Set `GIN_MODE=release` and update CORS origins in `main.go`.

## License

MIT
