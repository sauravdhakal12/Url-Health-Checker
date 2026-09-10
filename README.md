# Bulk URL Health Checker
A hobby project built to get hands-on with backend concepts I wanted to understand more deeply: the Pub/Sub pattern (via Redis), Server-Sent Events, background job processing, and idempotency under concurrent/retried work.

## What I learned building this
- How to enforce a global rate limit across multiple worker processes using BullMQ + Redis, rather than per-process limits. 
- Why Server-Sent Events + Redis Pub/Sub is enough for one-directional live updates that stay correct across multiple API instances, without needing WebSockets. 
- Designing for idempotency where retries or duplicate job triggers should never corrupt or double-write state, by keying all writes off a stable row identity. 
- Why the live connection can never be the only source of truth and cold loads and reconnects have to re-sync from the database, not just trust accumulated events.


## Architecture
- Postgres (Source of Truth): Stores the definitive state of every batch and URL check. It is the only true source of record.
- Redis: Serves three distinct roles:
  - Queue coordination for BullMQ.
  - Pub/Sub message broker for streaming live events from the Worker to the API.
  - Cache for the batch list endpoint (30-second cache-aside).

- API (Fastify): Handles incoming HTTP requests, writes initial state to Postgres, enqueues jobs, and streams live updates via Server-Sent Events (SSE).
- Worker (BullMQ): A completely separate Node.js process that pulls jobs off the queue, makes the outbound HTTP requests, updates Postgres with the result, and publishes an event to Redis pub/sub.
- Next.js Web App: Server Components fetch the initial state directly from the API, ensuring a fresh view on every full page load.
Client Components manage interactivity and maintain an EventSource (SSE) connection to merge live updates into the UI.

## Run it locally
1. Clone and `pnpm install` 
2. Copy `.env.example` → `.env` at project root and in `/web` 
3. `docker compose up -d` (starts Postgres + Redis) 
4. `npx prisma migrate deploy` 
5. `pnpm run dev` from repo root

- Web UI: http://localhost:3000 
- API: http://localhost:4000
