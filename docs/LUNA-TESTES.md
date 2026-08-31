# Resultados dos testes da Luna

Suíte: `src/__tests__/luna-e2e.test.ts` + regressão existente.

Última execução local: **16 arquivos, 110 testes, todos verdes** (`npx vitest run` + `tsc --noEmit`).

## Caso obrigatório

| Turno | Cliente | Estado | NBA | Pausa? |
| --- | --- | --- | --- | --- |
| 1 | Oi quero contratar chip 5g | produto=chip | ask_city (qualifica) | não |
| 2 | Maranguape só chip | cidade=Maranguape, produto=chip, internet_interesse=false, recusa BL | consult_city_availability | não |

A cidade e o produto não voltam para `missing_fields`. Não há `handoff_required`.

## As 30+ conversas

1. Chip 5G + Maranguape só chip (obrigatório)
2. Plano casal + TIM + número de SP + Maranguape (mensagem densa)
3. Fora de ordem: cidade depois produto
4. Mudança de ideia: internet → só chip
5. Objeção “está caro”
6. “Vou pensar”
7. “Já tenho internet”
8. “Não quero portabilidade” + Claro
9. “Qual vantagem?”
10. “Tem fidelidade?”
11. “Só quero chip”
12. “Vou falar com meu marido”
13. “Depois eu vejo”
14. Typo `maranguap so chip`
15. Áudio transcrito ruidoso (Caucaia / Vivo / chip)
16. Mensagem curta: só cidade
17. “Pode ser” após cidade+produto (não pausa)
18. 2 linhas explícitas
19. Família “somos 4”
20. Quero portar número TIM
21. Combo fibra + chip
22. Pedido de atendente → handoff + `CLIENTE_SOLICITOU`
23. “Ok” não pausa a IA
24. Interrupção e retomada (`resume_memory`)
25. “Hoje pago 89”
26. Recusa de BL não pede produto de novo
27. Erro de português + várias infos
28. Cliente muda a cidade no meio
29. Esposa + sem portabilidade + Maranguape
30. Pergunta de preço ≠ handoff
31. “Tá caro demais” continua a venda
32. “Depois eu vejo” ≠ handoff
33. “Vou falar com minha esposa”
34. Não reperguntar cidade já conhecida

Os testes exercitam o extrator + next_best_action (cérebro comercial). Preços e regras do book **não** foram alterados.
