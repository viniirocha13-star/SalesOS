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
| Preview Cursor “not responding” | **Cursor Preview vs Application Health** — não reiniciar se HEALTHY |
| Porta 43147 em uso pelo WEB saudável | **não** matar nem “liberar” a porta |
| WORKER OFFLINE no Diagnóstico | `npm run dev:worker`; Redis; heartbeat `ops:worker:heartbeat` |
| `[auth][error] CredentialsSignin` + “E-mail ou senha inválidos.” | **EXPECTED_AUTH_REJECTION** — não corrigir |
| `/api/ready` 503 | Postgres ou Redis indisponível |
| ENV_VALIDATION_FAILED no boot | variável obrigatória ausente (nomes no log, sem valores) |
| Seed bloqueado em produção | esperado; use `npm run admin:create`, não o seed de demo |
| WORKER OFFLINE no Railway | serviço worker no ar? mesmo `REDIS_URL`? heartbeat `ops:worker:heartbeat` |

## Cursor Preview vs Application Health

Diagnóstico **definitivo** do ambiente de desenvolvimento.

| Camada | Fonte de verdade |
|---|---|
| Aplicação | `GET /api/health`, HTTP de `/login`, processo WEB, processo WORKER, banco/Redis |
| Preview do Cursor | Só proxy/visualização. Falha **não** significa Next fora do ar |

**APP_STATUS = HEALTHY** quando:

1. `GET /api/health` = 200 e `status=ok` (e `web=up`);
2. `/login` = 200.

Antes de **qualquer** restart: health → `/login` → processo WEB → worker. Só se a aplicação estiver **indisponível**. Nunca usar o cartão de Preview como health check.

Se HEALTHY e o Cursor mostrar “Preview not responding”:

1. Registrar `CURSOR_PREVIEW_UNAVAILABLE`.
2. Não matar o Next. Não liberar `43147`. Não reiniciar WEB nem WORKER.
3. Não modificar login, Auth.js, Inbox, worker ou código funcional.
4. Não iniciar investigação funcional.
5. Validação visual: `http://127.0.0.1:43147/login` no navegador externo, ou só reabrir o Preview.

**Anti-loop (proibido):** Preview falhou → kill Next → restart → Preview falhou → kill.

Aprovado e imutável por causa do Preview: login, dashboard, Inbox em colunas, tema claro, assumir/devolver IA, worker WhatsApp, smoke, e2e 9/9.

Scripts: `npm run dev:web`, `npm run dev:worker`, `npm run dev` (processos independentes).

## Railway

| Serviço | Comando |
|---|---|
| WEB | `npm run start:web` |
| WORKER | `npm run worker` |
| Migration | `npx prisma migrate deploy` (só no release do WEB) |
| Admin | `ADMIN_EMAIL ADMIN_NAME ADMIN_PASSWORD npm run admin:create` |

Health de produção: `https://<domínio>/api/health` e `/api/ready`. Preview do Cursor não conta.

Checklist: `docs/RAILWAY-CHECKLIST.md`.

## CredentialsSignin esperado em teste de senha inválida

`[auth][error] CredentialsSignin` no log, com UI “E-mail ou senha inválidos.”, é **EXPECTED_AUTH_REJECTION**. O teste de credencial inválida está correto. Não criar correção.

Investigar auth somente se: credencial válida não autentica; sessão não criada; usuário autenticado volta ao login; `/login` ou callback Auth retorna 5xx; RBAC quebrado.
