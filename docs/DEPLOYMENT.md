# Deploy

`Dockerfile` + `docker-compose.yml` (Postgres + Redis).

```
docker compose up -d
npx prisma migrate deploy
npx prisma db seed
npm run build && npm run start
npm run worker   # fila WhatsApp (também sobe via instrumentation no Next)
```

Health: `GET /api/health`
