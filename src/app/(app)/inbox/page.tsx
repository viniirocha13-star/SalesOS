import { InboxClient } from "@/components/inbox-client";
import { PageHeader } from "@/components/page-header";

export default function InboxPage() {
  return (
    <div>
      <PageHeader
        kicker="WhatsApp"
        title="Inbox WhatsApp"
        description="IA e humano nunca respondem ao mesmo tempo. Assumir pausa a IA imediatamente."
        titleTestId="heading-inbox"
      />
      <InboxClient />
    </div>
  );
}
