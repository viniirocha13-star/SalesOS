"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function ClaimButton({ preSaleId }: { preSaleId: string }) {
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        await fetch(`/api/operation/${preSaleId}/claim`, { method: "POST" });
        router.refresh();
      }}
    >
      Assumir
    </Button>
  );
}
