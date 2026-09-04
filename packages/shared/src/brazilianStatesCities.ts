import catalog from "./brazilianStatesCities.data.json" with { type: "json" };

export interface State {
  code: string;
  name: string;
  cities: string[];
}

/**
 * Complete IBGE state and municipality catalog.
 *
 * The generated data stays in a compact JSON asset so this module remains a
 * small, reviewable public API shared by the web and API workspaces.
 */
export const BRAZILIAN_STATES: State[] = catalog;

export function getStateByCode(code: string): State | undefined {
  return BRAZILIAN_STATES.find((state) => state.code === code);
}

export function getStateByName(name: string): State | undefined {
  const normalizedName = name.toLocaleLowerCase("pt-BR");

  return BRAZILIAN_STATES.find(
    (state) =>
      state.name.toLocaleLowerCase("pt-BR") === normalizedName ||
      state.code.toLocaleLowerCase("pt-BR") === normalizedName,
  );
}

export function getCitiesByStateCode(code: string): string[] {
  return getStateByCode(code)?.cities ?? [];
}

export function getAllStateCodes(): string[] {
  return BRAZILIAN_STATES.map((state) => state.code);
}

export function getAllStateNames(): string[] {
  return BRAZILIAN_STATES.map((state) => state.name);
}
