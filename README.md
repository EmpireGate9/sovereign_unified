# Sovereign Unified Monorepo

## Quick start
```bash
cp .env.example .env
docker compose up -d --build
# App: http://localhost/ | API: http://localhost/api/docs
```

## Services
- reverse-proxy: nginx routes `/api/*` to backend, `/` to frontend
- db: Postgres 16
- redis: Redis 7
- backend: FastAPI (+ Alembic)
- frontend: static

## Env
See `.env.example`. Set `DATABASE_URL` if you rename services.

## CI
Add registry credentials, then build & push with your preferred pipeline.
