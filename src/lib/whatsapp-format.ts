/** WhatsApp Cloud: negrito é *texto* (um asterisco). **markdown** aparece literal. */
export function toWhatsAppMarkup(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/__(.+?)__/g, "*$1*")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type WhatsAppRun = { text: string; bold?: boolean; italic?: boolean };

export function parseWhatsAppMarkup(text: string): WhatsAppRun[] {
  const runs: WhatsAppRun[] = [];
  const re = /(\*[^*\n]+\*|_[^_\n]+_)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) runs.push({ text: text.slice(last, match.index) });
    const token = match[0];
    if (token.startsWith("*")) runs.push({ text: token.slice(1, -1), bold: true });
    else runs.push({ text: token.slice(1, -1), italic: true });
    last = match.index + token.length;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs.length ? runs : [{ text }];
}
