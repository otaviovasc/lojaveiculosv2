import { getCitiesByStateCode } from "@lojaveiculosv2/shared";

export function canonicalSimulationCity(uf: string, city: string) {
  const normalized = normalizeLocation(city);
  return (
    getCitiesByStateCode(uf).find(
      (candidate) => normalizeLocation(candidate) === normalized,
    ) ?? ""
  );
}

function normalizeLocation(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}
