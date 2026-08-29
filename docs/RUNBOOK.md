# Runbook

| Sintoma | Ação |
|---|---|
| Webhook 401 | `META_APP_SECRET` / assinatura |
| Webhook 403 GET | `WHATSAPP_VERIFY_TOKEN` |
| IA não responde no WhatsApp | Redis/worker; `aiEnabled`; janela 24h |
| IA e humano juntos | Assumir deve setar `aiEnabled=false` |
| Oferta inventada | só APROVADA no OfferEngine; auditar `AIExecution` |
| Fila parada | `npm run worker`; `REDIS_URL` |
| Webhook 200 mas Inbox vazio | worker não está rodando; ver `WhatsAppInboundEvent.processedAt` |
| Mensagem duplicada | conferir `wamid` / `idempotencyKey` |
| IA responde com humano no comando | `aiEnabled` deve ser false após Assumir |
| Envio FAILED | job SEND retenta; alerta no Inbox |
