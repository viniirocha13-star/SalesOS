# Sales OS — plataforma comercial WhatsApp + IA

CRM operacional multi-tenant (primeiro uso: telecom). A IA conversa; o backend é a fonte de verdade comercial.

Documentação em `docs/`: ARCHITECTURE, DATABASE, WHATSAPP, AI, SECURITY, DEPLOYMENT, ENVIRONMENT, RUNBOOK.

## Dev

```bash
cp .env.example .env
# Postgres + Redis (docker compose up -d) ou serviços locais
npx prisma migrate dev
npx prisma db seed
```

Processos separados (obrigatório em produção):

```bash
# WEB — Next.js. Não sobe worker. Fast Refresh não inicializa fila.
npm run dev
# ou: npm run build && npm run start

# WORKER — BullMQ / Redis, processo independente
npm run worker
```

App em `http://127.0.0.1:43147`. Login seed: `ursula.b@example.com` / `Brisa@2026`

Outros usuários seed (mesma senha): `rachel.c@example.org` (supervisor), `zoe.m@example.net` e `tina.r@example.net` (operadores), `samuel.w@example.com` (analista).

- Inbox `/inbox`
- Agora (operador) `/home`
- Laboratório `/conversas`
- Integrações `/admin/integracoes`

WhatsApp real: preencha as variáveis Meta no `.env` e aponte o webhook para `/api/whatsapp/webhook`. Sem chave OpenAI o laboratório usa `DevMockLlmProvider` (identificado na UI).

Qualidade: `npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e`

O E2E Playwright espera o servidor de produção (`npm run start` na porta 43147). Relatório da auditoria do núcleo: `docs/AUDIT.md`. Fase WhatsApp + OpenAI: `docs/PHASE-WHATSAPP.md` e `docs/WHATSAPP.md`.
