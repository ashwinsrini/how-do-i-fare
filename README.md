# TeamMetrics

Unified Jira and GitHub engineering metrics dashboard. Track story points, pull requests, code reviews, cycle times, and team performance in one place.

## Tech Stack

- **Frontend:** Vue 3, PrimeVue 4, Tailwind CSS, Pinia, Chart.js
- **Backend:** Fastify 5, Sequelize 6, Node.js
- **Database:** PostgreSQL 16
- **Queue:** Redis 7, BullMQ
- **Security:** JWT auth, AES-256-GCM credential encryption, bcrypt, rate limiting

## Project Structure

```
├── apps/
│   ├── api/          # Fastify REST API + BullMQ worker
│   └── web/          # Vue 3 SPA
├── packages/
│   └── shared/       # Shared utilities
├── docker-compose.yml          # Local dev (Postgres + Redis)
└── docker-compose.prod.yml     # Production (full stack)
```

## Local Development

**Prerequisites:** Node.js 22+, Docker

```bash
# Start Postgres and Redis
docker compose up -d

# Install dependencies
npm install

# Create .env from example and fill in secrets
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start API and frontend
npm run dev:api
npm run dev:web
```

API: `http://localhost:3001` | Frontend: `http://localhost:5173`

## Production Deployment

```bash
cp .env.example .env    # fill in all secrets
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api npx sequelize-cli db:migrate
```