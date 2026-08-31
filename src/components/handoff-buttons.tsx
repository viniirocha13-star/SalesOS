"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function HandoffButton({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await fetch(`/api/conversations/${conversationId}/handoff`, { method: "POST" });
        router.refresh();
      }}
    >
      Assumir conversa
    </Button>
  );
}

export function ReturnToAiButton({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await fetch(`/api/conversations/${conversationId}/handoff`, { method: "DELETE" });
        router.refresh();
      }}
    >
      Devolver para Luna
    </Button>
  );
}
