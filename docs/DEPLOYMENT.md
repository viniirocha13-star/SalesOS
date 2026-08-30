# Deploy

Processos **separados**. O WEB nunca sobe o worker.

```
# WEB
npm run build
npm run start:web

# WORKER
npm run worker
```

`START_WORKER_IN_NEXT` deve permanecer vazio. `instrumentation.ts` só liga worker se `START_WORKER_IN_NEXT=1` — não use isso em produção.

Produção:

```
npx prisma migrate deploy
```

Nunca `prisma migrate dev`. Nunca `prisma db seed` em produção (o seed de demo está bloqueado quando `NODE_ENV=production`, salvo `ALLOW_DEV_SEED=1`).

Health: `GET /api/health`  
Readiness (sem auth): `GET /api/ready` — 200 se Postgres e Redis estão up; 503 caso contrário.

A mesma imagem (`Dockerfile`) serve os dois serviços. O `CMD` padrão é WEB (`npm run start:web`). O worker só troca o start command.

## RAILWAY DEPLOYMENT

1. Crie um repositório **GitHub** (o remote da sessão de desenvolvimento pode não ser GitHub) e faça push da `main`.
2. No [Railway](https://railway.app), New Project → Deploy from GitHub repo.
3. Add **PostgreSQL**. Copie `DATABASE_URL` para os serviços da aplicação.
4. Add **Redis**. Copie `REDIS_URL` para WEB e WORKER (o mesmo Redis).
5. Crie o **Web Service** a partir do repo:
   - Build: o `Dockerfile` (ou `npm ci && npx prisma generate && npm run build`)
   - Start: `npm run start:web`
   - Release / pre-deploy: `npx prisma migrate deploy` (somente no WEB, uma vez por deploy)
   - Health: `/api/health`
6. Crie o **Worker Service** a partir do **mesmo** repo:
   - Start: `npm run worker`
   - Sem porta pública
   - **Não** rode `migrate deploy` no worker
7. Configure as variáveis (ver `docs/ENVIRONMENT.md` e `docs/RAILWAY-CHECKLIST.md`). Nesta fase: `WHATSAPP_PROVIDER=mock`.
8. A migration roda no release do WEB (`npx prisma migrate deploy`).
9. Gere o domínio `*.up.railway.app`.
10. Ajuste `APP_URL` e `AUTH_URL` para `https://<serviço>.up.railway.app` (sem barra final) e redesploy o WEB.
11. Teste `https://<domínio>/api/health`, `/api/ready` e `/login`. Diagnóstico: WEB, WORKER, DATABASE, REDIS, OPENAI, WHATSAPP.
12. Crie o primeiro admin (nunca o seed de demo):

```
ADMIN_EMAIL=... ADMIN_NAME=... ADMIN_PASSWORD=... npm run admin:create
```

Rode o comando no ambiente de produção (Railway one-off / shell do WEB) com `DATABASE_URL` de produção. Não imprima a senha.

Desenvolvimento local:

```
docker compose up -d
npx prisma migrate deploy
npx prisma db seed
npm run dev:web
npm run dev:worker
```
