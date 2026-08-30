export function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function headerKey(value: string) {
  return fold(value).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
