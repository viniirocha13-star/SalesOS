# Arquitetura da Luna

A Luna é o modelo **utility** (resumo, extração auxiliar). O vendedor principal é o **Terra**; o **Sol** assume só negociação difícil. **Preço, promoção, cobertura, prazo, documentação e condição comercial não vêm do prompt** — vêm do Book ACTIVE, do Offer Engine e das ferramentas.

Trocar o book no mês seguinte não exige reprogramar a Luna. O prompt só define personalidade e comportamento.

## Pipeline

```
mensagem
  → contexto + memória operacional
  → extrator semântico estruturado
  → regras comerciais determinísticas
  → consulta Book / ferramentas (quando o LLM decidir)
  → next_best_action
  → geração da resposta (claim validator)
```

O cérebro da conversa **não** é uma árvore de perguntas. Cada turno atualiza o `SalesConversationState` e a Luna decide a próxima ação com base nesse estado.

## Sales Conversation State

Persistido em `ConversationMemory.commercialState` e espelhado em `CustomerFact` / campos do lead:

| Campo | Papel |
| --- | --- |
| intent | compra, objeção, preço, handoff… |
| cidade | extraída mesmo com typo (`maranguap` → Maranguape) |
| produto_interesse | chip, internet, combo, plano |
| internet_interesse | `false` em “só chip” |
| portabilidade / operadora_atual | TIM/Claro/Vivo + quer/não quer portar |
| quantidade_linhas / perfil_cliente | casal, família, N linhas |
| oferta_interesse | oferta que o cliente apontou |
| objections | categorias (PRECO, VAI_PENSAR, …) |
| qualification_status | unqualified → accepted |
| missing_fields | só o que ainda falta |
| next_best_action | ação comercial, não um script de fala |
| handoff_required / handoff_reason | só regra explícita |
| refused_products | não empurrar de novo |

Exemplo: `Maranguape só chip` → cidade=Maranguape, produto=chip, internet_interesse=false. A cidade **não** é perguntada de novo.

## Separação de responsabilidades

| Camada | Decide |
| --- | --- |
| Extrator (`src/sales/semantic-extractor.ts`) | Fatos da mensagem (typo, áudio transcrito, várias infos) |
| NBA (`src/sales/next-best-action.ts`) | Próxima ação comercial |
| Offer Engine + Book | Preço, elegibilidade, cidade no book |
| Tools (`src/ai/tools.ts`) | Fonte autorizada de fato |
| LLM | Como falar; quando chamar tool |
| Claim validator | Bloqueia afirmação fora das ofertas apresentadas |

## Ferramentas

O LLM escolhe quando consultar:

- ofertas vigentes (`search_eligible_offers` / `get_current_offers`)
- book (`get_book_commercial` / `get_product_knowledge`)
- disponibilidade por cidade (`check_city_availability`)
- produtos (`search_products`)
- portabilidade (`get_portability_info`)
- documentação (`get_documentation_requirements` / `get_required_customer_fields`)
- viabilidade (`check_viability`: geocode → API oficial Brisanet se houver credencial; senão fila para o operador olhar a caixa. Sem scraping.)
- dados do lead (`get_collected_lead_data` / `get_sales_conversation_state`)
- status da venda (`get_sale_status`)
- objeções/FAQ (`get_objection_context`, `register_objection`, `get_faq`)

Se Maranguape não estiver no book vigente, a ferramenta devolve `available: false` e as cidades autorizadas. A Luna informa isso **sem inventar cobertura e sem pausar** a conversa.

## Conversa

- WhatsApp curto, uma pergunta por vez
- Sem questionário
- Sem repetir apresentação
- Sem repetir o que o cliente acabou de dizer como se fosse novidade
- Recusa explícita de produto = não empurrar
- Cross-sell só com contexto (ex.: casal + chip, book tem combo elegível)

## Objeções

Categorias tratadas em contexto (fatos do book, não texto decorado):

está caro · vou pensar · já tenho internet · não quero portabilidade · qual vantagem? · tem fidelidade? · só quero chip · vou falar com marido/esposa · depois eu vejo

## Handoff

A IA **não** pausa só porque o cliente respondeu. Também não pausa por falha transitória do LLM (recupera e segue).

Handoff somente se:

1. o cliente pediu humano
2. o operador clicou **Assumir conversa**
3. regra explícita (reclamação sensível, exceção comercial, informação realmente insolúvel)
4. **Devolver para Luna** reativa a IA e preserva memória

Todo handoff grava `handoff_reason` (enum + notes).

## Memória

- Operacional: últimas mensagens + state
- Persistente: resumo + `commercialState` (retenção/PII iguais ao restante do CRM)
- Cliente que volta: NBA `resume_memory`

## O que o prompt NÃO contém

Lista de preços, cidades do mês, benefícios de oferta, prazos de portabilidade. Isso muda com o book. O prompt da Luna é personalidade + comportamento.
