import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { renderWorkflowDocumentPdf } from "../../apps/api/src/domains/vehicle/documents/vehicleWorkflowPdf.js";
import type { CreateVehicleDocumentRecord } from "../../apps/api/src/domains/vehicle/ports/vehicleInventoryRepository.js";

const outputPath = resolve(
  process.argv[2] ??
    "/tmp/lojaveiculosv2-redesign/artifacts/contrato-venda-premium.pdf",
);
const record: CreateVehicleDocumentRecord = {
  createdByUserId: "02020202-0202-4202-8202-020202020202",
  fileName: "contrato-venda-toyota-hilux.pdf",
  fileSizeBytes: null,
  kind: "sale_contract",
  linkRole: "sale_contract",
  metadata: {
    buyer: {
      address: "Rua das Palmeiras, 250 - Centro",
      document: "123.456.789-00",
      email: "carla@example.com",
      name: "Carla Rocha",
      phone: "(48) 99999-0000",
    },
    finance: {
      paidAmountCents: 14990000,
      paymentMethod: "PIX",
      salePriceCents: 14990000,
      signalAmountCents: 2000000,
    },
    store: {
      contactLine: "Florianópolis · (48) 3333-2026 · contato@lojateste.com.br",
      document: "CNPJ 12.345.678/0001-90",
      name: "Loja Teste Veículos",
    },
    templateClauses: [
      "A {{store.name}} vende a {{buyer.name}} o veículo {{vehicle.title}}, placa {{vehicle.plate}}, conforme os dados registrados nesta operação.",
      "O preço total ajustado é de {{finance.salePrice}}, pago por {{finance.paymentMethod}}.",
      "O comprador declara ter vistoriado o veículo e recebido todas as informações necessárias para esta aquisição.",
      "A partir da entrega, o comprador assume multas, tributos e responsabilidades decorrentes do uso do veículo.",
      "Os dados pessoais serão tratados somente para execução e auditoria desta venda.",
    ],
    templateTitle: "Contrato de compra e venda",
    vehicle: {
      manufactureYear: 2020,
      modelYear: 2021,
      plate: "JKL0M12",
      title: "Toyota Hilux SRX 2.8 4x4 2021",
      vin: "8AJHA3CD7M0002026",
    },
  },
  mimeType: "application/pdf",
  status: "issued",
  storageKey: "evidence/contrato-venda-toyota-hilux.pdf",
  storeId: "66666666-6666-4666-8666-666666666666",
  targetId: "11000000-0000-4000-8000-000000000004",
  targetType: "vehicle_unit",
  tenantId: "77777777-7777-4777-8777-777777777777",
  title: "Contrato de compra e venda - Carla Rocha",
};

const pdf = await renderWorkflowDocumentPdf(record);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, pdf);
console.info(
  JSON.stringify(
    {
      bytes: pdf.byteLength,
      outputPath,
      signature: Buffer.from(pdf.subarray(0, 4)).toString("utf8"),
    },
    null,
    2,
  ),
);
