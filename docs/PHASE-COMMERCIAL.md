# Fase comercial end-to-end

O `AI_SALES_MODEL` é o vendedor. O backend só afirma o que é verdade e o que é permitido.

Não há árvore de decisão de frases. ObjectionEngine, Discovery e Intent devolvem contexto e flags. O modelo redige.

Ver o relatório desta fase no README e no commit.

## Peças

| Peça | Onde |
| --- | --- |
| Modelos / effort | `src/lib/ai-models.ts` + `.env` |
| Prompt vendedor | `Prompt` slug `sales_system` + fallback no orquestrador |
| Contexto comercial | `src/commercial/context.ts` |
| ObjectionEngine | `src/commercial/objection-engine.ts` |
| Discovery | `src/commercial/discovery.ts` |
| Intent + strategy labels | `src/commercial/intent.ts` |
| ComplexityRouter | `src/commercial/complexity-router.ts` |
| Tools | `src/ai/tools.ts` |
| Offer Engine | `src/offer-engine/` |
| Viabilidade | `src/integrations/viability/provider.ts` |
| Pré-venda / fila | `src/domain/presale.ts`, claim atômico |
| Workflow | `src/domain/workflow.ts` |
| PII / CPF | `src/lib/cpf.ts`, `src/lib/pii.ts` |
| Laboratório | `/conversas` + `/api/conversations/:id/lab` |
