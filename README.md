# Brisa Sales AI

CRM de vendas assistidas por IA para serviços de telecomunicações da Brisanet. A Fase 1 entrega autenticação, pipeline de leads, book de ofertas com aprovação humana, base de conhecimento, Offer Engine, simulador do vendedor virtual, pré-venda e fila operacional de lançamento.

A IA **não inventa** preço, promoção, cobertura ou benefício. Só usa ofertas **APROVADAS** e vigentes.

Arquitetura: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Como rodar

Requisitos: Node 22, PostgreSQL.

```bash
cp .env.example .env
# ajuste DATABASE_URL e AUTH_SECRET
npx prisma migrate dev
npx prisma db seed
npm run dev
```

O app sobe em `http://localhost:43147`.

### Usuários de desenvolvimento

Senha de todos: `Brisa@2026`

| Perfil | E-mail |
|---|---|
| ADMIN | ursula.b@example.com |
| SUPERVISOR | rachel.c@example.org |
| OPERADOR | zoe.m@example.net |
| ANALISTA | samuel.w@example.com |

## O que está pronto (Fase 1)

- RBAC (ADMIN, SUPERVISOR, OPERADOR, ANALISTA) e auditoria
- CRM de leads com pipeline e UTMs
- Importação de Book (CSV / XLSX / PDF) sem publicação automática
- Revisão: aprovar, editar, rejeitar
- Knowledge base versionada + RAG simples
- SalesAgent com tools (ofertas, viabilidade, FAQ, objeção, pré-venda, handoff)
- Offer Engine determinístico
- Fila operacional com COPIAR DADOS e retorno APROVADO / PENDÊNCIA / REPROVADO
- Dashboard, mapa aproximado, Supervisor IA (insights com volume mínimo)

## Integrações

| Integração | Provider |
|---|---|
| LLM | OpenAI se `OPENAI_API_KEY`; senão `DevMockLlmProvider` (identificado no simulador) |
| WhatsApp | `DevMockWhatsAppProvider`; Cloud API oficial quando `WHATSAPP_PROVIDER=meta` |
| Viabilidade | Base interna autorizada ou consulta manual — **sem scraping** |
| ERP corporativo | Interface pronta; lançamento manual até existir API oficial |

Webhook WhatsApp (Fase 2): `GET/POST /api/whatsapp/webhook`

Captura de lead com UTM: `GET /api/leads/capture?phone=8599...&utm_source=facebook`

Book de exemplo: `/samples/book-ofertas-exemplo.csv`

## LGPD

Consentimento na pré-venda, minimização de dados, logs sem PII completo, RBAC, retenção configurável, secrets só no servidor. Não coloque tokens no frontend.
