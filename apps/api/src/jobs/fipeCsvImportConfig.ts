import { fileURLToPath } from "node:url";

const defaultFipeCsvPath = fileURLToPath(
  new URL("../../../../tabela-fipe-335.csv", import.meta.url),
);

export function resolveFipeCsvPath(
  configuredPath = process.env.FIPE_CSV_PATH,
): string {
  return configuredPath || defaultFipeCsvPath;
}
