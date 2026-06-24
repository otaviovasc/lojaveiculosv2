import type {
  InventoryResaleAnalysisRequest,
  InventoryResaleMarketContext,
  InventoryResaleMarketSignal,
} from "../../features/inventory/controllers/inventoryEnrichmentTypes.js";
import {
  chineseBrands,
  fleetSensitiveModels,
  suvKeywords,
  vehicleMarketReferenceDate,
} from "./vehicleMarketSignalData.js";

export function createVehicleMarketContext(
  input: InventoryResaleAnalysisRequest,
): InventoryResaleMarketContext {
  const generated = createGeneratedContext(input);
  const supplied = input.marketContext;
  if (!supplied) return generated;

  return {
    priceBand: supplied.priceBand ?? generated.priceBand,
    referenceDate: supplied.referenceDate || generated.referenceDate,
    segment: supplied.segment ?? generated.segment,
    signals: dedupeSignals([...generated.signals, ...supplied.signals]),
  };
}

function createGeneratedContext(
  input: InventoryResaleAnalysisRequest,
): InventoryResaleMarketContext {
  const priceCents = getMarketPriceCents(input);
  const segment = inferSegment(input);
  const signals: InventoryResaleMarketSignal[] = [];

  if (isChineseElectrified(input)) {
    signals.push({
      code: "chinese_electrified_liquidity_context",
      message:
        "Modelos chineses eletrificados conhecidos podem ter boa liquidez, mas a analise deve considerar rede, garantia, atualizacoes de linha e valor residual.",
      severity: "info",
      title: "Contexto de eletrificado chines",
    });
  } else if (hasChineseNewVehiclePressure(input, priceCents, segment)) {
    signals.push({
      code: "chinese_new_vehicle_pressure",
      message:
        "SUV/crossover recente entre R$ 150 mil e R$ 250 mil disputa atencao com 0 km chineses hibridos/eletricos mais equipados e com garantia cheia.",
      severity: isCoreChinesePressureBand(priceCents) ? "risk" : "watch",
      title: "Pressao de 0 km chines",
    });
  }

  if (hasExplicitRentalHistory(input)) {
    signals.push({
      code: "possible_rental_history",
      message:
        "A metadata sugere uso anterior em aluguel, frota ou locadora. Trate como risco comercial somente se o dado estiver explicito.",
      severity: "risk",
      title: "Historico de locadora/frota",
    });
  } else if (hasRentalFleetSupplyPressure(input)) {
    signals.push({
      code: "rental_fleet_supply_pressure",
      message:
        "Modelo comum em canais de frota/locadora pode sofrer pressao de oferta quando grandes lotes entram no mercado de seminovos.",
      severity: "watch",
      title: "Oferta de frota/locadora",
    });
  }
  if (shouldConsiderConsignment(input, priceCents, signals)) {
    signals.push({
      code: "consignment_strategy_context",
      message:
        "Quando a compra imobiliza muito capital ou a margem fica apertada, consignado bem contratado pode ser alternativa para expor o carro sem assumir todo o risco de estoque.",
      severity: "watch",
      title: "Consignado como alternativa",
    });
  }

  return {
    priceBand: createPriceBand(priceCents),
    referenceDate: vehicleMarketReferenceDate,
    segment,
    signals,
  };
}

function getMarketPriceCents(input: InventoryResaleAnalysisRequest) {
  return (
    input.sellingPriceCents ??
    input.fipePriceCents ??
    input.recommendedSellingPriceCents
  );
}

function createPriceBand(priceCents: number | null) {
  if (priceCents === null) return null;
  if (priceCents < 10000000) return "below_100k";
  if (priceCents < 15000000) return "100k_150k";
  if (priceCents <= 25000000) return "150k_250k";
  return "above_250k";
}

function inferSegment(input: InventoryResaleAnalysisRequest) {
  const text = vehicleText(input);
  if (includesAny(text, suvKeywords)) return "SUV/crossover";
  if (includesAny(text, ["strada", "saveiro", "toro", "hilux", "s10"])) {
    return "picape";
  }
  if (includesAny(text, ["argo", "hb20", "kwid", "mobi", "onix", "polo"])) {
    return "hatch";
  }
  if (includesAny(text, ["corolla", "cronos", "sentra", "virtus", "yaris"])) {
    return "sedan";
  }
  return input.bodyType ?? input.vehicleType ?? null;
}

function hasChineseNewVehiclePressure(
  input: InventoryResaleAnalysisRequest,
  priceCents: number | null,
  segment: string | null,
) {
  return (
    priceCents !== null &&
    priceCents >= 15000000 &&
    priceCents <= 25000000 &&
    isRecent(input) &&
    segment === "SUV/crossover"
  );
}

function isCoreChinesePressureBand(priceCents: number | null) {
  return (
    priceCents !== null && priceCents >= 17000000 && priceCents <= 22000000
  );
}

function shouldConsiderConsignment(
  input: InventoryResaleAnalysisRequest,
  priceCents: number | null,
  signals: readonly InventoryResaleMarketSignal[],
) {
  return (
    isDealCapitalHeavy(priceCents) ||
    hasThinFipeMargin(input) ||
    signals.some((signal) => signal.severity === "risk")
  );
}

function isDealCapitalHeavy(priceCents: number | null) {
  return priceCents !== null && priceCents >= 15000000;
}

function hasThinFipeMargin(input: InventoryResaleAnalysisRequest) {
  if (input.acquisitionPriceCents === null || input.fipePriceCents === null) {
    return false;
  }
  return input.acquisitionPriceCents > Math.round(input.fipePriceCents * 0.84);
}

function hasRentalFleetSupplyPressure(input: InventoryResaleAnalysisRequest) {
  return (
    isRecent(input) && includesAny(vehicleText(input), fleetSensitiveModels)
  );
}

function hasExplicitRentalHistory(input: InventoryResaleAnalysisRequest) {
  const text = normalizeText(
    input.metadata.map((item) => `${item.label} ${item.value}`).join(" "),
  );
  if (/(sem|nao).{0,24}(locadora|aluguel|frota)/u.test(text)) {
    return false;
  }
  return includesAny(text, [
    "aluguel",
    "frota",
    "locadora",
    "rent a car",
    "uso anterior aluguel",
    "uso anterior frota",
  ]);
}

function isChineseElectrified(input: InventoryResaleAnalysisRequest) {
  const brandOrModel = normalizeText([input.brand, input.model].join(" "));
  const fuel = normalizeText(input.fuel ?? "");
  return (
    includesAny(brandOrModel, chineseBrands) &&
    includesAny(fuel, ["eletric", "ev", "hibrid", "hybrid", "phev"])
  );
}

function isRecent(input: InventoryResaleAnalysisRequest) {
  const year = input.modelYear ?? input.manufactureYear;
  return year !== null && year >= 2020;
}

function vehicleText(input: InventoryResaleAnalysisRequest) {
  return normalizeText(
    [
      input.bodyType,
      input.brand,
      input.model,
      input.vehicleType,
      input.version,
    ].join(" "),
  );
}

function includesAny(text: string, values: readonly string[]) {
  return values.some((value) => text.includes(value));
}

function dedupeSignals(
  signals: readonly InventoryResaleMarketSignal[],
): readonly InventoryResaleMarketSignal[] {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    if (seen.has(signal.code)) return false;
    seen.add(signal.code);
    return true;
  });
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
