# Sales OS — plataforma comercial WhatsApp + IA

CRM operacional multi-tenant (primeiro uso: telecom). A IA conversa; o backend é a fonte de verdade comercial.

Documentação em `docs/`: ARCHITECTURE, DATABASE, WHATSAPP, AI, SECURITY, DEPLOYMENT, ENVIRONMENT, RUNBOOK.

## Porta e URL reais

A porta de desenvolvimento é **uma só**, via `APP_PORT` (veja `.env.example`):

```
APP_PORT=43147
APP_URL=http://127.0.0.1:43147
```

Abra o sistema **fora do Preview do Cursor**:

**http://127.0.0.1:43147/login**

Health (não depende de OpenAI nem Meta):

**http://127.0.0.1:43147/api/health**

Diagnóstico (admin autenticado): **Administração → Diagnóstico** (`/admin/diagnostico`).

## Processos (WEB e WORKER separados)

O worker **não** sobe no boot do Next. `START_WORKER_IN_NEXT` deve permanecer vazio.

```bash
cp .env.example .env
# Postgres + Redis (docker compose up -d) ou serviços locais
npx prisma migrate dev
npx prisma db seed

# Só o Next
npm run dev:web

# Só o worker (heartbeat no Redis)
npm run dev:worker
# alias: npm run worker

# Os dois, em processos independentes (concurrently)
npm run dev
```

Produção local:

```bash
npm run build
npm run start:web   # ou npm run start
npm run worker
```

Se a porta estiver ocupada, o script **mostra erro e sai**. Não mata processos automaticamente.

Login seed: `ursula.b@example.com` / `Brisa@2026`

Outros usuários seed (mesma senha): `rachel.c@example.org` (supervisor), `zoe.m@example.net` e `tina.r@example.net` (operadores), `samuel.w@example.com` (analista).

- Inbox `/inbox`
- Agora (operador) `/home`
- Laboratório `/conversas`
- Integrações `/admin/integracoes`
- Diagnóstico `/admin/diagnostico`

WhatsApp real: preencha as variáveis Meta no `.env` e aponte o webhook para `/api/whatsapp/webhook`. Sem chave OpenAI o laboratório usa `DevMockLlmProvider` (identificado na UI).

Qualidade: `npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e`

O E2E Playwright reutiliza o servidor já no ar (`reuseExistingServer`) na porta `APP_PORT`. Relatório da auditoria do núcleo: `docs/AUDIT.md`. Fase WhatsApp + OpenAI: `docs/PHASE-WHATSAPP.md` e `docs/WHATSAPP.md`. Fase comercial: `docs/PHASE-COMMERCIAL.md`.

Modelos só via env: `AI_SALES_MODEL`, `AI_COMPLEX_MODEL`, `AI_UTILITY_MODEL`. Sem `OPENAI_API_KEY` o vendedor usa mock de desenvolvimento (não inventa desconto).

## Preview do Cursor não responde, mas app está online

O Preview/proxy do Cursor pode ficar mudo enquanto o Next responde em `127.0.0.1`. Isso **não** é travamento da aplicação.

1. Verificar `GET /api/health` — deve retornar `status: "ok"` e `web: "up"` sem chamar OpenAI ou Meta.
2. Abrir direto: [http://127.0.0.1:43147/login](http://127.0.0.1:43147/login)
3. Verificar o processo WEB (`npm run dev:web` ou `npm run start:web`).
4. Verificar o processo WORKER (`npm run dev:worker`). No Diagnóstico, WORKER ONLINE = heartbeat recente no Redis.
5. Só reiniciar o servidor se o health check **falhar**. Não mate processos desconhecidos na porta; use o PID do Next/worker que você mesmo iniciou.

Integração `NOT_CONFIGURED` (OpenAI/WhatsApp) **não** significa app offline.
