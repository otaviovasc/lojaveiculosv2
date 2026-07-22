import { renderDocumentPdf } from "../../documents/render/reactPdfDocumentPrimitives.js";
import type { CreateVehicleDocumentRecord } from "../ports/vehicleInventoryRepository.js";
import { createDeliveryTermDocument } from "./vehicleDeliveryTermPdf.js";
import { createPowerOfAttorneyDocument } from "./vehiclePowerOfAttorneyPdf.js";
import { createReservationReceiptDocument } from "./vehicleReservationReceiptPdf.js";
import { createSaleContractDocument } from "./vehicleSaleContractPdf.js";
import { createSaleReceiptDocument } from "./vehicleSaleReceiptPdf.js";
import {
  buildWorkflowPdfModel,
  type WorkflowPdfModel,
} from "./vehicleWorkflowPdfModel.js";

export async function renderWorkflowDocumentPdf(
  record: CreateVehicleDocumentRecord,
): Promise<Uint8Array> {
  const model = buildWorkflowPdfModel(record);
  return renderDocumentPdf(createWorkflowDocument(record.kind, model));
}

function createWorkflowDocument(kind: string, model: WorkflowPdfModel) {
  switch (kind) {
    case "delivery_term":
      return createDeliveryTermDocument(model);
    case "power_of_attorney":
      return createPowerOfAttorneyDocument(model);
    case "reservation_receipt":
      return createReservationReceiptDocument(model);
    case "sale_receipt":
      return createSaleReceiptDocument(model);
    default:
      return createSaleContractDocument(model);
  }
}
