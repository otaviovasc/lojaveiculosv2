import { createHash } from "node:crypto";
import type { FinancingSimulationCandidate } from "../../domains/financing/ports/financingProviderGateway.js";
import {
  readArray,
  readNumber,
  readRecord,
  readString,
} from "./credereHttpSupport.js";

export function mapSimulationCandidates(
  payload: Record<string, unknown>,
): FinancingSimulationCandidate[] {
  const rawData = payload.data;
  const rows = Array.isArray(rawData)
    ? rawData.map(readRecord)
    : Object.keys(readRecord(rawData)).length
      ? [readRecord(rawData)]
      : readArray(payload.simulations).map(readRecord);
  return rows.flatMap((simulation) => {
    const lead = readRecord(simulation.lead);
    const vehicle = readRecord(simulation.vehicle);
    const model = readRecord(vehicle.vehicle_model);
    const document = (readString(lead.cpf_cnpj) ?? "").replace(/\D/gu, "");
    const candidate = {
      assetValueCents:
        readNumber(simulation.assets_value) ??
        readNumber(vehicle.asset_value) ??
        0,
      createdAt: readString(simulation.created_at) ?? "",
      customerDocumentHash: document
        ? createHash("sha256").update(document).digest("hex")
        : "",
      manufactureYear: readNumber(vehicle.manufacture_year) ?? 0,
      modelYear: readNumber(vehicle.model_year) ?? 0,
      vehicleMolicarCode: readString(model.molicar_code) ?? "",
      uuid: readString(simulation.uuid) ?? "",
    };
    return candidate.uuid &&
      candidate.createdAt &&
      candidate.customerDocumentHash &&
      candidate.assetValueCents > 0 &&
      candidate.manufactureYear > 0 &&
      candidate.modelYear > 0 &&
      candidate.vehicleMolicarCode
      ? [candidate]
      : [];
  });
}
