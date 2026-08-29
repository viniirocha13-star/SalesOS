# WhatsApp Cloud API

- Provider: `WhatsAppProvider` / `MetaCloudWhatsAppProvider` / `DevMockWhatsAppProvider`
- Webhook GET: verificação `hub.verify_token`
- Webhook POST: HMAC `x-hub-signature-256` com `META_APP_SECRET` (em produção obrigatório)
- Resposta HTTP imediata; processamento no worker BullMQ
- Dedup: `WhatsAppInboundEvent.providerEventId` + `Message.waMessageId`
- Buffer: mensagens do mesmo contato agrupadas em `MESSAGE_BUFFER_MS` (padrão 3,5s)
- Janela: `WhatsAppPolicyService` (`WHATSAPP_SESSION_WINDOW_HOURS`, padrão 24)
- Inbox: `/inbox` — Assumir (`aiEnabled=false`) / Devolver (resumo da intervenção)
