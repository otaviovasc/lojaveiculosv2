const FALLBACK_ISSUE_DATE = "2026-07-11";

const KIND_CONTENT = {
  delivery_term: {
    title: "Termo de entrega do veículo",
    subtitle: "Entrega e aceite",
    statement:
      "O comprador declara que recebeu o veículo identificado neste documento e conferiu suas condições aparentes, chaves e itens entregues.",
  },
  finance_receipt: {
    title: "Comprovante de pagamento",
    subtitle: "Recebimento financeiro",
    statement:
      "A loja declara o recebimento do pagamento descrito neste comprovante, vinculado à negociação do veículo identificado abaixo.",
  },
  inspection: {
    title: "Laudo cautelar",
    subtitle: "Identificação e vistoria",
    statement:
      "Este laudo consolida a identificação do veículo e o registro da vistoria associada, conforme os dados apresentados à loja.",
  },
  internal: {
    title: "Protocolo de atendimento",
    subtitle: "Controle documental da loja",
    statement:
      "Este protocolo registra o recebimento e o encaminhamento do documento descrito, para acompanhamento pela equipe responsável.",
  },
  power_of_attorney: {
    title: "Procuração para transferência",
    subtitle: "Representação veicular",
    statement:
      "O outorgante autoriza a prática dos atos necessários à regularização e à transferência do veículo identificado neste instrumento.",
  },
  reservation_receipt: {
    title: "Recibo de reserva",
    subtitle: "Confirmação de sinal",
    statement:
      "A loja confirma o recebimento do sinal de reserva referente ao veículo identificado, observadas as condições comerciais acordadas.",
  },
  sale_contract: {
    title: "Contrato de compra e venda",
    subtitle: "Negociação de veículo",
    statement:
      "Este instrumento registra os dados essenciais da negociação e a manifestação das partes sobre a compra e venda do veículo identificado.",
  },
  sale_receipt: {
    title: "Recibo de venda",
    subtitle: "Confirmação da negociação",
    statement:
      "A loja confirma a negociação do veículo identificado e o recebimento dos valores registrados nas condições comerciais acordadas.",
  },
};

export function buildSeedDocumentContent(document) {
  const metadata = asObject(document.metadata);
  const spec = KIND_CONTENT[document.kind] ?? {
    title: humanTitle(document.title) || "Documento da loja",
    subtitle: "Registro comercial",
    statement:
      "Este documento registra as informações comerciais apresentadas à loja para conferência das partes envolvidas.",
  };
  const storeName = humanText(document.storeName) || "Loja Teste";
  const person = firstText(metadata.buyerName, metadata.leadName);
  const vehicle = firstText(
    metadata.vehicleTitle,
    metadata.listingTitle,
    metadata.unitTitle,
  );
  const identifier = metadata.plate
    ? `Placa ${humanText(metadata.plate)}`
    : metadata.stockNumber
      ? `Estoque ${humanText(metadata.stockNumber)}`
      : undefined;
  const reference = firstText(
    metadata.financeTitle,
    metadata.saleTitle,
    metadata.documentCategory,
    metadata.reference,
  );
  const issueDateIso = normalizeIssueDate(document.issuedAt);
  const issueDate = formatIssueDate(issueDateIso);
  const fields = [
    person && { label: personFieldLabel(document.kind), value: person },
    vehicle && { label: "Veículo", value: vehicle },
    identifier && { label: "Identificação", value: identifier },
    reference && { label: "Referência", value: reference },
    metadata.method && {
      label: "Forma de pagamento",
      value: humanText(metadata.method),
    },
    typeof metadata.amountCents === "number" && {
      label: "Valor recebido",
      value: formatMoney(metadata.amountCents),
    },
    { label: "Situação", value: statusLabel(document.status) },
    { label: "Emissão", value: issueDate },
  ].filter(Boolean);
  const recordTitle = humanTitle(document.title);

  return {
    contactLine: buildContactLine(document),
    fields: fields.slice(0, 6),
    issueDate,
    issueDateIso,
    statement: spec.statement.replace("A loja", storeName),
    status: statusLabel(document.status),
    storeDocument: formatCnpj(document.storeDocumentNumber),
    storeName,
    subtitle:
      normalizeForComparison(recordTitle) === normalizeForComparison(spec.title)
        ? spec.subtitle
        : recordTitle || spec.subtitle,
    title: spec.title,
    signatures: signatureLabels(document.kind, person, storeName),
  };
}

function normalizeIssueDate(value) {
  const parsed = value instanceof Date ? value : new Date(value ?? "invalid");
  if (Number.isNaN(parsed.getTime())) return FALLBACK_ISSUE_DATE;
  return parsed.toISOString().slice(0, 10);
}

function formatIssueDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function buildContactLine(document) {
  const location = [document.storeAddressLine, document.storeCity]
    .map(humanText)
    .filter(Boolean)
    .join(", ");
  const state = humanText(document.storeState);
  return [
    location && `${location}${state ? ` - ${state}` : ""}`,
    formatPhone(document.storePhone),
  ]
    .map(humanText)
    .filter(Boolean)
    .join(" | ");
}

function formatMoney(amountCents) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  })
    .format(amountCents / 100)
    .replace(/\u00a0/g, " ");
}

function formatPhone(value) {
  const raw = humanText(value);
  const digits = raw.replace(/\D/g, "");
  const hasCountryCode = digits.startsWith("55") && digits.length >= 12;
  const local = hasCountryCode ? digits.slice(2) : digits;
  if (local.length !== 10 && local.length !== 11) return raw;
  const subscriber =
    local.length === 11
      ? `${local.slice(2, 7)}-${local.slice(7)}`
      : `${local.slice(2, 6)}-${local.slice(6)}`;
  return `${hasCountryCode ? "+55 " : ""}(${local.slice(0, 2)}) ${subscriber}`;
}

function formatCnpj(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length !== 14) return "";
  return `CNPJ ${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function signatureLabels(kind, person, storeName) {
  if (kind === "inspection")
    return ["Responsável pela vistoria", person || "Interessado(a)"];
  if (kind === "internal")
    return ["Responsável pelo protocolo", "Recebedor(a)"];
  return [storeName, person || "Cliente / comprador(a)"];
}

function personFieldLabel(kind) {
  return kind === "reservation_receipt"
    ? "Cliente da reserva"
    : "Cliente / comprador(a)";
}

function statusLabel(status) {
  return status === "signed"
    ? "Assinado"
    : status === "issued"
      ? "Emitido"
      : "Registrado";
}

function humanTitle(value) {
  const text = humanText(value);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function normalizeForComparison(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function firstText(...values) {
  return values.map(humanText).find(Boolean);
}

function humanText(value) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}
