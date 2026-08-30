# Fase comercial end-to-end

O `AI_SALES_MODEL` é o vendedor. O backend só afirma o que é verdade e o que é permitido.

Não há árvore de decisão de frases. ObjectionEngine, Discovery e Intent devolvem contexto e flags. O modelo redige.

## 1. Arquitetura do AI Sales

```
WhatsApp / Laboratório
        ↓
Message buffer + lock
        ↓
SalesOrchestrator
   ├─ CustomerFacts (persistência)
   ├─ buildCommercialContext (fatos, ofertas slim, viabilidade, discovery)
   ├─ ComplexityRouter (telemetria; mesmo modelo)
   ├─ createSalesResponse (tools, AI_SALES_MODEL = Luna)
   └─ CommercialDecision (metadados, sem chain-of-thought)
        ↓
mensagem ao cliente (nunca preço inventado)
```

Backend: ofertas, preços, vigência, elegibilidade, cobertura, estados, PII, pré-venda, fila.

IA: interpretação, tom, pergunta seguinte, abordagem de objeção, momento de avançar.

## 2. AI_SALES_MODEL

Único modelo do atendimento: `AI_SALES_MODEL` (padrão `gpt-5.6-luna`). Effort `AI_SALES_REASONING_EFFORT=low`.

GPT-5.6 Terra **não** é utilizado. Resumos e casos difíceis usam o mesmo Luna.

Recebe o prompt de vendedor + JSON de contexto. Chama tools. Redige a mensagem.

Sem `OPENAI_API_KEY`, `DevMockLlmProvider` simula tools e redação contextual — não é roteiro de produção.

## 3. Sem modelo COMPLEX / UTILITY separado

`createUtilityResponse` e o ComplexityRouter continuam existindo, mas **não** apontam para outro ID. Não há `AI_COMPLEX_MODEL` nem `AI_UTILITY_MODEL`.

## 5. ComplexityRouter

Registra conversa difícil (≥3 objeções, contradição, etc.) em `ComplexityEscalation`. **Não troca de modelo:** `from_model` = `to_model` = Luna.

Objeção isolada de preço **não** gera registro.

## 6. ObjectionEngine

`get_objection_context` / `getObjectionContext`:

categoria, customer_context, current_offer, alternative_offers, allowed_arguments, forbidden_claims, commercial_goal, previous_attempts, competitor_price, buying_interest.

**Não** devolve `reply`.

## 7. Tools

`get_customer_context`, `update_customer_fact`, `set_sales_stage`, `search_eligible_offers`, `get_offer_details`, `compare_offers`, `check_viability`, `register_objection`, `get_objection_context`, `register_buying_intent`, `register_commercial_acceptance`, `get_required_customer_fields`, `save_customer_field`, `create_pre_sale`, `request_human_handoff`, `register_loss_reason`, `get_business_rule` (+ aliases).

CPF no prompt: só `cpf_collected` / `cpf_valid`.

## 8. Offer Engine

Elegíveis = APROVADA + vigência + cidade. Por padrão: best, alternative, cross-sell quando o motor achar. Snapshot em `OfferPresentation`. A IA não altera preço/promo/fidelidade.

## 9. Viabilidade

Estados em `details.state`: AVAILABLE, UNKNOWN, MANUAL_CHECK_REQUIRED (PARTIAL via INDETERMINADO). `VIABILITY_PROVIDER=manual` força `ManualOperatorViabilityProvider`. Sem afirmar cobertura sem fonte confiável.

## 10. Aceite

`register_commercial_acceptance` exige oferta aprovada, vigente e apresentada. Stage → `COMMERCIAL_ACCEPTANCE`. A IA para de vender e coleta dados.

## 11. Coleta cadastral

`RequiredFieldDefinition` (fibra: nome, CPF, endereço, cidade, CEP). Backend lista o que falta (máx. 2 por vez). A IA decide como pedir.

## 12. PII / CPF

Validação, normalização, AES-256-GCM, máscara, RBAC nas rotas, `maskForLog`. CPF completo fora do prompt e dos logs.

## 13. Pré-venda

`createPreSale` exige aceite, oferta vigente, viabilidade não negativa, campos obrigatórios. Snapshot imutável no `consentsSnapshot`.

## 14. Fila

PRONTA → claim atômico (`updateMany` owner null) → EM_LANCAMENTO → APROVADA / PENDENCIA / REPROVADA. Eventos SALE_REGISTERED / SALE_PENDING / SALE_REJECTED. IA retoma com contexto do operador.

## 15. Workflow

`Workflow` / `WorkflowStep` / `WorkflowExecution`. Tipos: SEND_MESSAGE, WAIT_CUSTOMER, WAIT_OPERATOR, REQUEST_DATA, REQUEST_DOCUMENT, SEND_LINK, COMPLETE. Link só se o passo tiver template cadastrado.

## 16. Testes conversacionais

Vitest: objeção Caucaia/80, memória R$89, variação de resposta, aceite, escalonamento. Playwright: laboratório envia “tá caro / 80” e não inventa desconto.

## 17. Exemplos reais do laboratório (esta execução, mock)

Conversa nova no Playwright, modelo `dev_mock_llm`, latência 24–35 ms, 0 tokens (sem OpenAI):

1. Cliente: “Quero internet em Caucaia.”  
   Tools: `update_customer_fact`, `search_eligible_offers`.  
   Intent BUY / MEDIUM.  
   Resposta: “Fibra 500 Mega Residencial, 500 Mega, R$ 99,90 no valor da oferta vigente. Wi-Fi 6, Instalação inclusa. Faz sentido pra você?”

2. Cliente: “Rapaz, tá caro. A outra aqui é 80.”  
   Tools: `register_objection`, `get_objection_context`.  
   Intent OBJECTION / MEDIUM. Strategy `CLARIFY_COMPARISON`. Sem escalonamento.  
   Resposta: “Quero entender a comparação que você está fazendo antes de insistir no plano. Isso que você citou é só internet ou tem mais serviço no valor?”  
   Nenhum desconto inventado.

## 18–19. Latência e tokens

Gravados em `CommercialDecision` e `AIExecution` (`latencyMs`, tokens, `estimatedCostUsd`). Sem OpenAI real aqui: custo estimado 0 no mock; latência local típica de dezenas de ms.

## 20–24. Quality gates (esta revisão)

- lint: passou
- typecheck: passou
- unit + conversation tests: 40 passaram
- e2e Playwright: 9 passaram
- build: passou

## 25. Limitações

- Sem chave OpenAI o vendedor é mock contextual (ainda sem frase fixa de “caro”, mas não é o modelo de produção).
- Classificação de intent no backend é auxiliar por regex/heurística; o utility model entra quando a API estiver ligada.
- Viabilidade “AVAILABLE” só para cidades da base interna autorizada; senão MANUAL_CHECK_REQUIRED.
- Cross-sell é oportunidade do Offer Engine; o modelo decide se menciona.
- Tenant ainda é o default do seed.

## 26. Configurações que você ainda precisa fornecer

- `OPENAI_API_KEY` e `AI_SALES_MODEL=gpt-5.6-luna`
- Preços por milhão de tokens em `ModelPrice` (custo estimado)
- API oficial de viabilidade, se existir
- Campos obrigatórios por produto além de fibra
- Regras de consentimento (texto legal)
- Templates/links reais de pós-venda (a IA não inventa URL)
- Playbooks de objeção aprovados (argumentos permitidos, não frases ao cliente)
- Política de quando exigir viabilidade positiva vs. checagem manual antes da pré-venda

**Ads (Meta/Google) não foi implementado.** Parada neste marco.
