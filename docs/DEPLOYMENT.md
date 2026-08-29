# Deploy

`Dockerfile` + `docker-compose.yml` (Postgres + Redis).

Processos **separados** em produção:

```
# WEB — não sobe worker (instrumentation só se START_WORKER_IN_NEXT=1)
npm run build
npm run start

# WORKER — processo independente
npm run worker
```

Desenvolvimento:

```
docker compose up -d
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

O Fast Refresh **não** inicializa o worker. `instrumentation.ts` só chama `startInboundWorker` se `START_WORKER_IN_NEXT=1`. A conexão Redis é singleton (`getConnection`) e o worker usa `globalThis` para não duplicar.

Health: `GET /api/health`
