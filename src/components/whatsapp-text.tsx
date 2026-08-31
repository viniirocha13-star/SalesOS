import { parseWhatsAppMarkup, toWhatsAppMarkup } from "@/lib/whatsapp-format";

export function WhatsAppText({ text }: { text: string }) {
  const runs = parseWhatsAppMarkup(toWhatsAppMarkup(text));
  return (
    <span className="whitespace-pre-wrap">
      {runs.map((run, i) => {
        if (run.bold) return <strong key={i}>{run.text}</strong>;
        if (run.italic) return <em key={i}>{run.text}</em>;
        return <span key={i}>{run.text}</span>;
      })}
    </span>
  );
}
