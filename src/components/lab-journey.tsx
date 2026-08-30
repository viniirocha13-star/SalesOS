"use client";

export const LAB_JOURNEY = [
  { id: "ask", label: "1. Pedir internet", text: "Quero internet em Fortaleza." },
  { id: "accept", label: "2. Aceitar o plano", text: "Tá bom, pode fazer." },
  { id: "name", label: "3. Nome", text: "Maria Helena Costa" },
  { id: "cpf", label: "4. CPF", text: "529.982.247-25" },
  { id: "address", label: "5. Endereço", text: "Rua das Flores, 120, Centro" },
  { id: "cep", label: "6. CEP", text: "61600-000" },
] as const;

export function LabJourney({
  disabled,
  onPick,
}: {
  disabled?: boolean;
  onPick: (text: string) => void;
}) {
  return (
    <div className="shrink-0 border-t border-[#efe6d9] px-4 py-2">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-ink/40 uppercase">Roteiro de teste</p>
      <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto pb-1">
        {LAB_JOURNEY.map((step) => (
          <button
            key={step.id}
            type="button"
            data-testid={`lab-step-${step.id}`}
            disabled={disabled}
            title={step.text}
            onClick={() => onPick(step.text)}
            className="shrink-0 rounded-full border border-[#efe6d9] bg-white px-3 py-1.5 text-xs font-medium text-ink hover:border-teal disabled:opacity-40"
          >
            {step.label}
          </button>
        ))}
      </div>
    </div>
  );
}
