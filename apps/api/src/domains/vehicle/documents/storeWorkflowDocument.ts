import type { CreateVehicleDocumentRecord } from "../ports/vehicleInventoryRepository.js";
import type { VehicleMediaStorage } from "../ports/vehicleMediaStorage.js";
import { renderWorkflowDocumentPdf } from "./vehicleWorkflowPdf.js";

export async function storeWorkflowDocument(
  record: CreateVehicleDocumentRecord,
  storage: VehicleMediaStorage,
): Promise<CreateVehicleDocumentRecord> {
  if (!record.storeId || !record.tenantId) {
    throw new VehicleWorkflowDocumentScopeError();
  }

  const body = await renderWorkflowDocumentPdf(record);
  const object = await storage.putObject({
    body,
    contentType: "application/pdf",
    fileName: record.fileName,
    scopeSegments: [
      "tenants",
      record.tenantId,
      "stores",
      record.storeId,
      "listings",
      record.targetId,
      "documents",
    ],
  });

  return {
    ...record,
    fileSizeBytes: body.byteLength,
    metadata: {
      ...(record.metadata ?? {}),
      renderer: "pdf-lib",
    },
    mimeType: "application/pdf",
    storageKey: object.storageKey,
  };
}

export class VehicleWorkflowDocumentScopeError extends Error {
  constructor() {
    super("Vehicle workflow documents require tenant and store scope.");
    this.name = "VehicleWorkflowDocumentScopeError";
  }
}
