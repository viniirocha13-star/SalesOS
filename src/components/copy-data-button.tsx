"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CopyButton({ text }: { text: string }) {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        toast.success("Dados copiados");
      }}
    >
      COPIAR DADOS
    </Button>
  );
}
