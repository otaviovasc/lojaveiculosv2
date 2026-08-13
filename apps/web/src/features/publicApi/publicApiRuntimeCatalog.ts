import {
  externalApiBasePath,
  externalApiRuntimeOperations,
  type ExternalApiAssignableScope,
} from "@lojaveiculosv2/shared";

export type PublicApiEndpoint = {
  description: string;
  method: "GET" | "PATCH" | "POST";
  operationId: string;
  path: string;
  samplePath: string;
  scopes: ExternalApiAssignableScope[];
  title: string;
};

const endpointPresentation = {
  preflightExternalApiCredereSimulation: {
    description: "Confere prontidão, bancos e dados exigidos pelo Credere.",
    samplePath: "",
    title: "Pré-validar simulação Credere",
  },
  createExternalApiCredereSimulation: {
    description: "Cria uma simulação oficial e consentida no Credere.",
    samplePath: "",
    title: "Criar simulação Credere",
  },
  getExternalApiCredereSimulation: {
    description: "Consulta o retorno oficial e as condições dos bancos.",
    samplePath: "",
    title: "Consultar simulação Credere",
  },
  listExternalApiVehicles: {
    description: "Lista veículos com um DTO público limpo.",
    samplePath: "?available=true&limit=20",
    title: "Listar veículos",
  },
  searchExternalApiVehicles: {
    description:
      "Aceita busca, preço, ano, km, cor, combustível, câmbio e ordenação.",
    samplePath: "?q=toro&minPrice=100000&sort=price_asc",
    title: "Buscar veículos",
  },
  getExternalApiVehicle: {
    description:
      "Detalhe com mídia pública, histórico de preço e unidades seguras.",
    samplePath: "",
    title: "Detalhe do veículo",
  },
  listExternalApiLeads: {
    description: "Busca leads por status, origem, telefone, texto e veículo.",
    samplePath: "?status=new&limit=20",
    title: "Listar leads",
  },
  createExternalApiLead: {
    description:
      "Cria lead por campos V2 ou aliases V1 name/email/phone/message/vehicleId.",
    samplePath: "",
    title: "Criar lead",
  },
  getExternalApiLead: {
    description: "Leitura de um lead via chave escopada.",
    samplePath: "",
    title: "Detalhe do lead",
  },
  updateExternalApiLead: {
    description:
      "Atualiza o lead com Idempotency-Key para rejeitar duplicatas; respostas anteriores não são repetidas.",
    samplePath: "",
    title: "Atualizar lead",
  },
} as const satisfies Record<
  (typeof externalApiRuntimeOperations)[number]["operationId"],
  { description: string; samplePath: string; title: string }
>;

export const publicApiEndpoints: PublicApiEndpoint[] =
  externalApiRuntimeOperations.map((operation) => ({
    ...endpointPresentation[operation.operationId],
    method: operation.method,
    operationId: operation.operationId,
    path: operation.path.slice(externalApiBasePath.length),
    scopes: [operation.scope],
  }));

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
