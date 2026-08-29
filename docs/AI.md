# IA

Princípio: LLM não é fonte de verdade comercial.

- `AIRouter` / `aiModelFor(SALES|UTILITY|COMPLEX)` lê `AI_SALES_MODEL`, `AI_UTILITY_MODEL`, `AI_COMPLEX_MODEL`
- Sem `OPENAI_API_KEY`: `DevMockLlmProvider` (rótulo no UI)
- `OPENAI_API_STYLE=responses` usa Responses API; senão Chat Completions (fallback)
- Prompt `sales_system` versionado na tabela `PromptVersion` (rollback = reativar versão)
- Tools executadas no backend; `set_price` / `create_discount` recusadas
- Memória: recent messages + ConversationMemory; oferta aceita no banco (`PreSale` / `CommercialAcceptance`)
