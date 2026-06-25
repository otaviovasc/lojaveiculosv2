import {
  type InventoryPlateLookupResponse,
  type InventoryPlateMetadataItem,
} from "../../domains/vehicle/ports/vehicleEnrichmentTypes.js";
import { pickFipeReference } from "./apiBrasilFipeReference.js";
import { InventoryEnrichmentProviderError } from "./inventoryEnrichmentProviderError.js";

const defaultBaseUrl = "https://gateway.apibrasil.io/api/v2";
const defaultDadosPath = "/vehicles/base/000/dados";
export type ApiBrasilVehiclePlateProvider = {
  lookupPlate: (input: {
    plate: string;
  }) => Promise<InventoryPlateLookupResponse>;
};

export function createApiBrasilVehiclePlateProvider({
  baseUrl = defaultBaseUrl,
  dadosPath = defaultDadosPath,
  fetch = globalThis.fetch,
  token,
}: {
  baseUrl?: string;
  dadosPath?: string;
  fetch?: typeof globalThis.fetch;
  token?: string | undefined;
} = {}): ApiBrasilVehiclePlateProvider {
  return {
    async lookupPlate({ plate }) {
      if (!token) {
        throw new InventoryEnrichmentProviderError(
          "API_PLACA_KEY is not configured.",
          503,
        );
      }

      let response: Response;
      try {
        response = await fetch(`${baseUrl.replace(/\/$/, "")}${dadosPath}`, {
          body: JSON.stringify({ placa: normalizePlate(plate) }),
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          method: "POST",
        });
      } catch {
        throw new InventoryEnrichmentProviderError(
          "Plate lookup provider request failed.",
          503,
        );
      }

      if (!response.ok) {
        throw new InventoryEnrichmentProviderError(
          `Plate lookup failed with status ${response.status}.`,
          response.status === 401 || response.status === 403 ? 502 : 503,
        );
      }

      const payload = (await response.json()) as unknown;
      const providerError = readProviderError(payload);
      if (providerError) {
        throw new InventoryEnrichmentProviderError(providerError, 502);
      }

      return normalizeApiBrasilPlateResponse(payload, plate);
    },
  };
}

export function normalizeApiBrasilPlateResponse(
  payload: unknown,
  fallbackPlate: string,
): InventoryPlateLookupResponse {
  const root = asRecord(payload) ?? {};
  const envelope = asRecord(root.data) ?? asRecord(root.dados) ?? root;
  const data = asRecord(envelope.data) ?? asRecord(envelope.dados) ?? envelope;
  const extra = asRecord(data.extra) ?? {};
  const candidates = [data, extra, envelope, root].filter(hasKeys);
  const fipe = pickFipeReference(root, envelope, data, extra);

  return {
    fipe,
    metadata: buildMetadata(candidates),
    plate: findString(candidates, ["placa"]) ?? normalizePlate(fallbackPlate),
    source: "apibrasil",
    vehicle: {
      aspiration: findString(candidates, [
        "aspiracao",
        "aspiração",
        "sobrealimentacao",
        "sobrealimentação",
      ]),
      bodyType: findString(candidates, ["tipo_carroceria", "carroceria"]),
      brand: findString(candidates, ["marca", "MARCA"]),
      chassis: findString(candidates, ["chassi", "chassis"]),
      city: findString(candidates, ["municipio", "cidade"]),
      color: findString(candidates, ["cor", "color"]),
      engine: findString(candidates, ["motor", "cilindradas", "cilindrada"]),
      fuel: findString(candidates, ["combustivel", "fuel"]),
      manufactureYear: findNumber(candidates, ["ano_fabricacao", "ano"]),
      mileageKm: findNumber(candidates, ["km", "quilometragem", "odometro"]),
      model: findString(candidates, ["modelo", "MODELO", "marcaModelo"]),
      modelYear: findNumber(candidates, ["ano_modelo", "anoModelo"]),
      origin: findString(candidates, ["origem", "nacionalidade"]),
      power: findString(candidates, ["potencia"]),
      state: findString(candidates, ["uf_placa", "uf"]),
      transmission: findString(candidates, ["caixa_cambio", "cambio"]),
      vehicleType: findString(candidates, ["tipo_veiculo", "segmento"]),
      version: findString(candidates, ["versao", "VERSAO", "submodelo"]),
    },
  };
}

function readProviderError(payload: unknown) {
  const root = asRecord(payload);
  if (!root) return null;
  if (root.error === true)
    return findString([root], ["message"]) ?? "Plate lookup failed.";
  return null;
}

function buildMetadata(
  candidates: readonly Record<string, unknown>[],
): InventoryPlateMetadataItem[] {
  const fields: Array<[string, string[]]> = [
    ["Situacao", ["situacao", "situacao_veiculo"]],
    ["Municipio", ["municipio", "cidade"]],
    ["UF", ["uf_placa", "uf"]],
    ["Origem", ["origem", "nacionalidade"]],
    ["Especie", ["especie", "s.especie"]],
    ["Segmento", ["segmento", "sub_segmento"]],
    ["Tipo de veiculo", ["tipo_veiculo"]],
    ["Carroceria", ["tipo_carroceria", "carroceria"]],
    ["Cilindradas", ["cilindradas", "cilindrada"]],
    ["Potencia", ["potencia"]],
    ["Passageiros", ["quantidade_passageiro", "passageiros"]],
  ];
  return fields.flatMap(([label, keys]) => {
    const value = findString(candidates, keys);
    return value ? [{ label, value }] : [];
  });
}

function findString(
  candidates: readonly Record<string, unknown>[],
  keys: readonly string[],
): string | null {
  for (const candidate of candidates) {
    for (const key of keys) {
      const value = readCaseInsensitive(candidate, key);
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value))
        return String(value);
    }
  }
  return null;
}

function findNumber(
  candidates: readonly Record<string, unknown>[],
  keys: readonly string[],
): number | null {
  const value = findString(candidates, keys);
  if (!value) return null;
  const number = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function readCaseInsensitive(record: Record<string, unknown>, key: string) {
  if (key in record) return record[key];
  const match = Object.keys(record).find(
    (candidate) => candidate.toLowerCase() === key.toLowerCase(),
  );
  return match ? record[match] : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasKeys(record: Record<string, unknown>) {
  return Object.keys(record).length > 0;
}

function normalizePlate(plate: string) {
  return plate.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}
