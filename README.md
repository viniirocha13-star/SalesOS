# Sales OS — plataforma comercial WhatsApp + IA

CRM operacional multi-tenant (primeiro uso: telecom). A IA conversa; o backend é a fonte de verdade comercial.

Documentação em `docs/`: ARCHITECTURE, DATABASE, WHATSAPP, AI, SECURITY, DEPLOYMENT, ENVIRONMENT, RUNBOOK.

## Porta e URL reais

A porta de desenvolvimento é **uma só**, via `APP_PORT` (veja `.env.example`):

```
APP_PORT=43147
APP_URL=http://127.0.0.1:43147
```

Abra o sistema **fora do Preview do Cursor**:

**http://127.0.0.1:43147/login**

Health (não depende de OpenAI nem Meta):

**http://127.0.0.1:43147/api/health**

Diagnóstico (admin autenticado): **Administração → Diagnóstico** (`/admin/diagnostico`).

## Processos (WEB e WORKER separados)

O worker **não** sobe no boot do Next. `START_WORKER_IN_NEXT` deve permanecer vazio.

```bash
cp .env.example .env
# Postgres + Redis (docker compose up -d) ou serviços locais
npx prisma migrate dev
npx prisma db seed

# Só o Next
npm run dev:web

# Só o worker (heartbeat no Redis)
npm run dev:worker
# alias: npm run worker

# Os dois, em processos independentes (concurrently)
npm run dev
```

Produção local:

```bash
npm run build
npm run start:web   # ou npm run start
npm run worker
```

Se a porta estiver ocupada, o script **mostra erro e sai**. Não mata processos automaticamente.

Login seed: `ursula.b@example.com` / `Brisa@2026`

Outros usuários seed (mesma senha): `rachel.c@example.org` (supervisor), `zoe.m@example.net` e `tina.r@example.net` (operadores), `samuel.w@example.com` (analista).

- Books e upload do book vigente `/ofertas#upload-book` (CSV/XLSX/PDF → aprovar oferta)
- Inbox `/inbox`
- Agora (operador) `/home`
- Laboratório `/conversas` — roteiro de teste até o cliente enviar nome, CPF, endereço e CEP; o card aparece em Tarefas (`/home`)
- Integrações `/admin/integracoes`
- Diagnóstico `/admin/diagnostico`
- Pós-venda `/pos-venda`

WhatsApp real: preencha as variáveis Meta no `.env` e aponte o webhook para `/api/whatsapp/webhook`. Sem chave OpenAI o laboratório usa `DevMockLlmProvider` (identificado na UI).

Qualidade: `npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e`

O E2E Playwright reutiliza o servidor já no ar (`reuseExistingServer`) na porta `APP_PORT`. Relatório da auditoria do núcleo: `docs/AUDIT.md`. Fase WhatsApp + OpenAI: `docs/PHASE-WHATSAPP.md` e `docs/WHATSAPP.md`. Fase comercial: `docs/PHASE-COMMERCIAL.md`. Pós-venda: `docs/PHASE-POSTSALE.md`.

Modelos só via env: `AI_SALES_MODEL`, `AI_COMPLEX_MODEL`, `AI_UTILITY_MODEL`. Sem `OPENAI_API_KEY` o vendedor usa mock de desenvolvimento (não inventa desconto).

## Cursor Preview vs Application Health

O Preview do Cursor é só visualização/proxy. **Não** é health check da aplicação.

**Fonte de verdade da aplicação:** `GET /api/health`, HTTP de `/login`, processos WEB e WORKER, banco/Redis quando aplicável.

Se `/api/health` = 200, `status=ok` e `/login` = 200 → **APP_STATUS = HEALTHY**.

Mesmo que o Cursor mostre “Preview not responding”:

- registrar só `CURSOR_PREVIEW_UNAVAILABLE`;
- **não** matar o Next, **não** liberar a porta `43147`, **não** reiniciar WEB/WORKER;
- **não** alterar login, Auth.js, Inbox nem abrir investigação funcional;
- reabrir `http://127.0.0.1:43147/login` no navegador ou só reemitir o Preview, sem tocar no servidor.

É proibido o loop: Preview falhou → kill Next → restart → Preview falhou → kill.

`NOT_CONFIGURED` (OpenAI/WhatsApp) **não** é app offline.

### CredentialsSignin esperado em teste de senha inválida

O log `[auth][error] CredentialsSignin` **não** é falha automática.

Se o teste usa senha errada e a UI mostra “E-mail ou senha inválidos.” → **EXPECTED_AUTH_REJECTION**. Não “corrigir” Auth.js.

Investigar autenticação só se: credencial válida não entra; sessão não é criada; autenticado volta ao `/login`; `/login` ou callback Auth devolve 5xx; RBAC quebrado.
