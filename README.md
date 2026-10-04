# Codelume

Codelume tracks focused study sessions, projects, technologies, daily goals and progress. It is a single-page React app with an Express/MongoDB API; community chat and live presence use Socket.IO.

## Run locally

1. Install dependencies in `backend` and `frontend` with `npm install`.
2. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI`. Keep `.env` private. `CORS_ORIGIN` should include the exact frontend origin used in your browser.
3. Start the API from `backend` with `npm run dev`.
4. Start the web app from `frontend` with `npm run dev`. The Vite development proxy forwards `/api` and `/socket.io` to `http://localhost:5000`.

Cloudinary is optional for hosted avatar uploads. Redis is optional and is needed only when multiple long-running API instances must share Socket.IO events.
If a standalone API runs behind a reverse proxy, set `TRUST_PROXY_HOPS` to the exact number of trusted proxy hops so client IP rate limits use the correct address.

## Checks

- Frontend: `npm run lint` and `npm run build` from `frontend`.
- Backend: `npm test` from `backend`.
- `GET /api/health` checks that the process is responding; `GET /api/health/ready` checks database readiness.

## Accounts and backups

All newly registered accounts start as regular users. To grant administrator access to a specific existing account, use `npm run admin:grant -- --user-id <MongoDB-user-id> --confirm-username <exact-username>` from `backend`. The command requires `MONGODB_URI` and matches both values before changing the role.

Use **Settings → Data Backup** for versioned personal JSON exports and restores. The old full-database SQL/JSON replacement migrations are retired; `npm run db:migrate:inspect -- --input <file.json>` only lists record counts and never writes to MongoDB. Do not use old migration snapshots as a production restore until a source-specific mapping has been reviewed against the current models.

Before publishing this repository, audit the full Git history for previously committed personal backups or credentials. Removing a file from the current tree does not remove it from older commits; rotate any credentials that may have been exposed and scrub repository history where required.

## Deployment note

The frontend and API are configured as separate Vercel projects. Set the frontend `VITE_API_BASE` to the API's full URL ending in `/api`; set `VITE_SOCKET_URL` to the API origin when realtime is hosted on a compatible long-running server. The bundled Vercel API handler does not start Socket.IO, so live chat/presence needs a deployment that supports a persistent WebSocket server.
