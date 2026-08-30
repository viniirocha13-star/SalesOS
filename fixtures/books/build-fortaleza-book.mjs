import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const headers = [
  "Cidade",
  "Contratação",
  "Canal de Venda",
  "Categoria",
  "Oferta / Plano",
  "Nível",
  "Preço Promocional",
  "Preço De",
  "Mensalidade / Período",
  "Vigência de Comercialização",
  "Produtos Inclusos",
  "Apps Ilimitados",
  "Códigos de Lançamento",
  "Streaming Incluso",
  "Recursos / Detalhes",
];

const vig = "DE 28/08/2026 ATÉ 30/09/2026";
const period12 = (after) => `Por 12 meses, após R$ ${after}/mês`;

const fibra = [
  ["Fortaleza", "aquisicao", "todos", "FIBRA", "350 Mega", "", "R$ 84,90", "R$ 94,90", period12("94,90"), vig, "", "", "FIB350-FTZ-AQ", "Não", "Instalação e Wi-Fi inclusos"],
  ["Fortaleza", "aquisicao", "todos", "FIBRA", "500 Mega", "", "R$ 99,99", "R$ 119,89", period12("119,89"), vig, "Skeelo", "", "FIB500-FTZ", "Não", "Instalação e Wi-Fi inclusos"],
  ["Fortaleza", "aquisicao", "todos", "FIBRA", "500 Mega", "", "R$ 109,99", "R$ 129,89", period12("129,89"), vig, "Skeelo; Reforça", "", "FIB500-GP", "Globoplay Padrão com Anúncios", "Instalação e Wi-Fi inclusos"],
  ["Fortaleza", "aquisicao", "todos", "FIBRA", "500 Mega", "", "R$ 119,99", "R$ 139,89", period12("139,89"), vig, "Skeelo", "", "FIB500-SKY", "Sky+ Light com Amazon Prime", "Instalação e Wi-Fi inclusos"],
  ["Fortaleza", "aquisicao", "todos", "FIBRA", "700 Mega", "", "R$ 129,90", "R$ 149,90", period12("149,90"), vig, "Skeelo; Aya Books", "", "FIB700-FTZ", "Netflix Padrão com Anúncios", "Instalação e Wi-Fi inclusos"],
  ["Fortaleza", "aquisicao", "todos", "FIBRA", "1 Giga", "", "R$ 159,90", "R$ 179,90", period12("179,90"), vig, "Skeelo; EducaBolso", "", "FIB1G-FTZ", "Netflix Padrão com Anúncios", "Instalação e Wi-Fi inclusos"],
  ["Fortaleza", "aquisicao", "todos, exceto digital", "FIBRA", "500 Mega Parceiro", "", "R$ 89,90", "R$ 109,90", period12("109,90"), vig, "", "", "FIB500-NODIG", "Não", "Instalação e Wi-Fi inclusos"],
  ["Fortaleza", "fidelizacao", "todos", "FIBRA", "500 Mega", "Nível 1", "R$ 79,90", "R$ 99,90", period12("99,90"), vig, "", "", "FIB500-FID1", "Não", "Instalação e Wi-Fi inclusos"],
  ["Caucaia", "aquisicao", "todos", "FIBRA", "500 Mega", "", "R$ 99,90", "R$ 119,90", period12("119,90"), vig, "Skeelo", "", "FIB500-CAU", "Não", "Instalação e Wi-Fi inclusos; Wi-Fi 6"],
  ["Fortaleza", "aquisicao", "todos", "FIBRA", "", "", "", "", "", vig, "", "", "FIB-ERR", "Não", ""],
];

const combo = [
  ["Fortaleza", "aquisicao", "todos", "COMBO", "500 Mega + 20GB", "", "R$ 129,90", "R$ 149,90", period12("149,90"), vig, "Skeelo", "WhatsApp", "CMB500-20", "Não", "Instalação e Wi-Fi inclusos"],
  ["Fortaleza", "aquisicao", "todos", "COMBO", "700 Mega + 50GB", "", "R$ 159,90", "R$ 189,90", period12("189,90"), vig, "Skeelo", "WhatsApp; Facebook", "CMB700-50", "Netflix Padrão com Anúncios", "Instalação e Wi-Fi inclusos"],
];

const movel = [
  ["Fortaleza", "aquisicao", "todos", "MOVEL", "20GB", "", "R$ 49,90", "R$ 59,90", period12("59,90"), vig, "", "WhatsApp; Facebook; Waze", "MOV20", "Não", "Ligações e SMS ilimitados"],
  ["Fortaleza", "aquisicao", "todos", "MOVEL", "40GB", "", "R$ 59,90", "R$ 69,90", period12("69,90"), vig, "", "WhatsApp; Facebook; Waze", "MOV40", "Não", "Ligações e SMS ilimitados. 2GB de roaming"],
  ["Fortaleza", "aquisicao", "todos", "MOVEL", "100GB", "", "R$ 79,90", "R$ 89,90", period12("89,90"), vig, "", "WhatsApp; Facebook; Waze", "MOV100", "Não", "Ligações e SMS ilimitados"],
  ["Fortaleza", "aquisicao", "todos", "MOVEL", "150GB", "", "R$ 99,90", "R$ 109,90", period12("109,90"), vig, "", "WhatsApp", "MOV150", "Não", "Ligações e SMS ilimitados"],
];

const fwa = [
  ["Fortaleza", "aquisicao", "todos", "FWA", "350GB", "", "R$ 89,90", "R$ 99,90", period12("99,90"), vig, "", "", "FWA350", "Não", "Internet de qualidade sem cabos. Aparelho em comodato"],
  ["Fortaleza", "aquisicao", "todos", "FWA", "500GB", "Nível 1", "R$ 99,90", "R$ 119,90", period12("119,90"), vig, "", "", "FWA500-N1", "Não", "Internet de qualidade sem cabos. Aparelho em comodato"],
  ["Fortaleza", "fidelizacao", "todos", "FWA", "700GB", "Nível 2", "R$ 109,90", "R$ 129,90", period12("129,90"), vig, "", "", "FWA700-N2", "Não", "Internet de qualidade sem cabos. Aparelho em comodato"],
  ["Fortaleza", "aquisicao", "todos", "FWA", "1TB", "", "R$ 139,90", "R$ 159,90", period12("159,90"), vig, "", "", "FWA1TB", "Não", "Internet de qualidade sem cabos. Aparelho em comodato"],
];

function sheet(rows) {
  return XLSX.utils.aoa_to_sheet([headers, ...rows]);
}

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, sheet(fibra), "FIBRA");
XLSX.utils.book_append_sheet(wb, sheet(combo), "COMBO");
XLSX.utils.book_append_sheet(wb, sheet(movel), "MOVEL");
XLSX.utils.book_append_sheet(wb, sheet(fwa), "FWA");

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(here, { recursive: true });
const dest = join(here, "Ofertas_Brisanet_Fortaleza__CE_.xlsx");
writeFileSync(dest, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log("wrote", dest);
