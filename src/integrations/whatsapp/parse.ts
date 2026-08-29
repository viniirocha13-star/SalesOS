export type ParsedWhatsAppEvent = {
  providerEventId: string;
  kind: "message" | "status";
  from?: string;
  type: string;
  text?: string;
  timestamp?: string;
  wamid?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  status?: string;
  recipient?: string;
  errorCode?: string;
};

export function extractWhatsAppEvents(body: unknown): ParsedWhatsAppEvent[] {
  const out: ParsedWhatsAppEvent[] = [];
  if (!body || typeof body !== "object") return out;
  const root = body as {
    entry?: {
      id?: string;
      changes?: {
        value?: {
          messaging_product?: string;
          metadata?: { phone_number_id?: string };
          messages?: {
            id: string;
            from: string;
            type: string;
            timestamp?: string;
            text?: { body?: string };
            location?: { latitude: number; longitude: number };
          }[];
          statuses?: { id: string; status: string; recipient_id: string; errors?: { code?: number }[] }[];
        };
      }[];
    }[];
  };
  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const phoneNumberId = value.metadata?.phone_number_id;
      const businessAccountId = entry.id;
      for (const m of value.messages ?? []) {
        const text =
          m.text?.body ||
          (m.type === "location" && m.location
            ? `Localização: ${m.location.latitude},${m.location.longitude}`
            : undefined);
        out.push({
          providerEventId: m.id,
          kind: "message",
          from: m.from,
          type: m.type,
          text,
          timestamp: m.timestamp,
          wamid: m.id,
          phoneNumberId,
          businessAccountId,
        });
      }
      for (const s of value.statuses ?? []) {
        out.push({
          providerEventId: s.id,
          kind: "status",
          type: "status",
          status: s.status,
          recipient: s.recipient_id,
          wamid: s.id,
          phoneNumberId,
          businessAccountId,
          errorCode: s.errors?.[0]?.code ? String(s.errors[0].code) : undefined,
        });
      }
    }
  }
  return out;
}

export function sanitizeEventMetadata(event: ParsedWhatsAppEvent) {
  return {
    type: event.type,
    timestamp: event.timestamp,
    phoneNumberId: event.phoneNumberId,
    businessAccountId: event.businessAccountId,
    status: event.status,
    errorCode: event.errorCode,
  };
}
