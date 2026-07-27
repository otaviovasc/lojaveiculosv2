export type FinancingOAuthReturnTarget = "agency" | "store";

const statePrefix = "lojav2";

export function bindFinancingOAuthReturnTarget(
  opaqueState: string,
  returnTarget: FinancingOAuthReturnTarget,
): string {
  return `${statePrefix}.${returnTarget}.${opaqueState}`;
}

export function readFinancingOAuthReturnTarget(
  state: string,
): FinancingOAuthReturnTarget {
  if (state.startsWith(`${statePrefix}.store.`)) return "store";
  return "agency";
}
