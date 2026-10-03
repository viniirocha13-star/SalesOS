# PLIM AUTOMAÇÃO — Arquitetura (Etapa 1)

## Convenção de rotas

- Módulos PLIM usam prefixo **`/plim/...`** (ex.: `/plim`, `/plim/configuracoes`).
- O book de ofertas do Sales OS permanece em **`/ofertas`** (sem conflito de namespace).

## Camadas

| Camada | Local | Responsabilidade |
| --- | --- | --- |
| UI | `src/app/(app)/plim`, `src/components/plim` | Layout roxo, menu 22 itens, `EmBreve` |
| Server Actions | `src/app/(app)/plim/actions.ts` | Configurações com zod |
| Services | `src/lib/repositories/plim`, `src/lib/plim` | Métricas, settings, health |
| Providers | `src/lib/providers`, `src/lib/storage`, `src/lib/queue` | WhatsApp Meta, storage, fila BullMQ |
| Adapters | `src/lib/affiliates/*` | Um arquivo por marketplace |
| Worker | `src/workers` (existente) | Processamento assíncrono (cron stub Etapa 1) |

## Multi-tenant

- Workspace = modelo **`Tenant`** existente (`tenantId` em todas as tabelas `Plim*`).
- Repositories sempre filtram por `tenantId` obtido via `getPlimContext`.
- Perfis PLIM: `PlimProfile` em `User.plimProfile` com fallback retrocompatível em `resolvePlimProfile`.

## Migrations

- Novas tabelas apenas via migrations numeradas (ex.: `20261003183248_plim_foundation`).
- Não editar migrations antigas.
- `prisma/schema.sql` consolidado via `prisma migrate diff --from-empty --to-schema-datamodel`.

## Próximas etapas (sem conflito)

1. **Etapa 2** — ofertas reais, conversor, tracking `/o/:slug` em rotas novas sob `src/app/o` e repositories `plim-offers`.
2. **Etapa 3** — filas/rotas/agendamento: implementar `processBatch` no worker e tabelas de schedule.
3. **Etapa 4** — providers Telegram/Instagram reais substituem `noop`.
4. **Etapa 5** — `ImageProvider` / `AIProvider` reais.
5. **Etapa 6** — analytics e comissões importadas.

Cada etapa adiciona migration própria e estende interfaces sem quebrar contratos públicos (`/api/health` mantém campos legados).
