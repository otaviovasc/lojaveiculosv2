import { readFile } from "node:fs/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { renderWorkflowDocumentPdf } from "../../apps/api/src/domains/vehicle/documents/vehicleWorkflowPdf.js";
import { renderVehicleChecklistReportPdf } from "../../apps/api/src/domains/vehicle/documents/vehicleChecklistReportPdf.js";
import type { CreateVehicleDocumentRecord } from "../../apps/api/src/domains/vehicle/ports/vehicleInventoryRepository.js";
import type { VehicleChecklistOverviewItem } from "../../apps/api/src/domains/vehicle/readModels/vehicleChecklistOverview.js";

const OUTPUT_DIR = resolve(
  process.argv[2] ?? "/home/marlos/projects/teste/loja/pdf-compare/v2",
);
const LOGO_PATH = resolve(
  "/home/marlos/projects/teste/loja/pdf-compare/assets/logo-autoprime.png",
);
const GENERATED_AT = "2026-07-20T14:30:00-03:00";

const logoDataUri = `data:image/png;base64,${(await readFile(LOGO_PATH)).toString("base64")}`;

/* Fake data mirrors the V1 reference mocks (generate-reference-pdfs.tsx). */
const store = {
  address: "Av. Francisco Glicério, 1250 - Centro, 13010-123 Campinas SP",
  city: "Campinas",
  contactLine: "(19) 98877-6655 · contato@autoprime.com.br",
  document: "12.345.678/0001-90",
  email: "contato@autoprime.com.br",
  instagram: "@autoprimeveiculos",
  logoUrl: logoDataUri,
  name: "AutoPrime Veículos",
  phone: "5519988776655",
  state: "SP",
};

const buyer = {
  address: "Rua das Palmeiras, 480 - Jardim das Acácias",
  cep: "13045-678",
  city: "Campinas",
  district: "Jardim das Acácias",
  document: "321.654.987-00",
  documentType: "CPF",
  email: "fernanda.lima@email.com.br",
  maritalStatus: "casada",
  name: "Fernanda Cristina Souza Lima",
  nationality: "brasileira",
  phone: "(19) 99876-1234",
  phone2: "(19) 98877-5566",
  phone3: "(19) 3222-1122",
  profession: "arquiteta",
  state: "SP",
};

const vehicle = {
  catalog: { brandName: "TOYOTA", fuel: "Flex", modelName: "COROLLA" },
  color: "Branco Polar",
  fuelType: "flex",
  km: 38500,
  laudo: "Aprovado / Disponível",
  manufactureYear: 2022,
  modelYear: 2023,
  plate: "BRZ-2C45",
  renavam: "01234567890",
  title: "TOYOTA COROLLA XEI 2.0 FLEX DYNAMIC FORCE 2023",
  trimName: "2.0 XEI FLEX DYNAMIC FORCE CVT",
  vin: "9BR53WECXP8123456",
};

const payments = [
  {
    amountCents: 4000000,
    description: "Entrada via PIX",
    method: "pix",
    paidAt: "2026-07-18T10:15:00-03:00",
    status: "paid",
  },
  {
    amountCents: 4490000,
    description: "Veículo aceito na troca (Honda Civic EXL 2019/2019)",
    method: "trade_in",
    paidAt: "2026-07-20T14:30:00-03:00",
    status: "paid",
    tradeInVehicle: {
      brand: "HONDA",
      chassi: "93HFC1630KZ123456",
      color: "Cinza Estelar",
      km: 72300,
      model: "CIVIC",
      plate: "FZK-4E78",
      renavam: "00987654321",
      version: "2.0 EXL FLEX CVT",
      yearFabrication: 2019,
      yearModel: 2019,
    },
  },
  {
    amountCents: 7000000,
    description: "CDC Santander - 36x de R$ 2.495,17",
    installments: 36,
    method: "financing",
    paidAt: "2026-07-20T14:30:00-03:00",
    status: "paid",
  },
];

const saleFinance = {
  discountCents: 500000,
  paidAmountCents: 15490000,
  paymentMethod: "pix, trade_in, financing",
  payments,
  salePriceCents: 15490000,
  tablePriceCents: 15990000,
};

const reservationFinance = {
  paymentMethod: "pix",
  signalAmountCents: 500000,
  status: "paid",
  tablePriceCents: 15990000,
  totalAmountCents: 15490000,
};

function workflowRecord(
  kind: CreateVehicleDocumentRecord["kind"],
  fileName: string,
  title: string,
  finance: Record<string, unknown>,
  extraMetadata: Record<string, unknown> = {},
): CreateVehicleDocumentRecord {
  return {
    createdByUserId: "qa-script",
    fileName,
    fileSizeBytes: null,
    kind,
    linkRole: kind,
    metadata: {
      buyer,
      finance,
      generatedAt: GENERATED_AT,
      notes:
        "Veículo entregue com chave reserva, manual do proprietário e laudo cautelar aprovado. IPVA 2026 quitado. Licenciamento 2026 em dia.",
      saleCode: "2087",
      saleId: "sale-2087",
      sellerName: "Marcos Antônio Ferreira",
      store,
      transfer: {
        crvCpf: "321.654.987-00",
        crvName: "Fernanda Cristina Souza Lima",
        status: "PAGO_PELA_LOJA",
        valueCents: 125000,
      },
      vehicle,
      witnesses: ["Ricardo Henrique Almeida", "Patrícia Moraes Cardoso"],
      ...extraMetadata,
    },
    mimeType: "application/pdf",
    status: "issued",
    storageKey: `qa/${fileName}`,
    storeId: "store_qa",
    targetId: "unit_qa",
    targetType: "vehicle_unit",
    tenantId: "tenant_qa",
    title,
  };
}

function checklistItem(
  label: string,
  ok: boolean,
  notes: string | null = null,
) {
  return {
    id: `item_${label}`,
    label,
    notes,
    status: (ok ? "passed" : "pending") as "passed" | "pending",
  };
}

function overviewItem(input: {
  color: string;
  items: ReturnType<typeof checklistItem>[];
  percent: number;
  plate: string;
  status: VehicleChecklistOverviewItem["unit"]["status"];
  title: string;
  unitId: string;
  updatedAt: string;
  years: [number, number];
}): VehicleChecklistOverviewItem {
  return {
    checklists: [
      {
        completedAt: null,
        completedByUserId: null,
        createdAt: new Date(input.updatedAt),
        id: `checklist_${input.unitId}`,
        items: input.items,
        name: "Inspeção e Documentação",
        status: "in_progress",
        storeId: "store_qa",
        tenantId: "tenant_qa",
        unitId: input.unitId,
        updatedAt: new Date(input.updatedAt),
      },
    ],
    listing: {
      id: `listing_${input.unitId}`,
      manufactureYear: input.years[0],
      modelYear: input.years[1],
      status: "published",
      title: input.title,
    },
    metrics: {
      checklistCount: 1,
      failedItemCount: 0,
      itemCount: input.items.length,
      pendingItemCount: input.items.filter((item) => item.status === "pending")
        .length,
      progressPercent: input.percent,
      resolvedItemCount: input.items.filter((item) => item.status === "passed")
        .length,
      waivedItemCount: 0,
    },
    status: input.percent === 100 ? "passed" : "in_progress",
    unit: {
      colorName: input.color,
      id: input.unitId,
      plate: input.plate,
      status: input.status,
      stockNumber: null,
      vin: null,
    },
    updatedAt: new Date(input.updatedAt),
  };
}

const corollaChecklistItems = [
  checklistItem("Manual", true),
  checklistItem("Chave reserva", true),
  checklistItem("Documento para rodar", true),
  checklistItem(
    "CRV",
    false,
    "CRV aguardando assinatura do antigo proprietário (previsão: 22/07).",
  ),
  checklistItem("Perícia", true),
  checklistItem(
    "Preparação",
    false,
    "Preparação final (higienização e polimento) agendada para 23/07.",
  ),
  checklistItem("Débitos quitados", true),
];

const unitOverviewItem = overviewItem({
  color: "Branco Polar",
  items: corollaChecklistItems,
  percent: 71,
  plate: "BRZ-2C45",
  status: "available",
  title: "TOYOTA COROLLA XEI 2.0 FLEX DYNAMIC FORCE 2023",
  unitId: "unit_42",
  updatedAt: "2026-07-20T11:20:00-03:00",
  years: [2022, 2023],
});

const fleetItems: VehicleChecklistOverviewItem[] = [
  overviewItem({
    color: "Branco Polar",
    items: corollaChecklistItems,
    percent: 71,
    plate: "BRZ-2C45",
    status: "available",
    title: "TOYOTA COROLLA XEI 2.0 FLEX 2023",
    unitId: "unit_42",
    updatedAt: "2026-07-20T11:20:00-03:00",
    years: [2022, 2023],
  }),
  overviewItem({
    color: "Preto",
    items: [
      checklistItem("Manual", true),
      checklistItem("Chave reserva", true),
      checklistItem("Documento para rodar", true),
      checklistItem("CRV", true),
      checklistItem("Perícia", true),
      checklistItem("Preparação", true),
      checklistItem("Débitos quitados", true, "Pronto para venda."),
    ],
    percent: 100,
    plate: "HRV-1A23",
    status: "available",
    title: "HONDA HR-V TOURING 1.5 TURBO 2021",
    unitId: "unit_43",
    updatedAt: "2026-07-19T16:45:00-03:00",
    years: [2021, 2021],
  }),
  overviewItem({
    color: "Branco",
    items: [
      checklistItem("Manual", true),
      checklistItem("Chave reserva", false),
      checklistItem("Documento para rodar", false),
      checklistItem("CRV", true),
      checklistItem("Perícia", false),
      checklistItem("Preparação", false),
      checklistItem(
        "Débitos quitados",
        false,
        "Aguardando confecção da chave reserva e perícia cautelar.",
      ),
    ],
    percent: 29,
    plate: "GLF-9Z88",
    status: "in_preparation",
    title: "VOLKSWAGEN GOLF GTI 350 TSI 2020",
    unitId: "unit_44",
    updatedAt: "2026-07-18T09:05:00-03:00",
    years: [2020, 2020],
  }),
  overviewItem({
    color: "Vermelho",
    items: [
      checklistItem("Manual", true),
      checklistItem("Chave reserva", true),
      checklistItem("Documento para rodar", true),
      checklistItem("CRV", true),
      checklistItem("Perícia", true),
      checklistItem("Preparação", false, "Higienização interna pendente."),
      checklistItem("Débitos quitados", true),
    ],
    percent: 86,
    plate: "CPS-2B34",
    status: "available",
    title: "JEEP COMPASS LONGITUDE T270 2022",
    unitId: "unit_45",
    updatedAt: "2026-07-20T08:30:00-03:00",
    years: [2022, 2022],
  }),
  overviewItem({
    color: "Cinza",
    items: [
      checklistItem("Manual", true),
      checklistItem("Chave reserva", true),
      checklistItem("Documento para rodar", true),
      checklistItem("CRV", true),
      checklistItem("Perícia", true),
      checklistItem("Preparação", true),
      checklistItem(
        "Débitos quitados",
        true,
        "Reservado até 25/07 (sinal de R$ 5.000,00 recebido).",
      ),
    ],
    percent: 100,
    plate: "TOR-5C67",
    status: "reserved",
    title: "FIAT TORO VOLCANO 2.0 DIESEL 2023",
    unitId: "unit_46",
    updatedAt: "2026-07-20T14:00:00-03:00",
    years: [2023, 2023],
  }),
  overviewItem({
    color: "Branco",
    items: [
      checklistItem(
        "Manual",
        false,
        "Quitação de multas em andamento; manual solicitado à concessionária.",
      ),
      checklistItem("Chave reserva", true),
      checklistItem("Documento para rodar", true),
      checklistItem("CRV", false),
      checklistItem("Perícia", true),
      checklistItem("Preparação", true),
      checklistItem("Débitos quitados", false),
    ],
    percent: 57,
    plate: "HB2-7D90",
    status: "available",
    title: "HYUNDAI HB20 PLATINUM 1.0 TGDI 2022",
    unitId: "unit_47",
    updatedAt: "2026-07-17T15:10:00-03:00",
    years: [2022, 2022],
  }),
];

function overview(items: readonly VehicleChecklistOverviewItem[]) {
  return {
    generatedAt: new Date(GENERATED_AT),
    items,
    summary: {
      attentionUnitCount: 0,
      checklistCount: items.length,
      failedItemCount: 0,
      itemCount: 7 * items.length,
      missingChecklistUnitCount: 0,
      pendingItemCount: 0,
      progressPercent: 0,
      resolvedItemCount: 0,
      unitCount: items.length,
      waivedItemCount: 0,
    },
  };
}

const jobs = [
  {
    name: "contrato-compra-venda",
    render: () =>
      renderWorkflowDocumentPdf(
        workflowRecord(
          "sale_contract",
          "contrato-compra-venda.pdf",
          "Contrato de Compra e Venda",
          saleFinance,
        ),
      ),
  },
  {
    name: "recibo-venda",
    render: () =>
      renderWorkflowDocumentPdf(
        workflowRecord(
          "sale_receipt",
          "recibo-venda.pdf",
          "Recibo de Venda",
          saleFinance,
        ),
      ),
  },
  {
    name: "termo-entrega",
    render: () =>
      renderWorkflowDocumentPdf(
        workflowRecord(
          "delivery_term",
          "termo-entrega.pdf",
          "Termo de Entrega",
          saleFinance,
        ),
      ),
  },
  {
    name: "procuracao-veiculo-troca",
    render: () =>
      renderWorkflowDocumentPdf(
        workflowRecord(
          "power_of_attorney",
          "procuracao-veiculo-troca.pdf",
          "Procuração Específica para Venda de Veículo",
          saleFinance,
        ),
      ),
  },
  {
    name: "recibo-sinal-reserva",
    render: () =>
      renderWorkflowDocumentPdf(
        workflowRecord(
          "reservation_receipt",
          "recibo-sinal-reserva.pdf",
          "Recibo de Sinal de Reserva de Veículo",
          reservationFinance,
          {
            notes:
              "Reserva válida até a data limite informada. O sinal será integralmente abatido do valor final da negociação.",
            reservationExpiresAt: "2026-07-25T18:00",
          },
        ),
      ),
  },
  {
    name: "vehicle-checklist",
    render: () =>
      renderVehicleChecklistReportPdf({
        branding: store,
        overview: overview([unitOverviewItem]),
        scopeLabel: "Estoque ativo",
        unitReport: true,
      }),
  },
  {
    name: "vehicle-checklist-summary",
    render: () =>
      renderVehicleChecklistReportPdf({
        branding: store,
        overview: overview(fleetItems),
        scopeLabel: "Estoque ativo",
        unitReport: false,
      }),
  },
];

await mkdir(OUTPUT_DIR, { recursive: true });
let failures = 0;
for (const job of jobs) {
  const file = join(OUTPUT_DIR, `${job.name}.pdf`);
  try {
    const pdf = await job.render();
    await writeFile(file, pdf);
    console.info(`OK   ${file} (${pdf.byteLength} bytes)`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${file}:`, error);
  }
}
if (failures > 0) {
  console.error(`${failures} document(s) failed to generate.`);
  process.exit(1);
}
console.info(
  `All ${jobs.length} V2 document PDFs generated into ${OUTPUT_DIR}.`,
);
