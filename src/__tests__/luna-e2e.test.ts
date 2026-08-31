import { describe, expect, it } from "vitest";
import { applyExtractionToState, extractSalesFacts } from "@/sales/semantic-extractor";
import { EMPTY_SALES_STATE, type SalesConversationState } from "@/sales/conversation-state";
import { decideNextBestAction } from "@/sales/next-best-action";

type Turn = {
  user: string;
  expect?: Partial<SalesConversationState> & {
    no_reask?: string[];
    not_paused?: boolean;
    nba?: SalesConversationState["next_best_action"];
  };
};

function play(turns: Turn[], opts: { returning?: boolean } = {}) {
  let state: SalesConversationState = { ...EMPTY_SALES_STATE };
  const trace: SalesConversationState[] = [];
  for (const turn of turns) {
    state = applyExtractionToState(state, turn.user);
    const decided = decideNextBestAction(state, {
      customerAskedHuman: state.handoff_required,
      returningCustomer: opts.returning && Boolean(state.cidade || state.produto_interesse),
      cityAvailable: state.cidade ? null : undefined,
    });
    state = { ...state, ...decided, presented_greeting: true };
    if (turn.expect) {
      const e = turn.expect;
      if (e.cidade !== undefined) expect(state.cidade).toBe(e.cidade);
      if (e.produto_interesse !== undefined) expect(state.produto_interesse).toBe(e.produto_interesse);
      if (e.internet_interesse !== undefined) expect(state.internet_interesse).toBe(e.internet_interesse);
      if (e.portabilidade !== undefined) expect(state.portabilidade).toBe(e.portabilidade);
      if (e.operadora_atual !== undefined) expect(state.operadora_atual).toBe(e.operadora_atual);
      if (e.quantidade_linhas !== undefined) expect(state.quantidade_linhas).toBe(e.quantidade_linhas);
      if (e.perfil_cliente !== undefined) expect(state.perfil_cliente).toBe(e.perfil_cliente);
      if (e.ddd_origem !== undefined) expect(state.ddd_origem).toBe(e.ddd_origem);
      if (e.objections) expect(state.objections).toEqual(expect.arrayContaining(e.objections));
      if (e.refused_products) expect(state.refused_products).toEqual(expect.arrayContaining(e.refused_products));
      if (e.handoff_required !== undefined) expect(state.handoff_required).toBe(e.handoff_required);
      if (e.nba) expect(state.next_best_action).toBe(e.nba);
      if (e.not_paused) {
        expect(state.handoff_required).toBe(false);
        expect(state.next_best_action).not.toBe("handoff_human");
      }
      for (const key of e.no_reask ?? []) {
        expect(state.missing_fields).not.toContain(key);
      }
    }
    trace.push(state);
  }
  return { state, trace };
}

describe("Luna E2E — extração + NBA (30+ conversas)", () => {
  it("01 obrigatório: chip 5g → Maranguape só chip, sem pausar", () => {
    const { state } = play([
      {
        user: "Oi quero contratar chip 5g",
        expect: { produto_interesse: "chip", not_paused: true, nba: "ask_city" },
      },
      {
        user: "Maranguape só chip",
        expect: {
          cidade: "Maranguape",
          produto_interesse: "chip",
          internet_interesse: false,
          refused_products: ["internet"],
          objections: ["SO_QUERO_CHIP"],
          not_paused: true,
          no_reask: ["cidade", "produto_interesse"],
          nba: "consult_city_availability",
        },
      },
    ]);
    expect(state.handoff_reason).toBeNull();
  });

  it("02 mensagem densa: casal Tim SP Maranguape", () => {
    play([
      {
        user: "quero um plano pra mim e minha esposa, sou da Tim mas meu número é de SP e moro em Maranguape",
        expect: {
          cidade: "Maranguape",
          quantidade_linhas: 2,
          perfil_cliente: "casal",
          operadora_atual: "TIM",
          ddd_origem: "SP",
          produto_interesse: "plano",
          not_paused: true,
          no_reask: ["cidade", "operadora_atual", "quantidade_linhas"],
        },
      },
    ]);
  });

  it("03 fora de ordem: cidade primeiro, produto depois", () => {
    play([
      { user: "sou de Fortaleza", expect: { cidade: "Fortaleza", no_reask: ["cidade"] } },
      { user: "quero fibra", expect: { produto_interesse: "internet", no_reask: ["cidade", "produto_interesse"] } },
    ]);
  });

  it("04 muda de ideia: internet → só chip", () => {
    play([
      { user: "queria internet em Caucaia", expect: { cidade: "Caucaia", produto_interesse: "internet" } },
      {
        user: "na vdd so chip",
        expect: { produto_interesse: "chip", internet_interesse: false, refused_products: ["internet"] },
      },
    ]);
  });

  it("05 objeção está caro", () => {
    play([
      { user: "quero internet em Fortaleza" },
      { user: "está caro", expect: { objections: ["PRECO"], nba: "handle_objection", not_paused: true } },
    ]);
  });

  it("06 vou pensar", () => {
    play([{ user: "vou pensar", expect: { objections: ["VAI_PENSAR"], nba: "handle_objection" } }]);
  });

  it("07 já tenho internet", () => {
    play([{ user: "já tenho internet", expect: { objections: ["JA_POSSUI_INTERNET"] } }]);
  });

  it("08 não quero portabilidade", () => {
    play([
      {
        user: "não quero portabilidade, sou da Claro",
        expect: { portabilidade: false, operadora_atual: "Claro", objections: ["PORTABILIDADE"] },
      },
    ]);
  });

  it("09 qual vantagem?", () => {
    play([{ user: "qual vantagem?", expect: { objections: ["QUAL_VANTAGEM"], nba: "handle_objection" } }]);
  });

  it("10 tem fidelidade?", () => {
    play([{ user: "tem fidelidade?", expect: { objections: ["FIDELIDADE"] } }]);
  });

  it("11 só quero chip", () => {
    play([
      {
        user: "só quero chip",
        expect: { produto_interesse: "chip", internet_interesse: false, objections: ["SO_QUERO_CHIP"] },
      },
    ]);
  });

  it("12 vou falar com meu marido", () => {
    play([{ user: "vou falar com meu marido", expect: { objections: ["CONVERSAR_COM_FAMILIA"] } }]);
  });

  it("13 depois eu vejo", () => {
    play([{ user: "depois eu vejo", expect: { objections: ["DEPOIS_EU_VEJO"] } }]);
  });

  it("14 typo cidade + abreviação", () => {
    play([
      {
        user: "maranguap so chip pfv",
        expect: { cidade: "Maranguape", produto_interesse: "chip", internet_interesse: false, not_paused: true },
      },
    ]);
  });

  it("15 áudio transcrito ruidoso", () => {
    play([
      {
        user: "eh... quero o chip cinco ge, moro em caucaia, eh da vivo",
        expect: { cidade: "Caucaia", produto_interesse: "chip", operadora_atual: "Vivo" },
      },
    ]);
  });

  it("16 mensagem curta só cidade", () => {
    play([{ user: "Caucaia", expect: { cidade: "Caucaia", no_reask: ["cidade"] } }]);
  });

  it("17 mensagem curta ok / pode ser", () => {
    const { state } = play([
      { user: "Fortaleza internet" },
      { user: "pode ser" },
    ]);
    expect(state.cidade).toBe("Fortaleza");
    expect(state.handoff_required).toBe(false);
  });

  it("18 2 linhas explícitas", () => {
    play([{ user: "quero 2 linhas em Fortaleza", expect: { quantidade_linhas: 2, cidade: "Fortaleza" } }]);
  });

  it("19 família somos 4", () => {
    play([{ user: "somos 4 e queremos internet em Recife", expect: { quantidade_linhas: 4, cidade: "Recife" } }]);
  });

  it("20 quero portar número", () => {
    play([{ user: "quero portar meu número da Tim", expect: { portabilidade: true, operadora_atual: "TIM" } }]);
  });

  it("21 combo fibra + chip", () => {
    play([{ user: "quero combo fibra e chip em Fortaleza", expect: { produto_interesse: "combo", cidade: "Fortaleza" } }]);
  });

  it("22 cliente pede atendente → handoff com reason", () => {
    const { state } = play([
      { user: "quero internet" },
      { user: "me passa um atendente", expect: { handoff_required: true, nba: "handoff_human" } },
    ]);
    expect(state.handoff_reason).toBe("CLIENTE_SOLICITOU");
  });

  it("23 responder 'ok' não pausa", () => {
    play([
      { user: "oi" },
      { user: "ok", expect: { not_paused: true } },
    ]);
  });

  it("24 interrupção e retomada com memória", () => {
    const first = play([{ user: "chip em Maranguape, sou da Tim" }]);
    const resumed = applyExtractionToState(first.state, "voltei, ainda quero o chip");
    const decided = decideNextBestAction(resumed, { returningCustomer: true });
    expect(decided.next_best_action).toBe("resume_memory");
    expect(resumed.cidade).toBe("Maranguape");
    expect(resumed.operadora_atual).toBe("TIM");
    expect(decided.handoff_required).toBe(false);
  });

  it("25 pagamento atual 89", () => {
    play([{ user: "hoje pago 89 em Fortaleza", expect: { current_bill: "89", cidade: "Fortaleza" } }]);
  });

  it("26 sem interesse de BL depois de recusar", () => {
    const { state } = play([
      { user: "não quero internet, só chip em Mossoró" },
    ]);
    expect(state.refused_products).toContain("internet");
    expect(state.next_best_action).not.toBe("ask_product");
  });

  it("27 erro de português + várias infos", () => {
    play([
      {
        user: "moro em forteleza quero o chipe 5g pra eu e minhasposa sou da claro",
        expect: { cidade: "Fortaleza", produto_interesse: "chip", operadora_atual: "Claro" },
      },
    ]);
  });

  it("28 muda cidade no meio", () => {
    play([
      { user: "Caucaia" },
      { user: "na vdd moro em Fortaleza", expect: { cidade: "Fortaleza", no_reask: ["cidade"] } },
    ]);
  });

  it("29 esposa + sem portabilidade + Maranguape", () => {
    play([
      {
        user: "plano pra mim e minha esposa sem portabilidade moro em Maranguape",
        expect: {
          quantidade_linhas: 2,
          portabilidade: false,
          cidade: "Maranguape",
          not_paused: true,
        },
      },
    ]);
  });

  it("30 perguntar preço não dispara handoff", () => {
    play([{ user: "quanto fica o chip?", expect: { not_paused: true, intent: "price" as never } }]);
    expect(extractSalesFacts("quanto fica o chip?").intent).toBe("price");
  });

  it("31 reclamação de preço continua venda", () => {
    play([
      { user: "Fortaleza chip" },
      { user: "tá caro demais", expect: { not_paused: true, objections: ["PRECO"] } },
    ]);
  });

  it("32 depois eu vejo não é handoff", () => {
    play([{ user: "depois eu vejo", expect: { not_paused: true } }]);
  });

  it("33 vou falar com minha esposa", () => {
    play([{ user: "vou falar com minha esposa", expect: { objections: ["CONVERSAR_COM_FAMILIA"], not_paused: true } }]);
  });

  it("34 não reperguntar cidade já conhecida", () => {
    const { state } = play([
      { user: "Maranguape" },
      { user: "chip 5g" },
    ]);
    expect(state.missing_fields).not.toContain("cidade");
    expect(state.cidade).toBe("Maranguape");
  });
});
