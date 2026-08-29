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
| Preview Cursor “not responding” | ver secção abaixo — não reiniciar em loop |
| Porta ocupada ao subir WEB | não matar PIDs desconhecidos; abrir `/api/health` e `/login` |
| WORKER OFFLINE no Diagnóstico | `npm run dev:worker`; Redis; heartbeat `ops:worker:heartbeat` |

## Preview do Cursor não responde, mas app está online

O proxy/Preview do Cursor pode falhar enquanto o Next está saudável. **Não** mate a porta nem reinicie em ciclo para “consertar o Preview”.

1. Verificar `GET http://127.0.0.1:43147/api/health` — `status: "ok"`, `web: "up"`. Não exige OpenAI nem Meta.
2. Abrir direto no navegador: `http://127.0.0.1:43147/login`
3. Confirmar o processo WEB: `npm run dev:web` ou `npm run start:web` (PID conhecido).
4. Confirmar o processo WORKER: `npm run dev:worker`. Em Administração → Diagnóstico: WEB / WORKER / REDIS. OpenAI e WhatsApp podem ser `NOT_CONFIGURED` sem o app estar offline.
5. Só reiniciar o Next se o health check falhar. Pare pelo PID do processo que você iniciou.

Scripts: `npm run dev:web`, `npm run dev:worker`, `npm run dev` (os dois em processos independentes via concurrently).
