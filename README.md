# Sales OS — plataforma comercial WhatsApp + IA

CRM operacional multi-tenant (primeiro uso: telecom). A IA conversa; o backend é a fonte de verdade comercial.

Documentação em `docs/`: ARCHITECTURE, DATABASE, WHATSAPP, AI, SECURITY, DEPLOYMENT, ENVIRONMENT, RUNBOOK.

## Dev

```bash
cp .env.example .env
# Postgres + Redis (docker compose up -d) ou serviços locais
npx prisma migrate dev
npx prisma db seed
npm run dev
```

App em `http://localhost:43147`. Login seed: `ursula.b@example.com` / `Brisa@2026`

- Inbox `/inbox`
- Agora (operador) `/home`
- Laboratório `/conversas`
- Integrações `/admin/integracoes`

WhatsApp real: preencha as variáveis Meta no `.env` e aponte o webhook para `/api/whatsapp/webhook`. Sem chave OpenAI o laboratório usa `DevMockLlmProvider` (identificado na UI).
