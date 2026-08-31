# Ambiente

Copie `.env.example` → `.env`. Nunca commite secrets. Nunca use `NEXT_PUBLIC_` para chaves.

## Porta

Railway injeta `PORT`. O WEB usa `PORT || APP_PORT || 43147` e escuta em `APP_HOST=0.0.0.0`.

## Produção (WEB)

```
DATABASE_URL
REDIS_URL
AUTH_SECRET
AUTH_URL
APP_URL
ENCRYPTION_KEY
# ou APP_ENCRYPTION_KEY
OPENAI_API_KEY
AI_SALES_MODEL
```

Recomendado no WEB:

```
NODE_ENV=production
APP_HOST=0.0.0.0
AI_SALES_MODEL=gpt-5.6-terra
AI_COMPLEX_MODEL=gpt-5.6-sol
AI_UTILITY_MODEL=gpt-5.6-luna
AI_COMPLEX_ENABLED=true
MAX_SOL_CALLS_PER_CONVERSATION=2
OPENAI_API_STYLE=chat
WHATSAPP_PROVIDER=mock
```

`AUTH_URL` e `APP_URL` devem ser a URL HTTPS pública (ex.: `https://xxxx.up.railway.app`).

## Produção (WORKER)

```
DATABASE_URL
REDIS_URL
OPENAI_API_KEY
AI_SALES_MODEL
AI_COMPLEX_MODEL
AI_UTILITY_MODEL
ENCRYPTION_KEY
# ou APP_ENCRYPTION_KEY
NODE_ENV=production
```

Mesmo Postgres e mesmo Redis do WEB.

## Depois (WhatsApp Meta)

```
WHATSAPP_PROVIDER=meta
META_APP_SECRET
META_VERIFY_TOKEN
META_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_BUSINESS_ACCOUNT_ID
```

Webhook futuro: `{APP_URL}/api/whatsapp/webhook`

## Viabilidade

Com contrato/API oficial:

```
BRISANET_VIABILITY_URL=
BRISANET_VIABILITY_TOKEN=
BRISANET_VIABILITY_METHOD=POST
```

A Luna geocodifica o endereço (Nominatim ou `GOOGLE_GEOCODE_API_KEY`) e chama a API autenticada. Só afirma VIAVEL/NÃO se a resposta for confiável.

Sem API: geocode + card em **Tarefas / Operação → Fila de viabilidade**. O operador olha a caixa no sistema Brisanet. Sem scraping.

## Desenvolvimento

```
APP_PORT=43147
APP_URL=http://127.0.0.1:43147
AUTH_URL=http://127.0.0.1:43147
```

Sem `OPENAI_API_KEY` no desenvolvimento, o vendedor usa mock. Em `NODE_ENV=production` o mock **não** entra: sem chave a integração fica `NOT_CONFIGURED` e o atendimento IA é bloqueado.

O seed de demo (`ursula.b@example.com` / senha de desenvolvimento) **não** roda em production sem `ALLOW_DEV_SEED=1`.
