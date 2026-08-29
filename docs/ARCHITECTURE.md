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
Ads/QR/Link → WhatsApp Cloud API → webhook (rápido)
  → WhatsAppInboundEvent (idempotente)
  → buffer (MESSAGE_BUFFER_MS)
  → worker → AISalesOrchestrator → tools → OfferEngine
  → PolicyService (janela 24h) → envio
  → Inbox / Pré-venda / Operador → evento → IA retoma
```

Multi-tenant: `Tenant` + `tenantId` nas entidades centrais.

Mocks (`DevMock*`) só sem credencial / `WHATSAPP_PROVIDER=mock`. Produção sem secret de Meta recusa assinatura.

## Credenciais que faltam para o teste no WhatsApp real

Preencher no `.env`: `OPENAI_API_KEY`, `META_APP_SECRET`, `META_VERIFY_TOKEN`/`WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_TOKEN`/`META_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`. Webhook público: `APP_URL/api/whatsapp/webhook`.
