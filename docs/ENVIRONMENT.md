# Ambiente

Copie `.env.example` → `.env`. Nunca commite secrets.

Porta do WEB (única fonte): `APP_PORT=43147`. URL: `APP_URL=http://127.0.0.1:43147`. Não espalhe a porta no código.

Health do app ≠ Preview do Cursor: ver README e `docs/RUNBOOK.md` (“Cursor Preview vs Application Health”).

Modelos de IA: apenas `AI_SALES_MODEL` (GPT-5.6 Luna). WhatsApp: `META_*` e `WHATSAPP_*`. Redis: `REDIS_URL`.

Obrigatórias para o canal real:

```
OPENAI_API_KEY
AI_SALES_MODEL
META_APP_ID
META_APP_SECRET
META_VERIFY_TOKEN
META_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_BUSINESS_ACCOUNT_ID
REDIS_URL
```
