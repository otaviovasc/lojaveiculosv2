import type { CrmLeadImportInput } from "./productCrmApi";

export type CrmCsvRow = {
  line: number;
  value: CrmLeadImportInput["rows"][number];
  errors: string[];
};
const aliases: Record<
  string,
  "buyerName" | "buyerPhone" | "buyerEmail" | "source"
> = {
  nome: "buyerName",
  name: "buyerName",
  cliente: "buyerName",
  buyername: "buyerName",
  telefone: "buyerPhone",
  celular: "buyerPhone",
  whatsapp: "buyerPhone",
  phone: "buyerPhone",
  buyerphone: "buyerPhone",
  email: "buyerEmail",
  buyeremail: "buyerEmail",
  origem: "source",
  source: "source",
};
const sources = new Set([
  "manual",
  "crm",
  "public_site",
  "external_api",
  "whatsapp",
  "instagram",
  "olx",
  "other",
]);

export function parseCrmLeadCsv(text: string): CrmCsvRow[] {
  if (text.length > 2_000_000) throw new Error("O CSV deve ter até 2 MB.");
  const source = text.replace(/^\uFEFF/, "");
  const records = readCsvRecords(source, detectDelimiter(source));
  const header = records.shift();
  if (!header) throw new Error("O arquivo está vazio.");
  const keys = header.cells.map((cell) => aliases[normalizeHeader(cell)]);
  const known = keys.filter(Boolean);
  if (new Set(known).size !== known.length)
    throw new Error(
      "Há colunas repetidas de nome, telefone, e-mail ou origem.",
    );
  if (
    !keys.includes("buyerName") ||
    (!keys.includes("buyerPhone") && !keys.includes("buyerEmail"))
  ) {
    throw new Error("Inclua a coluna nome e pelo menos telefone ou e-mail.");
  }
  if (!records.length) throw new Error("O arquivo não contém contatos.");
  if (records.length > 500)
    throw new Error("Importe no máximo 500 contatos por arquivo.");
  return records.map((record) => {
    const value: CrmCsvRow["value"] = {};
    for (const [index, key] of keys.entries()) {
      if (key && record.cells[index]?.trim())
        value[key] = record.cells[index]!.trim();
    }
    const errors: string[] = [];
    if (record.cells.length !== header.cells.length)
      errors.push("Quantidade de colunas diferente do cabeçalho.");
    if (!value.buyerName || value.buyerName.length > 191)
      errors.push("Informe um nome com até 191 caracteres.");
    if (!value.buyerPhone && !value.buyerEmail)
      errors.push("Informe telefone ou e-mail.");
    if (
      value.buyerPhone &&
      !/^\d{10,15}$/.test(value.buyerPhone.replace(/\D/g, ""))
    )
      errors.push("Telefone inválido.");
    if (
      value.buyerEmail &&
      (value.buyerEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.buyerEmail))
    )
      errors.push("E-mail inválido.");
    if (value.source && !sources.has(value.source))
      errors.push("Origem inválida.");
    return { line: record.line, value, errors };
  });
}
function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f\s_-]/g, "");
}
function detectDelimiter(value: string) {
  let quoted = false,
    commas = 0,
    semicolons = 0;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === '"') {
      if (quoted && value[index + 1] === '"') index++;
      else quoted = !quoted;
    }
    if (!quoted && (char === "\n" || char === "\r")) break;
    if (!quoted && char === ",") commas++;
    if (!quoted && char === ";") semicolons++;
  }
  return semicolons > commas ? ";" : ",";
}
function readCsvRecords(value: string, delimiter: string) {
  const records: Array<{ line: number; cells: string[] }> = [];
  let cells: string[] = [],
    cell = "",
    quoted = false,
    closedQuote = false,
    line = 1,
    rowLine = 1;
  const finishCell = () => {
    cells.push(cell);
    cell = "";
    closedQuote = false;
  };
  const finishRow = () => {
    finishCell();
    if (cells.some((v) => v.trim())) records.push({ line: rowLine, cells });
    cells = [];
    rowLine = line + 1;
  };
  for (let index = 0; index < value.length; index++) {
    const char = value[index]!;
    if (quoted) {
      if (char === '"') {
        if (value[index + 1] === '"') {
          cell += '"';
          index++;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        cell += char;
        if (char === "\n") line++;
      }
    } else if (char === delimiter) finishCell();
    else if (char === "\n" || char === "\r") {
      finishRow();
      if (char === "\r" && value[index + 1] === "\n") index++;
      line++;
    } else if (char === '"' && cell === "" && !closedQuote) quoted = true;
    else if (closedQuote || char === '"')
      throw new Error(`Aspas inválidas na linha ${line}.`);
    else cell += char;
  }
  if (quoted) throw new Error(`Aspas não fechadas na linha ${rowLine}.`);
  finishRow();
  return records;
}
