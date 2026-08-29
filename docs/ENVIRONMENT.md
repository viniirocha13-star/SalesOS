# Ambiente

Copie `.env.example` → `.env`. Nunca commite secrets.

Modelos de IA: apenas `AI_*_MODEL`. WhatsApp: `META_*` e `WHATSAPP_*`. Redis: `REDIS_URL`.

Obrigatórias para o canal real:

```
OPENAI_API_KEY
AI_SALES_MODEL
AI_UTILITY_MODEL
META_APP_ID
META_APP_SECRET
META_VERIFY_TOKEN
META_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_BUSINESS_ACCOUNT_ID
REDIS_URL
```
