import {
  renderDocumentPdf,
  renderSharedDocumentPdf,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import type { VehicleStoreBranding } from "../ports/vehicleStoreBrandingReader.js";
import type { VehicleChecklistOverview } from "../readModels/vehicleChecklistOverview.js";
import { buildDetailedDocument } from "./vehicleChecklistDetailedReport.js";
import { buildFleetDocument } from "./vehicleChecklistFleetReport.js";

export async function renderVehicleChecklistReportPdf(input: {
  branding?: VehicleStoreBranding | undefined;
  overview: VehicleChecklistOverview;
  scopeLabel: string;
  unitReport: boolean;
}) {
  if (input.unitReport) {
    return renderSharedDocumentPdf(buildDetailedDocument(input));
  }

  // Render high-density fleet table report
  return renderDocumentPdf(buildFleetDocument(input));
}
