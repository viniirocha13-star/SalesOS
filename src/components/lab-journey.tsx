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
    <div className="border-t border-[#efe6d9] px-4 py-3">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-ink/40 uppercase">Roteiro de teste</p>
      <p className="mt-1 text-xs text-ink/50">
        Clique na ordem. A IA conduz até o aceite; depois o cliente envia os dados e o card aparece em Tarefas.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {LAB_JOURNEY.map((step) => (
          <button
            key={step.id}
            type="button"
            data-testid={`lab-step-${step.id}`}
            disabled={disabled}
            onClick={() => onPick(step.text)}
            className="rounded-full border border-[#efe6d9] bg-white px-3 py-1.5 text-left text-xs text-ink hover:border-teal disabled:opacity-40"
          >
            <span className="font-medium">{step.label}</span>
            <span className="mt-0.5 block max-w-[16rem] truncate text-ink/45">{step.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
