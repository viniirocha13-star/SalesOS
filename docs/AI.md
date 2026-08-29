# IA

Princípio: o LLM não é fonte de verdade comercial.

- `createSalesResponse` / `createUtilityResponse` / `createSummary` em `src/ai/openai.ts`
- Responses API por padrão; `OPENAI_API_STYLE=chat` força Chat Completions
- Modelos só via `AI_SALES_MODEL`, `AI_UTILITY_MODEL`, `AI_COMPLEX_MODEL`
- Sem `OPENAI_API_KEY`: `DevMockLlmProvider`
- Tools: contexto, fatos, estágio, ofertas, comparação, viabilidade, objeção (contexto, sem frase pronta), intenção, aceite, campos cadastrais, pré-venda, handoff, regras, perda
- ObjectionEngine e SalesDiscovery informam limites; `AI_SALES_MODEL` redige
- ComplexityRouter escala para `AI_COMPLEX_MODEL` só em casos difíceis (mesmas restrições comerciais)
- Laboratório em `/conversas` mostra metadados (sem chain-of-thought)
- Offer Engine filtra APROVADA + vigência + cidade
- Uso gravado em `AIExecution` (tokens + custo estimado)
- Falha OpenAI após retries do worker → conversa em HUMAN_REVIEW (`aiEnabled=false`)
- Lock Redis `lock:conversation:{id}` — uma geração por conversa
- Se entrar inbound novo (`Conversation.version`) durante a geração, a resposta é descartada e o buffer reprocessa
