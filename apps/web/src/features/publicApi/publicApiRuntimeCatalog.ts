import {
  externalApiBasePath,
  externalApiRuntimeOperations,
  type ExternalApiAssignableScope,
} from "@lojaveiculosv2/shared";

export type PublicApiEndpoint = {
  description: string;
  errorSummary: string;
  method: "GET" | "PATCH" | "POST";
  operationId: string;
  path: string;
  requestSummary: readonly string[];
  responseExample: string;
  responseSummary: string;
  samplePath: string;
  scopes: ExternalApiAssignableScope[];
  title: string;
};

const endpointPresentation = {
  preflightExternalApiCredereSimulation: {
    description:
      "Confere prontidão e campos faltantes sem devolver dados pessoais do CPF consultado.",
    requestSummary: ["Body: document (CPF ou CNPJ do comprador)."],
    responseSummary: "data: prontidão, campos exigidos e bancos disponíveis",
    samplePath: "",
    title: "Pré-validar simulação Credere",
  },
  createExternalApiCredereSimulation: {
    description: "Cria uma simulação oficial e consentida no Credere.",
    requestSummary: [
      "Header: Idempotency-Key.",
      "Body: applicant, consent, terms e vehicle.",
    ],
    responseSummary: "data: consulta criada e referência oficial da simulação",
    samplePath: "",
    title: "Criar simulação Credere",
  },
  getExternalApiCredereSimulation: {
    description: "Consulta o retorno oficial e as condições dos bancos.",
    requestSummary: ["Path: inquiryId da simulação criada."],
    responseSummary: "data: situação e condições retornadas pelo Credere",
    samplePath: "",
    title: "Consultar simulação Credere",
  },
  listExternalApiVehicles: {
    description: "Lista veículos com um DTO público limpo.",
    requestSummary: ["Query: page, limit, offset, available, status e sort."],
    responseSummary: "data[] + pagination { page, limit, total, hasMore }",
    samplePath: "?available=true&limit=20",
    title: "Listar veículos",
  },
  searchExternalApiVehicles: {
    description:
      "Aceita busca, preço, ano, km, cor, combustível, câmbio e ordenação.",
    requestSummary: [
      "Query: q/search, preço, ano, km, cor, combustível, câmbio e sort.",
      "Paginação: page/limit ou offset/limit.",
    ],
    responseSummary: "data[] + pagination { page, limit, total, hasMore }",
    samplePath: "?q=toro&minPrice=100000&sort=price_asc",
    title: "Buscar veículos",
  },
  getExternalApiVehicle: {
    description:
      "Detalhe com mídia pública, histórico de preço e unidades seguras.",
    requestSummary: ["Path: listingId do veículo."],
    responseSummary: "data: veículo, mídia pública, cores, preço e unidades",
    samplePath: "",
    title: "Detalhe do veículo",
  },
  listExternalApiLeads: {
    description:
      "Busca leads por status, origem, telefone, texto e veículo; exige o módulo CRM ativo.",
    requestSummary: [
      "Query: q/search/phone, status, source, listingId, page e limit.",
    ],
    responseSummary: "data[] + pagination { page, limit, total, hasMore }",
    samplePath: "?status=new&limit=20",
    title: "Listar leads",
  },
  createExternalApiLead: {
    description:
      "Cria lead com CRM ativo por campos V2 ou aliases V1 name/email/phone/message/vehicleId.",
    requestSummary: [
      "Header: Idempotency-Key.",
      "Body: comprador, contato, mensagem e listingId/vehicleId.",
    ],
    responseSummary: "data: lead criado com comprador, origem e status",
    samplePath: "",
    title: "Criar lead",
  },
  getExternalApiLead: {
    description: "Leitura de um lead via chave escopada com CRM ativo.",
    requestSummary: ["Path: leadId retornado pela criação ou listagem."],
    responseSummary: "data: lead, comprador, veículo, origem e status",
    samplePath: "",
    title: "Detalhe do lead",
  },
  updateExternalApiLead: {
    description:
      "Atualiza o lead com CRM ativo e Idempotency-Key; repetições idênticas concluídas recebem a resposta original.",
    requestSummary: [
      "Header: Idempotency-Key.",
      "Path: leadId. Body: contato, mensagem, metadata pública (somente message/title) ou status.",
    ],
    responseSummary:
      "data: lead atualizado; repetição idêntica concluída repete status e body",
    samplePath: "",
    title: "Atualizar lead",
  },
} as const satisfies Record<
  (typeof externalApiRuntimeOperations)[number]["operationId"],
  {
    description: string;
    requestSummary: readonly string[];
    responseSummary: string;
    samplePath: string;
    title: string;
  }
>;

const responseExamples = {
  preflightExternalApiCredereSimulation:
    '{"data":{"applicant":{"knownLead":true,"missingFields":[],"requirements":{}},"readiness":{"configured":true,"mappedStoreAlias":"Loja Centro","usableBanks":[]}}}',
  createExternalApiCredereSimulation:
    '{"data":{"inquiryId":"inquiry_123","status":"submitted"}}',
  getExternalApiCredereSimulation:
    '{"data":{"inquiryId":"inquiry_123","status":"completed","offers":[]}}',
  listExternalApiVehicles:
    '{"data":[{"object":"vehicle","id":"listing_123","title":"Fiat Toro"}],"pagination":{"page":1,"limit":20,"total":1,"hasMore":false,"nextOffset":null}}',
  searchExternalApiVehicles:
    '{"data":[{"object":"vehicle","id":"listing_123","title":"Fiat Toro"}],"pagination":{"page":1,"limit":20,"total":1,"hasMore":false,"nextOffset":null}}',
  getExternalApiVehicle:
    '{"data":{"object":"vehicle","id":"listing_123","title":"Fiat Toro","media":[],"units":[]}}',
  listExternalApiLeads:
    '{"data":[{"object":"lead","id":"lead_123","status":"new"}],"pagination":{"page":1,"limit":20,"total":1,"hasMore":false,"nextOffset":null}}',
  createExternalApiLead:
    '{"data":{"object":"lead","id":"lead_123","status":"new"}}',
  getExternalApiLead:
    '{"data":{"object":"lead","id":"lead_123","status":"new"}}',
  updateExternalApiLead:
    '{"data":{"object":"lead","id":"lead_123","status":"contacted"}}',
} as const satisfies Record<
  (typeof externalApiRuntimeOperations)[number]["operationId"],
  string
>;

export const publicApiEndpoints: PublicApiEndpoint[] =
  externalApiRuntimeOperations.map((operation) => ({
    ...endpointPresentation[operation.operationId],
    errorSummary: errorSummary(operation.method),
    method: operation.method,
    operationId: operation.operationId,
    path: operation.path.slice(externalApiBasePath.length),
    responseExample: responseExamples[operation.operationId],
    scopes: [operation.scope],
  }));

function errorSummary(method: PublicApiEndpoint["method"]) {
  const base =
    "400 entrada · 401 chave · 403 escopo · 404 recurso · 429 limite";
  return method === "GET" ? base : `${base} · 409 Idempotency-Key`;
}

export function createCurlExample(
  endpoint: PublicApiEndpoint,
  deploymentBaseUrl: string,
) {
  const route = endpoint.path
    .replace("{listingId}", "listing_123")
    .replace("{leadId}", "lead_123")
    .replace("{inquiryId}", "inquiry_123");
  const url = `${deploymentBaseUrl.replace(/\/$/, "")}${externalApiBasePath}${route}${endpoint.samplePath}`;
  const lines = [
    `curl -X ${endpoint.method}`,
    '-H "x-api-key: lv2_..."',
    '-H "content-type: application/json"',
    ...requestLines(endpoint),
    `"${url}"`,
  ];
  return lines.join(" \\\n  ");
}

function requestLines(endpoint: PublicApiEndpoint) {
  if (endpoint.operationId === "preflightExternalApiCredereSimulation") {
    return [`-d '{"document":"52998224725"}'`];
  }
  if (endpoint.operationId === "createExternalApiCredereSimulation") {
    return [
      '-H "Idempotency-Key: credere-simulation-001"',
      `-d '{"applicant":{"document":"52998224725","name":"Ana Silva","phone":"11999990000"},"consent":{"creditSimulation":true,"personalData":true},"terms":{"downPaymentCents":2000000,"installmentCounts":[24,36,48]},"vehicle":{"licensingCity":"Sao Paulo","licensingUf":"SP","manufactureYear":2023,"modelYear":2024,"molicarCode":"001234","priceCents":9000000}}'`,
    ];
  }
  if (endpoint.operationId === "createExternalApiLead") {
    return [
      '-H "Idempotency-Key: lead-import-001"',
      `-d '{"name":"Ana","phone":"+5511999990000","message":"Tenho interesse"}'`,
    ];
  }
  if (endpoint.method === "PATCH") {
    return [
      '-H "Idempotency-Key: lead-update-001"',
      `-d '{"status":"contacted"}'`,
    ];
  }
  return [];
}
