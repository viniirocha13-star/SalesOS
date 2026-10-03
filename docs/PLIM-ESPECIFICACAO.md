# PLIM AUTOMAÇÃO — Especificação do produto

Marca: **PLIM PROMOS**. Aplicação: **PLIM AUTOMAÇÃO** — plataforma de automação para operação de afiliados (código e identidade próprios, sem cópia de outras plataformas).

## Resumo tecnológico

- Frontend: Next.js, React, TypeScript, Tailwind
- Backend: API Routes / Server Actions, Node.js
- Banco: PostgreSQL (Prisma), multi-tenant por `Tenant`
- Fila: Redis + BullMQ (`src/lib/queue`, cron `GET /api/cron/queue`)
- Storage: `StorageProvider` (local / Supabase)
- Auth: NextAuth v5 credenciais + RBAC PLIM (ADMIN, OPERADOR, VISUALIZADOR)
- Deploy: Vercel (web + cron) + Railway (worker) — ver `docs/DEPLOYMENT.md`

## Menu (22 itens)

Visão Geral, Ofertas, Rotas, Piloto Automático, Agendamentos, Grupos e Canais, WhatsApp, Telegram, Instagram, Afiliados, Conversor de Links, Editor de Ofertas, Biblioteca de Imagens, Filas, Comissões, Cliques, Resultados, Contatos, Exclusões, Histórico, Integrações, Configurações.

Rotas PLIM: prefixo `/plim/...`. Book Sales OS: `/ofertas`.

## Etapas de entrega

1. **Fundação** (esta entrega): estrutura, login, banco, dashboard, configurações, PWA, seed DEMO
2. Ofertas, conversor, links, tracking
3. Grupos, rotas, filas, agendamento
4. Integrações
5. IA texto/imagem
6. Analytics, comissões, resultados
7. Testes, segurança, deploy

## Regras transversais

- Nenhum botão sem função (implementado ou **EM BREVE**)
- Sem tokens no frontend; validação zod; rate limit reutilizado
- Modo teste: nenhuma publicação real
- Sem técnicas proibidas (burlar bloqueio, simular humano, fingerprint invasivo)

## Domínio funcional (detalhamento)

### Dashboard

Cards: ofertas (capturadas/publicadas/aguardando/rejeitadas), canais (WhatsApp/Telegram/Instagram/grupos), desempenho (cliques), comissões (períodos e marketplaces), automações (rotas, pilotos, fila, falhas). Gráficos: comissões/dia, cliques/dia, publicações por canal.

### Ofertas

Campos: produto, descrição, imagem, preços, desconto, cupom, marketplace, links, categoria, tags, origem, status (Nova → Publicada / Ignorada / Erro).

### Entrada e colagem

Colagem manual, link, CSV, API, webhook, feed autorizado; identificação automática na colagem.

### Conversor e afiliados

Um adaptador por marketplace (Shopee, Mercado Livre, Amazon, Magalu, AliExpress, SHEIN, Awin).

### Tracking

Encurtador `/o/:id`, clique + redirecionamento; sub-id por grupo quando suportado.

### Grupos, rotas, piloto, fila, agendamento

Conforme spec operacional (filtros, duplicidade, intervalos, templates).

### Publicação

WhatsApp Cloud API, Telegram Bot, Instagram Meta — apenas APIs oficiais.

### Analytics e comissões

Resultados, CTR, ROAS, importação CSV/API, mapas campanha ↔ grupo ↔ comissão.

### Configurações

Geral, Marca, Afiliados, WhatsApp, Telegram, Instagram, IA, Tracking, Usuários.

### Segurança e status global

Indicador SISTEMA OPERACIONAL / ATENÇÃO via `/api/health` (subsistemas).

---

Documento de arquitetura e convenções de código: `docs/ARQUITETURA.md`.
