"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function ResolveViabilityButton({
  checkId,
  result,
  label,
}: {
  checkId: string;
  result: "VIAVEL" | "NAO_VIAVEL";
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant={result === "VIAVEL" ? "default" : "outline"}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/viability/${checkId}/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result }),
        });
        setBusy(false);
        router.refresh();
      }}
    >
      {label}
    </Button>
  );
}
