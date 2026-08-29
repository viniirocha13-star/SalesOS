# Fase WhatsApp + OpenAI + CRM

Relatório de entrega. Sem Ads, mapa, Supervisor ou analytics avançado.

## 1. Resumo

Webhook Meta leve e assinado → evento idempotente → worker → lead/conversa → buffer → orquestrador → OpenAI/tools → envio WhatsApp → Inbox com polling, assumir e devolver.

## 2. Arquitetura

Ver `docs/ARCHITECTURE.md` e `docs/WHATSAPP.md`.

## 3. Endpoints

- `GET/POST /api/whatsapp/webhook` — verificação e eventos (público, HMAC)
- `GET/POST /api/inbox` e `/api/inbox/[id]` — lista, detalhe, resposta humana (auth)
- `POST/DELETE /api/conversations/[id]/handoff` — assumir / devolver
- `POST /api/admin/integrations/test` — testar WhatsApp e OpenAI (RBAC admin)

## 4. Jobs

- `PROCESS_INBOUND_WHATSAPP_MESSAGE`
- `GENERATE_AI_RESPONSE` (debounce 3–6s)
- `SEND_WHATSAPP_MESSAGE`

Retry 5x, backoff exponencial, dead letter logado. Worker: `npm run worker`.

## 5. Tools

`get_customer_context`, `update_customer_fact`, `set_sales_stage`, `search_eligible_offers`, `get_offer_details`, `register_objection`, `register_buying_intent`, `request_human_handoff` (+ viabilidade/FAQ/pré-venda).

## 6. Schema

`Conversation.version`, `ConversationMemory.lastSummarizedMessageId`. Usa `WhatsAppInboundEvent`, `Message`, `Customer`, `CustomerFact`, `HumanHandoff`, `AIExecution`.

## 7. Env

Ver `.env.example`: `OPENAI_*`, `AI_*_MODEL`, `META_*`, `WHATSAPP_*`, `REDIS_URL`.

## 8–11. Qualidade

- lint: passou
- typecheck: passou
- vitest: 24 passed
- playwright: 7 passed
- build: passou

## 12. Como conectar o número

`docs/WHATSAPP.md`.

## 13. Limitações

Sem credenciais Meta/OpenAI o canal usa mock. Janela 24h exige template (ainda não enviamos template automático). Sem CPF/pré-venda completa nesta fase. `tenantId` ainda opcional.
