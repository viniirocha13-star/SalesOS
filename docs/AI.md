# IA

Princípio: o LLM não é fonte de verdade comercial.

- `createSalesResponse` / `createUtilityResponse` / `createSummary` em `src/ai/openai.ts`
- Responses API por padrão; `OPENAI_API_STYLE=chat` força Chat Completions
- Modelos só via `AI_SALES_MODEL`, `AI_UTILITY_MODEL`, `AI_COMPLEX_MODEL`
- Sem `OPENAI_API_KEY`: `DevMockLlmProvider`
- Tools no backend: `get_customer_context`, `update_customer_fact`, `set_sales_stage`, `search_eligible_offers`, `get_offer_details`, `register_objection`, `register_buying_intent`, `request_human_handoff`
- Offer Engine filtra APROVADA + vigência + cidade
- Uso gravado em `AIExecution` (tokens + custo estimado)
- Falha OpenAI após retries do worker → conversa em HUMAN_REVIEW (`aiEnabled=false`)
- Lock Redis `lock:conversation:{id}` — uma geração por conversa
- Se entrar inbound novo (`Conversation.version`) durante a geração, a resposta é descartada e o buffer reprocessa
