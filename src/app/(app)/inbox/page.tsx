import { InboxClient } from "@/components/inbox-client";

export default function InboxPage() {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold">Inbox WhatsApp</h1>
        <p className="text-sm text-zinc-500">IA e humano nunca respondem ao mesmo tempo. Assumir pausa a IA imediatamente.</p>
      </div>
      <InboxClient />
    </div>
  );
}
