/**
 * Traduz erros da Graph API para mensagens acionáveis ao cliente.
 * Preserva código/subcódigo/fbtrace internamente.
 */

export type MetaErrorInfo = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
  error_user_title?: string;
  error_user_msg?: string;
};

export class MetaApiError extends Error {
  httpStatus?: number;
  code?: number;
  subcode?: number;
  type?: string;
  fbtraceId?: string;
  providerMessage?: string;
  temporary: boolean;

  constructor(
    message: string,
    meta: {
      httpStatus?: number;
      code?: number;
      subcode?: number;
      type?: string;
      fbtraceId?: string;
      providerMessage?: string;
    } = {},
  ) {
    super(message);
    this.name = "MetaApiError";
    this.httpStatus = meta.httpStatus;
    this.code = meta.code;
    this.subcode = meta.subcode;
    this.type = meta.type;
    this.fbtraceId = meta.fbtraceId;
    this.providerMessage = meta.providerMessage;
    this.temporary = isTemporaryMetaError(meta.code, meta.httpStatus);
  }
}

const CODE_MESSAGES: Record<number, string> = {
  190: "A autorização com a Meta expirou ou foi revogada. Reconecte a conta.",
  10: "Permissão insuficiente na conta Meta. Reconecte concedendo todos os escopos pedidos.",
  100: "Parâmetros inválidos na chamada à Meta. Verifique o template e o número.",
  33: "Objeto não encontrado na Meta (WABA ou número). Sincronize novamente.",
  4: "Limite temporário da API Meta. O sistema reduzirá a velocidade automaticamente.",
  80007: "Limite de taxa do WhatsApp atingido. Tentaremos de novo em breve.",
  130429: "Throughput excedido. A campanha continua com velocidade reduzida.",
  131026: "Mensagem não entregue: número indisponível ou sem WhatsApp.",
  131047: "Janela de atendimento encerrada. Use um template aprovado.",
  131051: "Tipo de mensagem não suportado para este destinatário.",
  131053: "Mídia inválida ou inacessível.",
  132000: "Número de parâmetros do template não confere.",
  132001: "Template não existe neste idioma/WABA.",
  132005: "Template pausado pela Meta.",
  132007: "Template rejeitado pela Meta.",
  132012: "Formato de parâmetro do template inválido.",
  132015: "Template desabilitado temporariamente por qualidade.",
  132016: "Template desabilitado permanentemente.",
  133010: "Número ainda não registrado na Cloud API.",
};

export function translateMetaError(err: MetaErrorInfo): string {
  if (err.error_user_msg) return err.error_user_msg;
  if (err.error_user_title && err.message) return `${err.error_user_title}: ${err.message}`;
  if (err.code && CODE_MESSAGES[err.code]) return CODE_MESSAGES[err.code];
  if (err.message?.includes("(#132001)")) return CODE_MESSAGES[132001];
  return err.message
    ? `Não foi possível concluir a ação na Meta: ${err.message}`
    : "Não foi possível concluir a ação na Meta.";
}

export function isTemporaryMetaError(code?: number, httpStatus?: number): boolean {
  if (httpStatus === 429 || httpStatus === 503 || httpStatus === 500) return true;
  return code === 4 || code === 80007 || code === 130429 || code === 131016;
}

export function isPermanentSendFailure(code?: number): boolean {
  if (!code) return false;
  return [131026, 131047, 132000, 132001, 132005, 132007, 132012, 132015, 132016, 133010].includes(code);
}
