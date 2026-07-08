import type { DocumentTemplateContext } from "./types.js";

export type DocumentVariable = {
  contexts: readonly DocumentTemplateContext[];
  key: string;
  label: string;
  sample: string;
  token: string;
  type: "currency" | "date" | "datetime" | "number" | "text";
};

export const documentVariableCatalog = [
  variable("store.name", "Loja", "{{store.name}}", "Loja Exemplo Veiculos", [
    "store",
  ]),
  variable(
    "store.document",
    "CNPJ da loja",
    "{{store.document}}",
    "00.000.000/0000-00",
    ["store"],
  ),
  variable(
    "store.address",
    "Endereco da loja",
    "{{store.address}}",
    "Rua das Flores, 123 - Centro",
    ["store"],
  ),
  variable(
    "store.cityState",
    "Cidade/UF da loja",
    "{{store.cityState}}",
    "Sao Paulo/SP",
    ["store"],
  ),
  variable(
    "store.phone",
    "Telefone da loja",
    "{{store.phone}}",
    "(11) 99999-9999",
    ["store"],
  ),
  variable("buyer.name", "Comprador", "{{buyer.name}}", "Ana Cliente", [
    "sale",
    "reservation",
    "customer",
  ]),
  variable(
    "buyer.document",
    "Documento do comprador",
    "{{buyer.document}}",
    "123.456.789-00",
    ["sale", "reservation", "customer"],
  ),
  variable(
    "buyer.address",
    "Endereco do comprador",
    "{{buyer.address}}",
    "Av. Brasil, 1000",
    ["sale", "customer"],
  ),
  variable("driver.name", "Condutor", "{{driver.name}}", "Pedro Condutor", [
    "test_drive",
  ]),
  variable(
    "driver.document",
    "CPF do condutor",
    "{{driver.document}}",
    "111.222.333-44",
    ["test_drive"],
  ),
  variable(
    "vehicle.title",
    "Veiculo",
    "{{vehicle.title}}",
    "Fiat Toro Volcano 2023",
    ["vehicle"],
  ),
  variable("vehicle.plate", "Placa", "{{vehicle.plate}}", "ABC1D23", [
    "vehicle",
  ]),
  variable("vehicle.renavam", "Renavam", "{{vehicle.renavam}}", "12345678901", [
    "vehicle",
  ]),
  variable(
    "vehicle.chassis",
    "Chassi",
    "{{vehicle.chassis}}",
    "9BD00000000000000",
    ["vehicle"],
  ),
  variable(
    "vehicle.km",
    "Quilometragem",
    "{{vehicle.km}}",
    "42.000 km",
    ["vehicle"],
    "number",
  ),
  variable("vehicle.color", "Cor", "{{vehicle.color}}", "Prata", ["vehicle"]),
  variable(
    "finance.salePrice",
    "Valor da venda",
    "{{finance.salePrice}}",
    "R$ 126.900,00",
    ["finance", "sale"],
    "currency",
  ),
  variable(
    "finance.signalAmount",
    "Valor do sinal",
    "{{finance.signalAmount}}",
    "R$ 5.000,00",
    ["finance", "reservation"],
    "currency",
  ),
  variable(
    "finance.paymentMethod",
    "Forma de pagamento",
    "{{finance.paymentMethod}}",
    "PIX",
    ["finance"],
  ),
  variable(
    "document.number",
    "Numero do documento",
    "{{document.number}}",
    "2048",
    ["store", "fiscal", "report"],
  ),
  variable(
    "document.issuedAt",
    "Data de emissao",
    "{{document.issuedAt}}",
    "24/06/2026 13:40",
    ["store", "fiscal", "report"],
    "datetime",
  ),
] as const satisfies readonly DocumentVariable[];

export function variablesForContext(context: DocumentTemplateContext) {
  return documentVariableCatalog.filter(
    (item) =>
      item.contexts.includes(context) ||
      item.contexts.includes("store") ||
      (context === "sale" && item.contexts.includes("vehicle")) ||
      (context === "reservation" && item.contexts.includes("vehicle")),
  );
}

export function sampleValue(token: string) {
  return (
    documentVariableCatalog.find((item) => item.token === token)?.sample ??
    "Valor preenchido na emissao"
  );
}

export function interpolateSampleVariables(value: string) {
  return documentVariableCatalog.reduce(
    (current, item) => current.replaceAll(item.token, item.sample),
    value,
  );
}

function variable(
  key: string,
  label: string,
  token: string,
  sample: string,
  contexts: readonly DocumentTemplateContext[],
  type: DocumentVariable["type"] = "text",
): DocumentVariable {
  const normalizedContexts = contexts.includes("store")
    ? contexts
    : (["store", ...contexts] as const);
  return { contexts: normalizedContexts, key, label, sample, token, type };
}
