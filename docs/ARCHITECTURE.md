# Brisa Sales AI — Arquitetura (Fase 1)

## 1. Objetivo

Plataforma de aquisição, atendimento, venda consultiva, handoff e inteligência comercial para serviços Brisanet via WhatsApp. A IA **nunca inventa** preço, cobertura, prazo ou benefício: só usa ofertas **APROVADAS** e vigentes e conhecimento **aprovado**.

## 2. Camadas

```
UI (Next.js App Router)     → telas desktop-first, RBAC
API (Route Handlers)        → autenticação, rate limit, auditoria
Domain                      → leads, ofertas, pré-venda, pipeline
AI                          → SalesAgent + tools (sem mutar preço)
Offer Engine                 → regras determinísticas + ranking
Integrations                → WhatsApp, Viabilidade, LLM (interfaces)
Workers / Events            → DomainEvent + bus in-process (Fase 1)
Database                    → PostgreSQL + Prisma
```

Integrações externas ainda indisponíveis usam **provider mock identificado** (`DevMock*`), nunca um mock disfarçado de produção.

## 3. Pipeline do lead

```
NOVO → EM_ATENDIMENTO_IA → QUALIFICANDO → CONSULTANDO_VIABILIDADE
  → OFERTA_APRESENTADA → NEGOCIANDO → ACEITE_COMERCIAL → COLETANDO_DADOS
  → PRONTO_PARA_LANCAMENTO → EM_LANCAMENTO
      ├→ CADASTRO_APROVADO → CONTRATO → DOCUMENTACAO → AGUARDANDO_INSTALACAO → INSTALADO
      ├→ PENDENCIA (volta ao cliente com o texto do operador)
      └→ PERDIDO (REPROVADO ou desistência)
```

Toda mudança grava `LeadStatusHistory`. Conversão final **não** é mensagem: a cadeia obrigatória é `Campaign → Lead → PreSale → Sale → Installation`.

## 4. Eventos de domínio

| Evento | Quando |
|---|---|
| `LEAD_CREATED` | lead entra (ads, QR, simulador, link) |
| `MESSAGE_RECEIVED` | inbound WhatsApp ou simulador |
| `VIABILITY_CHECKED` | resultado de `ViabilityProvider` |
| `OFFER_PRESENTED` | oferta aprovada apresentada |
| `CUSTOMER_ACCEPTED` | aceite comercial explícito |
| `PRE_SALE_CREATED` | pré-venda na fila |
| `SALE_REGISTERED` | operador marca APROVADO |
| `CONTRACT_PENDING` | etapa pós-cadastro |
| `SALE_INSTALLED` | instalação concluída |

## 5. Providers

- `LlmProvider` — OpenAI (se `OPENAI_API_KEY`) ou `DevMockLlmProvider`
- `WhatsAppProvider` — Cloud API oficial + `DevMockWhatsAppProvider` (simulador)
- `ViabilityProvider` — `InternalAuthorizedViabilityProvider` / `ManualOperatorViabilityProvider` (sem scraping, sem senha de colaborador)
- `OfferExtractor` — CSV/XLSX estruturado; PDF via texto + LLM; imagens reservadas na arquitetura do book

## 6. Segurança (LGPD / privacy by design)

- HTTPS em trânsito (TLS do host); cookies de sessão httpOnly
- Segredos só em variáveis de ambiente (`.env.example` sem valores reais)
- RBAC: ADMIN, SUPERVISOR, OPERADOR, ANALISTA
- Auditoria de ações sensíveis (aprovar oferta, lançar venda, exportar, excluir)
- Logs sem PII completo (máscara de telefone/CPF)
- Rate limit em webhooks e login
- Consentimento registrado antes de coleta cadastral
- Retenção configurável (`RetentionPolicy`)
- Exportação/exclusão de titular (ADMIN)

## 7. Árvore de diretórios

```
prisma/                 schema + seed + migrations
docs/                   arquitetura
src/app/                UI + API
src/components/         layout, ui (shadcn)
src/domain/             regras de negócio
src/ai/                 SalesAgent, tools, RAG
src/offer-engine/       seleção determinística
src/integrations/       whatsapp, viability, llm
src/events/             tipos + bus
src/lib/                prisma, auth, rbac, audit, pii
uploads/                books originais (gitignored)
```

## 8. Fases

1. **Fase 1 (este repositório):** auth, CRM, book/ofertas, knowledge, simulador, offer engine, pré-venda, fila, dashboard.
2. **Fase 2:** WhatsApp Cloud API real, webhooks, handoff, viabilidade oficial, retorno automático.
3. **Fase 3:** atribuição Meta/Google, Supervisor IA avançado, mapa de demanda, pós-venda.

O lançamento corporativo futuro entra como `CorporateOrderProvider` sem acoplar o domínio ao WhatsApp.
