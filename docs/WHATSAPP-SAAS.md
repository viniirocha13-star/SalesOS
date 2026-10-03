# WhatsApp Business Platform — SaaS multiempresa (ZapTurbo)

Marca do produto na interface: **ZapTurbo — Automação Oficial para WhatsApp**.
O shell segue o modelo comercial (sidebar escura, dashboard com KPIs, Meta, campanhas,
ações rápidas e uso do plano). Guia do cliente: `docs/PASSO-A-PASSO-CLIENTE.md`.

Documento de arquitetura e plano de implementação do módulo SaaS de automação com a
WhatsApp Business Platform (Cloud API). Ele convive com o Sales OS existente no mesmo
repositório e reaproveita autenticação (Auth.js), Prisma/PostgreSQL, Redis/BullMQ,
o shell de interface e o worker.

Princípio: o cliente nunca precisa abrir Postman, Baserow, n8n, SSH, VPS ou Docker.
Identificadores da Meta (WABA ID, Phone Number ID, token) são descobertos e guardados
automaticamente pelo backend sempre que a API oficial permitir.

## 1. Arquitetura

| Camada | Implementação |
|---|---|
| Frontend + API | Next.js 16 (App Router) em `src/app` |
| Banco | PostgreSQL via Prisma (`prisma/schema.prisma`) |
| Fila / cache / rate limit | Redis + BullMQ (`src/workers/wa/*`) |
| Worker | Processo Node separado (`npm run worker`) |
| Scheduler | Ticker no worker para campanhas `SCHEDULED` |
| WhatsApp / Meta | Graph API (`src/integrations/meta/graph.ts`) |
| Webhook | `GET/POST /api/webhooks/meta` |
| Credenciais | `CredentialVault` AES-256-GCM (`src/lib/credential-vault.ts`) |
| Preços | `PricingService` com tarifas em banco (`src/wa/pricing.ts`) |
| n8n | Opcional, só via ação de automação `WEBHOOK` |

Fluxo de envio:

```text
Campanha (RUNNING)
  → job campaign.prepare  → cria campaign_recipients (filtra opt-out/consentimento/duplicados)
  → jobs message.send     → RateLimitService → Graph API /{phone_number_id}/messages
  → webhook statuses      → webhook_events (idempotente) → job webhook.process
  → messages / recipients / campanha / message_costs atualizados
```

## 2. Multi-tenancy

- `Organization` é a raiz. Toda tabela de dados de cliente tem `organizationId`.
- `OrganizationMember` liga `User` ↔ `Organization` com `OrgRole`
  (`OWNER`, `ADMIN`, `OPERATOR`, `ANALYST`, `SUPPORT`). `User.role = SUPER_ADMIN` é o
  dono da plataforma e ignora o RBAC de organização.
- A organização ativa vem do cookie `wa_org`, validado contra a associação do usuário
  (`src/lib/org.ts`). Sem associação → `/onboarding`.
- Toda consulta usa `where: { id, organizationId }`. Nunca só por `id`.
- Permissões são verificadas no backend (`requireOrg(permission)`), nunca só escondendo botões.

## 3. Schema (tabelas novas)

Modelos Prisma e tabelas (`@@map` em snake_case):

```text
Organization               organizations
OrganizationMember         organization_members
MetaConnection             meta_connections          (token criptografado, 1 por organização)
WhatsAppBusinessAccount    whatsapp_business_accounts
PhoneNumber                phone_numbers
Contact                    contacts                  (phone_e164 único por organização)
ContactConsent             contact_consents
ContactList                contact_lists             (STATIC ou DYNAMIC com filtro JSON)
ContactListMember          contact_list_members
Tag / ContactTag           tags / contact_tags
ContactImport              contact_imports           (resumo de cada importação + confirmação de autorização)
MessageTemplate            templates
WaCampaign                 campaigns
WaCampaignRecipient        campaign_recipients
WaMessage                  messages
WaConversation             conversations             (janela de atendimento)
WebhookEvent               webhook_events            (único em provider + provider_event_id)
PricingRate                pricing_rates             (tarifas por mercado/categoria, configuráveis)
MessageCost                message_costs
Plan / Subscription        plans / subscriptions
UsageRecord                usage_records
Automation / AutomationRun automations / automation_runs
SystemAlert                system_alerts
AuditLog (existente)       + coluna organizationId
```

Os modelos legados `Campaign`, `Message`, `Conversation`, `Consent` do Sales OS continuam
intactos; por isso os novos usam o prefixo `Wa` no nome do modelo Prisma.

## 4. Perfis (OrgRole)

| Permissão | OWNER | ADMIN | OPERATOR | ANALYST | SUPPORT |
|---|---|---|---|---|---|
| org.manage / team.manage / billing.manage | ✔ | ✔ (exceto billing) | | | |
| meta.manage (conectar, trocar número) | ✔ | ✔ | | | |
| contacts.write / templates.write / campaigns.write | ✔ | ✔ | ✔ | | |
| inbox.write | ✔ | ✔ | ✔ | | ✔ |
| *.view / analytics.view | ✔ | ✔ | ✔ | ✔ | ✔ (sem credenciais) |

Fonte: `src/lib/org-rbac.ts`.

## 5. Rotas de interface

```text
/register                       cadastro self-service (cria usuário)
/onboarding                     cria a organização e segue para /settings/meta
/analytics                      visão geral WhatsApp (cards, séries, rankings)
/contacts, /contacts/import     contatos e importação CSV/XLSX
/lists                          listas estáticas e segmentos dinâmicos
/templates, /templates/new      templates sincronizados + criador visual
/campaigns, /campaigns/new,
/campaigns/[id]                 wizard e acompanhamento
/conversations                  caixa de entrada WhatsApp (janela 24h, opt-out)
/automations                    gatilho → condição → ação
/settings                       dados da empresa
/settings/team                  equipe e perfis
/settings/meta                  conexão Meta, WABA, números, diagnóstico de conexão
/settings/billing               plano, uso e tarifas Meta configuráveis
/settings/diagnostics           verificações automáticas
```

`/dashboard` e `/inbox` continuam sendo as telas do Sales OS; a visão geral e a caixa de
entrada do módulo WhatsApp ficam em `/analytics` e `/conversations` para não colidir.

## 6. API interna

```text
POST   /api/auth/register
GET    /api/organizations/current
POST   /api/organizations                    cria organização (onboarding)
POST   /api/organizations/switch             troca organização ativa

POST   /api/meta/connect                     Embedded Signup (code) ou token manual
GET    /api/meta/accounts                    WABAs e números
POST   /api/meta/sync                        ressincroniza WABA/números/templates
POST   /api/meta/disconnect
GET    /api/meta/diagnose

GET    /api/phone-numbers
POST   /api/phone-numbers/register           register (PIN) / request_code / verify_code
POST   /api/phone-numbers/default

GET/POST /api/contacts
GET/PATCH/DELETE /api/contacts/[id]
POST   /api/contacts/import                  preview (dry_run) e importação
GET/POST /api/lists
GET/POST /api/tags

GET/POST /api/templates
POST   /api/templates/sync
POST   /api/templates/[id]/submit

GET/POST /api/campaigns
GET    /api/campaigns/[id]
POST   /api/campaigns/[id]/start | pause | resume | cancel
POST   /api/campaigns/estimate

GET    /api/messages
GET    /api/conversations
GET/POST /api/conversations/[id]/messages

GET/POST /api/automations
GET    /api/analytics/dashboard
GET    /api/diagnostics
GET/POST /api/pricing-rates
GET/POST /api/team

GET/POST /api/webhooks/meta                  público, assinatura X-Hub-Signature-256
```

## 7. Serviços

| Serviço | Arquivo | Função |
|---|---|---|
| CredentialVault | `src/lib/credential-vault.ts` | encrypt/decrypt/rotate/revoke/validate |
| MetaGraphClient | `src/integrations/meta/graph.ts` | chamadas oficiais à Graph API |
| MetaErrors | `src/integrations/meta/errors.ts` | tradução de erros e classificação temporário/permanente |
| MetaConnectionService | `src/wa/meta-connection.ts` | Embedded Signup, token manual, sync de ativos |
| PhoneNumberService | `src/wa/phone-numbers.ts` | register / request_code / verify_code |
| ContactService | `src/wa/contacts.ts`, `src/wa/contact-import.ts` | normalização, dedupe, consentimento |
| SegmentService | `src/wa/segments.ts` | filtros dinâmicos → Prisma where |
| TemplateService | `src/wa/templates.ts` | sync, validador local, submit |
| CampaignService | `src/wa/campaigns.ts` | ciclo de vida, estimativa, recipients |
| RateLimitService | `src/wa/rate-limit-service.ts` | taxa dinâmica por número com backoff em 130429/131056 |
| PricingService | `src/wa/pricing.ts` | tarifas configuráveis por mercado/categoria/data |
| OptOutService | `src/wa/opt-out.ts` | palavras-chave e revogação |
| AutomationEngine | `src/wa/automations.ts` | gatilho → condição → ação |
| PlanLimits | `src/wa/plan-limits.ts` | `checkPlanLimit()` antes de criar recursos |
| Diagnostics | `src/wa/diagnostics.ts` | verificações automáticas |

## 8. Workers e jobs

Fila BullMQ `wa-platform` (`src/workers/wa/queue.ts`):

```text
campaign.prepare    monta campaign_recipients e enfileira envios
message.send        envia 1 template (rate limit + retry 0s/30s/2min/10min; erros permanentes não repetem)
webhook.process     processa 1 webhook_event
template.sync       sincroniza templates de uma WABA
meta.sync           sincroniza WABA + números
campaign.tick       scheduler: inicia campanhas SCHEDULED vencidas e fecha campanhas concluídas
```

## 9. Variáveis de ambiente

```text
META_APP_ID                 app Meta da plataforma (Embedded Signup)
META_APP_SECRET             valida X-Hub-Signature-256 e troca de code por token
META_VERIFY_TOKEN           verificação GET do webhook
META_CONFIG_ID              configuration_id do Embedded Signup
META_GRAPH_VERSION          ex.: v21.0
NEXT_PUBLIC_META_APP_ID     exposto ao browser só para abrir o FB.login (não é segredo)
NEXT_PUBLIC_META_CONFIG_ID  idem
ENCRYPTION_KEY              chave do CredentialVault (32 bytes hex ou passphrase)
WA_SEND_RATE_DEFAULT        taxa inicial por número (msg/s)
WA_SEND_RATE_MAX            teto da taxa dinâmica
WA_SEND_CONCURRENCY         concorrência do worker de envio
TEST_MODE                   "1" só permite envio para números em TEST_MODE_ALLOWED_NUMBERS
TEST_MODE_ALLOWED_NUMBERS   lista E.164 separada por vírgula
```

## 10. Dependências externas

Tudo que exige ação fora do painel aparece na interface com o link oficial correspondente
(`src/wa/help-links.ts` + componente `ExternalHelp`). A tabela completa está em
`docs/PASSO-A-PASSO-CLIENTE.md`, seção "O que depende de você".

- Meta App com produto WhatsApp e Embedded Signup configurado (Tech Provider).
- Cada organização autoriza o app na sua própria conta — nenhum token da dona do SaaS é
  compartilhado entre clientes.
- Webhook público HTTPS apontando para `/api/webhooks/meta`.
- PostgreSQL, Redis, storage para arquivos (opcional), Sentry (opcional).
- Preços da Meta nunca entram no código: são linhas em `pricing_rates`.

## 11. Decisões conscientes

- Não existe mecanismo para fazer marketing parecer utilidade; a categoria é escolhida
  pelo usuário e a Meta pode recategorizar (a tela mostra `requestedCategory` vs `category`).
- Não existe extração de membros de grupos. Contatos entram por cadastro, importação com
  confirmação de autorização, formulários ou API.
- Importação exige confirmação explícita de base autorizada e registra `contact_consents`.
- Opt-out (`SAIR`, `PARAR`, `CANCELAR`, `STOP`, …) bloqueia novas campanhas imediatamente.
- Erros da Meta são traduzidos para o usuário, preservando código/subcódigo/fbtrace internamente.
