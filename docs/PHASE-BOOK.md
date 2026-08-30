# Fase Book — base de conhecimento comercial

O book é o cérebro de produto. O Offer Engine escolhe o que é elegível. O `AI_SALES_MODEL` só conversa.

## Arquivo

`fixtures/books/Ofertas_Brisanet_Fortaleza__CE_.xlsx` (cópia em `public/samples/`).

O Excel original da operação não estava no repositório; a fixture replica o layout Fortaleza/CE (todas as abas, colunas e diferenças de streaming/preço/canal/aquisição).

## Pipeline

XLSX → parser determinístico (todas as abas) → normalização → IA só auxilia campo complexo → validação → `REVIEW_REQUIRED` → aprovação/ativação → indexação `ProductKnowledge` → Offer Engine + retrieval.

Sem fine-tuning. Book novo: upload → processar → revisar → ativar. O ACTIVE anterior vira `EXPIRED`.

## Números da fixture (parser)

- Abas: FIBRA, COMBO, MOVEL, FWA
- Linhas: todas as linhas das 4 abas (incluindo a linha inválida sem plano/preço)
- Categorias: FIBRA, COMBO, MOVEL, FWA (normalização extensível)
- Validações: `plano_sem_nome`, `preco_ausente`, canal, vigência, streaming, duplicidade exata por fingerprint (plano+preço+período+streaming+canal+aquisição+vigência+nível)

## Schema

`BookStatus`, `AcquisitionType`, campos estruturados em `Offer` (preços em centavos, vigência, combo, FWA GB, streaming JSON, launch_codes, canal, nível), `ProductKnowledge`.

## Offer Engine

Consulta só book `ACTIVE` + oferta `APROVADA` + vigência + cidade + canal (`SalesChannelEligibilityService`) + aquisição + categoria. FWA só com regra. Sem mapeamento inventado pessoas→velocidade.

## Tools

`search_products`, `get_product_knowledge`, `compare_products`. `get_offer_details` nunca devolve código de lançamento (`toCustomerOffer`).

## Explorer

`/conhecimento` — perguntas só no book ACTIVE.

## Claims

`CommercialClaimValidator` no orquestrador: preço, velocidade, streaming, apps, código operacional, consumo zero, regra caseira de pessoas.

## RBAC

`view_launch_codes` — códigos só na tela de lançamento do operador.

## Qualidade desta fase

`npm run lint` · `npm run typecheck` · `npm run test` · `npm run build`
