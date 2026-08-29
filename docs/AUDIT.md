# Relatório de auditoria funcional — núcleo Sales OS

Escopo: o que já existe. Sem WhatsApp real, sem novas features grandes.

## A. Telas testadas

- `/login` — válido, inválido, hidratação, sem loop
- `/dashboard` — KPIs, funil, leads recentes
- `/leads` e `/leads/[id]` — lista, detalhe, edição, pipeline, histórico
- `/inbox` — lista, filtros, conversa, painel, atores IA/humano/sistema
- `/ofertas` e `/ofertas/[id]` — books, listagem, revisão
- `/operacao` e `/operacao/[id]` — fila e lançamento
- `/conversas` — laboratório (existe; não expandido)
- `/home` — “Agora”
- Middleware: `/leads` deslogado → `/login`
- ANALISTA → `/operacao` redireciona `?forbidden=1`; `PATCH /api/leads` → 403
- `GET /api/health` — db + redis

## B. Bugs encontrados

1. Login via server action **sem `"use server"`** — o form não autenticava; em GET nativo a senha ia para a query.
2. Fast Refresh / Turbopack **dev**: alguns `/_next/static/chunks/*` retornam **403 no Chromium** (script tag). SSR ok; hidratação falha. `curl` e `next start` ok.
3. Alert de erro de login colidia com `#__next-route-announcer__` (`role="alert"`).
4. “Histórico de status” era `div` (CardTitle), não heading.
5. Mensagens seed da Maria sem `actor` (OUTBOUND virava CUSTOMER).
6. Inbox/leads/ofertas/operação sem empty/loading/erro ou botão sem feedback.
7. Menu só no desktop.
8. Worker podia subir no processo Next (já evitado; confirmado).

## C. Bugs corrigidos

- Login com `signIn` do Auth.js no cliente, `method="post"`, botão só após hidratação.
- Logout por server action + botão “Sair”.
- RBAC no `middleware` + `canAccessPath` (não só UI).
- PATCH autenticado de lead + histórico de estágio.
- Offer Engine: `eligibility.ts` (expirada/rejeitada/draft/cidade).
- Inbox: loading, erro, empty, labels de ator.
- Feedback em salvar lead, import book, aprovar oferta, lançamento.
- Menu móvel.
- Seed: 2 operadores, 12+ leads, book, ofertas em vários status, pré-vendas, eventos, memória.
- Worker: singleton, Redis reutilizado, SIGTERM, docs WEB/WORKER.
- Playwright estável contra `npm run start`.

## D. Arquivos principais alterados

- `src/components/login-form.tsx`, `src/app/login/actions.ts`, `src/middleware.ts`, `src/lib/route-access.ts`
- `src/offer-engine/eligibility.ts`, `src/offer-engine/select.ts`
- `src/components/inbox-client.tsx`, `app-shell.tsx`, `lead-editor.tsx`
- `prisma/seed.ts`, `e2e/core.spec.ts`, `playwright.config.ts`
- `src/workers/queue.ts`, `docs/DEPLOYMENT.md`, `README.md`

## E. Testes adicionados

- `e2e/core.spec.ts`: login→dashboard; inválido; proteção; Books; Leads+Maria; Inbox+conversa
- `src/__tests__/offer-engine.test.ts` — elegibilidade
- `src/__tests__/offer-engine.db.test.ts` — seed no banco
- `src/__tests__/route-access.test.ts` — RBAC de URL

## F. Lint

`npm run lint` — **passou** (0 erros, 0 warnings).

## G. Typecheck

`npm run typecheck` — **passou**.

## H. Testes

- Vitest: **14 passed** (4 arquivos)
- Playwright: **6 passed**

## I. Build

`npm run build` — **passou** (Next 16.3.3). Aviso: convenção `middleware` → `proxy` (não bloqueia).

## J. Pendências (não implementar agora)

1. WhatsApp Cloud API real (HMAC, templates, janela 24h) — só mock/provider.
2. Laboratório IA: tela existe; sem E2E de tools/memória/não-inventar-oferta nesta rodada (mock LLM se não houver chave).
3. `tenantId` ainda **nullable** em User/Lead/Conversation — sem migration destrutiva.
4. Hidratação no `next dev` neste ambiente (403 em alguns chunks). Usar `npm run start` para E2E/UI completa.
5. Offer.book sem `onDelete` — apagar book pode falhar se houver ofertas (preserva histórico).
6. Automações / workflow engine / S3 de books — não no núcleo atual.
7. Aviso Prisma 7 `package.json#prisma` seed config.

## Banco (revisão, sem change destrutiva)

- Cascades corretos em mensagens, histórico, memória, handoff.
- Unique: `User.email`, `Message.waMessageId`, `WhatsAppInboundEvent.providerEventId`.
- Índices em phone, status, tenant, conversas.
- Enums estáveis; histórico de lead/stage **não** se apaga com update de status.
- Risco: `tenantId` opcional; `Offer.bookId` sem cascade (bom para não perder oferta).

## BullMQ / Redis

- Web **não** sobe worker (`START_WORKER_IN_NEXT` unset).
- Worker: `npm run worker` — processo separado, `globalThis` anti-duplicata, retry 5x, jobId por conversa (debounce/idempotência).
- App sobe sem worker (health redis true; fila cai em fallback memória se Redis falhar).
