/**
 * Regras oficiais da janela de atendimento WhatsApp Cloud API.
 * Valores administrativos podem ser ajustados sem hardcode de negócio da operadora.
 */
export function canSendFreeform(lastInboundAt?: Date | null) {
  const windowHours = Number(process.env.WHATSAPP_SESSION_WINDOW_HOURS ?? 24);
  if (!lastInboundAt) return { freeform: false, reason: "no_inbound" };
  const age = Date.now() - lastInboundAt.getTime();
  const freeform = age < windowHours * 60 * 60 * 1000;
  return { freeform, reason: freeform ? "in_window" : "window_expired" };
}

export function requiredTemplate(purpose: string) {
  return purpose;
}
