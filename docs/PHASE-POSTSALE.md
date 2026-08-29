# Pós-venda

Última fase operacional do funil comercial (antes de Ads, que permanece fora de escopo).

## O que entra

1. Aprovação do pedido (`APROVADO` na fila) inicia o workflow **Pós-venda padrão**.
2. `WAIT_OPERATOR` é satisfeito pela própria aprovação.
3. `SEND_MESSAGE` só envia o corpo de um `WhatsAppTemplate` com `status=APPROVED`. Sem template, notifica operação e **não inventa** texto nem URL.
4. Follow-up no Redis/worker: se o cliente não responder, tenta `sale_approved_followup` ou abre aviso operacional.
5. Tela **Pós-venda** (`/pos-venda`): execuções, follow-ups e avisos.

O ticker roda **só no processo WORKER** (`startPostSaleTicker`). O Next não agenda fila. Sem worker, o WEB pode continuar HEALTHY e a tela `/pos-venda` avisa WORKER offline.

## Fora desta fase

Meta Ads / Google Ads. Envio automático de template fora da janela 24h (continua bloqueado pela política existente).
