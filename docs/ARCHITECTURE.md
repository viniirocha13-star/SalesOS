# Diagnóstico e arquitetura (marco 1)

## A. Diagnóstico

O repositório já tinha Fase 1: auth, CRM, book/ofertas, simulador, fila operacional, Prisma. **Não foi reescrito do zero.** Evoluímos:

- webhook WhatsApp **síncrono** → persistência + fila + debounce
- prompt hardcoded Brisanet → prompt versionado genérico de telecom
- LLM único → AIRouter (SALES/UTILITY/COMPLEX via env)
- conversas simples → Inbox 3 colunas + lock IA/humano
- sem Redis → BullMQ + Redis (com fallback em memória se a fila falhar, logado)

## B–J. Núcleo

A IA conversa; o **backend** valida tools, ofertas, viabilidade e estado.

```
WhatsApp Cloud API → webhook (HMAC, 200 rápido)
  → WhatsAppInboundEvent (wamid único)
  → job PROCESS_INBOUND_WHATSAPP_MESSAGE
  → Message inbound + Lead/Customer
  → job GENERATE_AI_RESPONSE (debounce 3–6s)
  → AISalesOrchestrator + tools + Offer Engine
  → job SEND_WHATSAPP_MESSAGE
  → Inbox (polling 2,5–4s) / Assumir / Devolver
```

Multi-tenant: `Tenant` + `tenantId` nas entidades centrais.

Mocks (`DevMock*`) só sem credencial / `WHATSAPP_PROVIDER=mock`. Produção sem secret de Meta recusa assinatura.

## Credenciais que faltam para o teste no WhatsApp real

Preencher no `.env`: `OPENAI_API_KEY`, `META_APP_SECRET`, `META_VERIFY_TOKEN`/`WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_TOKEN`/`META_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`. Webhook público: `APP_URL/api/whatsapp/webhook`.
