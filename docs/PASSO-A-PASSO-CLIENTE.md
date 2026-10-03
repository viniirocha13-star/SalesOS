# Passo a passo — para quem adquiriu o SaaS

Guia do cliente. Você **não** precisa usar Postman, Baserow, n8n, SSH, VPS ou Docker.
Tudo acontece no painel.

---

## Visão rápida

```text
1. Criar conta
2. Criar empresa (workspace)
3. Conectar Meta (Embedded Signup)
4. Conectar número do WhatsApp Business
5. Importar contatos autorizados
6. Criar lista / segmento
7. Sincronizar ou criar template
8. Criar e enviar campanha
9. Receber status (enviado / entregue / lido / falha)
10. Ver respostas, opt-outs e métricas
```

O próprio painel mostra esse checklist em **Começar** (`/onboarding`) e na barra lateral
enquanto houver passos pendentes.

---

## Passo 1 — Criar conta

1. Abra `/register`.
2. Informe nome, e-mail e senha.
3. Confirme o e-mail se a política da instalação exigir (no MVP o acesso é imediato).
4. Você será levado ao onboarding da empresa.

Credenciais ficam só no backend. Nunca compartilhe sua senha com a equipe de suporte
sem canal seguro.

---

## Passo 2 — Criar empresa

1. Em `/onboarding`, digite o **nome da empresa**.
2. Opcional: razão social, CNPJ, site, telefone.
3. A plataforma cria o workspace isolado (`organization_id`).
4. Você vira **Proprietário (OWNER)** automaticamente.

Cada empresa tem dados, tokens Meta, contatos, templates e faturamento separados.
Se você gerencia mais de uma empresa, use o seletor no topo da sidebar.

---

## Passo 3 — Conectar Meta

1. Vá em **Configurações → Integração Meta** (`/settings/meta`).
2. Clique em **Conectar Meta**.
3. Autorize no fluxo oficial (Embedded Signup) da Meta:
   - selecionar Business Portfolio;
   - selecionar ou criar WhatsApp Business Account (WABA);
   - selecionar ou cadastrar o número;
   - conceder as permissões pedidas.
4. O backend recebe automaticamente:
   - Business ID
   - WABA ID
   - Phone Number ID
   - Access Token (criptografado no vault — **nunca** aparece no browser)

**Não copie IDs manualmente.** Se o fluxo oficial exigir alguma confirmação extra,
a tela mostra o estado (ex.: *Número pendente*, *Token expirado*, *Requer ação*).

Botões úteis depois:

- **Sincronizar** — atualiza WABA, números e qualidade
- **Reconectar** — renova autorização
- **Diagnosticar conexão** — verifica token, webhook e número

---

## Passo 4 — Conectar / registrar número

1. Na mesma tela Meta, escolha o número desejado.
2. Se a Meta pedir verificação:
   - **Enviar código** → digite o código recebido no WhatsApp → **Confirmar**
3. Marque o número como padrão para campanhas.
4. Estados possíveis: *Descoberto*, *Registro necessário*, *Verificação pendente*,
   *Conectando*, *Conectado*, *Erro*.

Qualidade do número e limite de mensagens vêm da plataforma Meta e são só informativos.

---

## Passo 5 — Importar contatos autorizados

1. Abra **Contatos → Importar** (`/contacts/import`).
2. Envie CSV ou XLSX.
3. Mapeie colunas (Nome, Telefone, E-mail, Tag, Cidade, Estado, Origem).
4. A plataforma:
   - normaliza telefone para E.164 (ex.: `+5585999999999`);
   - valida formatos;
   - detecta duplicados;
   - mostra totais: encontrados / válidos / inválidos / duplicados / novos.
5. **Confirme** que sua empresa tem autorização adequada para aquela lista
   (LGPD / consentimento). Sem essa confirmação a importação não conclui.
6. Opcionalmente associe a uma lista e registre a origem do consentimento
   (landing, formulário, CRM, evento, importação autorizada, etc.).

Não use listas extraídas de grupos de terceiros sem autorização.

---

## Passo 6 — Listas e segmentos

1. Em **Listas** (`/lists`), crie uma lista **estática** (membros fixos) ou
   **dinâmica** (filtro: tag, origem, última interação, cidade, status, opt-out).
2. Exemplo de segmento dinâmico:

```text
Tag = cliente
E última interação > 30 dias
E opted_out_at IS NULL
```

---

## Passo 7 — Templates

1. Em **Templates** (`/templates`), clique em **Sincronizar com a Meta**.
2. Templates aprovados na WABA aparecem com categoria oficial:
   - **Marketing** — promoções, ofertas, reengajamento
   - **Utilidade** — pedidos, atualizações transacionais
   - **Autenticação** — códigos OTP
3. Para criar novo: **Templates → Novo** — editor com preview estilo WhatsApp,
   variáveis `{{1}}`, `{{2}}`, exemplos e validador local antes do envio à Meta.
4. A tela mostra: categoria solicitada, categoria atual, status Meta e motivo
   (quando disponível). Se houver recategorização legítima, use **Solicitar revisão**
   quando a API oficial permitir.

A plataforma **não** classifica marketing como utilidade para reduzir custo.

---

## Passo 8 — Criar e enviar campanha

1. **Campanhas → Nova** (`/campaigns/new`).
2. Wizard:
   1. Nome
   2. Número
   3. Público (lista)
   4. Template
   5. Variáveis
   6. Horário (agora ou agendado)
   7. Revisão (quantidade, opt-outs, sem consentimento, **custo estimado**)
   8. Envio
3. O custo é **estimativa** a partir de tarifas configuráveis (mercado + categoria).
   Não é preço fixo inventado.
4. Após iniciar: status `QUEUING` → `RUNNING`. Você pode **Pausar** ou **Cancelar**.

Envios vão para a fila (Redis/BullMQ). Não há “disparar milhares numa única tela”.

---

## Passo 9 — Status e respostas

- Status de mensagem (enviado, entregue, lido, falha) chegam pelo webhook Meta
  e atualizam a campanha e cada destinatário.
- Respostas abrem/atualizam a conversa em **Conversas** (`/conversations`).
- Janela de atendimento (regra vigente da Meta, tipicamente 24h):
  - aberta → mensagem livre permitida;
  - encerrada → use template aprovado.
- Opt-out automático se o contato enviar: `SAIR`, `PARAR`, `CANCELAR`, `STOP`.
  Esse contato deixa de receber campanhas.

---

## Passo 10 — Métricas

Em **Visão geral** (`/analytics`):

| Indicador     | Exemplos de uso        |
|---------------|------------------------|
| Enviadas hoje | volume operacional     |
| Entregues     | saúde do canal         |
| Lidas         | engajamento            |
| Respostas     | conversão / atendimento|
| Falhas        | diagnosticar templates |
| Opt-outs      | qualidade da lista     |

Ranking de campanhas com mais respostas e templates com maior leitura.

---

## O que você **não** precisa fazer

| Antigo (curso / setup manual) | No SaaS                          |
|-------------------------------|----------------------------------|
| Postman                       | Backend + botões do painel       |
| Baserow / planilha ENVIADO    | Contatos + destinatários         |
| n8n no centro do envio        | Workers internos (n8n opcional)  |
| SSH / VPS / Docker            | Infra gerenciada pelo provedor   |
| Copiar Phone Number ID        | Sync automático após Meta        |
| Token em texto puro           | CredentialVault criptografado    |

---

## Problemas? Diagnóstico

Em **Configurações → Diagnóstico** (`/settings/diagnostics`) rode as verificações:

- Meta conectada? Token válido? WABA acessível?
- Número disponível? Webhook configurado? Template aprovado?
- Último webhook recebido? Worker ativo? Redis e banco ok?

Resultado no formato: *10 verificações · 9 OK · 1 requer atenção*, com orientação
clara (sem códigos crús tipo “Erro 400”).

---

## Equipe e planos

- Convide a equipe em **Configurações → Equipe** com perfis:
  Proprietário, Admin, Operador, Analista, Suporte.
- Suporte **não** vê tokens/credenciais.
- Plano e limites em **Configurações → Cobrança**: mensalidade do SaaS é
  **separada** dos custos de mensagem cobrados pela Meta.

---

## Pronto para operar

Você concluiu o onboarding quando conseguir, sozinho:

```text
Entrar → conectar Meta → selecionar empresa → conectar WhatsApp
→ importar lista autorizada → escolher template
→ enviar ou agendar campanha → ver resultados → receber respostas
```

Esse é o mesmo critério de “pronto” comercial do produto.
