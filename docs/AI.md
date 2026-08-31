# IA

Princípio: o LLM não é fonte de verdade comercial. Prompt = personalidade; fatos = Book + tools + estado do lead. Arquitetura completa em `docs/LUNA.md`.

- `createSalesResponse` / `createUtilityResponse` / `createSummary` em `src/ai/openai.ts`
- Responses API por padrão; `OPENAI_API_STYLE=chat` força Chat Completions
- **Três modelos, uma chave:** Terra (`AI_SALES_MODEL`) vende; Sol (`AI_COMPLEX_MODEL`) entra via ComplexityRouter (teto `MAX_SOL_CALLS_PER_CONVERSATION`); Luna (`AI_UTILITY_MODEL`) resume e classifica. Laboratório: Luna · Terra · Terra+Sol.
- Effort padrão `low` (`AI_SALES_REASONING_EFFORT`)
- Sem `OPENAI_API_KEY`: `DevMockLlmProvider`
- Tools: contexto, fatos, estágio, ofertas, comparação, viabilidade, objeção (contexto, sem frase pronta), intenção, aceite, campos cadastrais, pré-venda, handoff, regras, perda
- ObjectionEngine e SalesDiscovery informam limites; `AI_SALES_MODEL` redige
- ComplexityRouter só registra dificuldade; **não** troca de modelo
- Laboratório em `/conversas` mostra metadados (sem chain-of-thought)
- Offer Engine filtra APROVADA + vigência + cidade
- Uso gravado em `AIExecution` (tokens + custo estimado)
- Falha OpenAI no turno: a Luna responde de recuperação e **não** pausa a conversa. Handoff só por regra explícita, pedido do cliente ou operador.
- Lock Redis `lock:conversation:{id}` — uma geração por conversa
- Se entrar inbound novo (`Conversation.version`) durante a geração, a resposta é descartada e o buffer reprocessa
