import { AppApiError } from "../../lib/apiErrors";
import { formatFiscalDefaultValue } from "./fiscalConnectionDisplay";

/**
 * Guided-form model for the provider-imported tax defaults. Mirrors the
 * required nested contract enforced by the API in
 * `apps/api/src/domains/fiscal/services/FiscalService/manageFiscalConnection.ts`:
 * confirmation is rejected unless every path in
 * `FISCAL_DEFAULTS_REQUIRED_FIELDS` has a non-empty value. Enum options follow
 * the Spedy API documentation; any imported value outside the listed options
 * is preserved and offered as an extra option so provider data is never lost.
 */

export type FiscalDefaultsFieldKind = "boolean" | "select" | "text";

export type FiscalDefaultsFieldOption = {
  label: string;
  value: string;
};

export type FiscalDefaultsField = {
  group: "nfe" | "nfse";
  hint?: string;
  key: string;
  kind: FiscalDefaultsFieldKind;
  label: string;
  numeric?: boolean;
  options?: readonly FiscalDefaultsFieldOption[];
  path: string;
};

export type FiscalDefaultsExtraEntry = {
  editable: boolean;
  path: string;
  value: unknown;
};

export const FISCAL_DEFAULTS_GROUP_LABELS: Record<"nfe" | "nfse", string> = {
  nfe: "NF-e (produto)",
  nfse: "NFS-e (serviço)",
};

export const FISCAL_DEFAULTS_REQUIRED_FIELDS: readonly FiscalDefaultsField[] = [
  {
    group: "nfe",
    hint: "Ex.: Venda de veículo",
    key: "operationNature",
    kind: "text",
    label: "Natureza da operação",
    path: "nfe.operationNature",
  },
  {
    group: "nfe",
    key: "destination",
    kind: "select",
    label: "Destino da operação",
    options: [
      { label: "Interna (dentro do estado)", value: "internal" },
      { label: "Interestadual", value: "interstate" },
      { label: "Exterior", value: "international" },
    ],
    path: "nfe.destination",
  },
  {
    group: "nfe",
    key: "isFinalCustomer",
    kind: "boolean",
    label: "Consumidor final",
    path: "nfe.isFinalCustomer",
  },
  {
    group: "nfe",
    key: "operationType",
    kind: "select",
    label: "Tipo de operação",
    options: [
      { label: "Saída", value: "outgoing" },
      { label: "Entrada", value: "incoming" },
    ],
    path: "nfe.operationType",
  },
  {
    group: "nfe",
    key: "presenceType",
    kind: "select",
    label: "Indicador de presença",
    options: [
      { label: "Operação presencial", value: "presence" },
      { label: "Não presencial (internet)", value: "internet" },
      { label: "Não presencial (teleatendimento)", value: "telephone" },
      { label: "Não se aplica", value: "not_applicable" },
      { label: "Outros", value: "other" },
    ],
    path: "nfe.presenceType",
  },
  {
    group: "nfe",
    key: "purposeType",
    kind: "select",
    label: "Finalidade da NF-e",
    options: [
      { label: "Normal", value: "normal" },
      { label: "Complementar", value: "complementary" },
      { label: "Ajuste", value: "adjustment" },
      { label: "Devolução", value: "return" },
    ],
    path: "nfe.purposeType",
  },
  {
    group: "nfe",
    hint: "Ex.: 5102 ou 5.102",
    key: "cfop",
    kind: "text",
    label: "CFOP padrão",
    numeric: true,
    path: "nfe.cfop",
  },
  {
    group: "nfe",
    hint: "Ex.: 8703 ou 8703.22.10",
    key: "ncm",
    kind: "text",
    label: "NCM padrão",
    numeric: true,
    path: "nfe.ncm",
  },
  {
    group: "nfe",
    key: "icmsOrigin",
    kind: "select",
    label: "Origem do ICMS",
    options: [
      { label: "0 — Nacional", value: "0" },
      { label: "1 — Estrangeira (importação direta)", value: "1" },
      { label: "2 — Estrangeira (mercado interno)", value: "2" },
      { label: "3 — Nacional (conteúdo importado > 40%)", value: "3" },
      { label: "4 — Nacional (processos produtivos básicos)", value: "4" },
      { label: "5 — Nacional (conteúdo importado ≤ 40%)", value: "5" },
      { label: "6 — Estrangeira (sem similar, importação direta)", value: "6" },
      { label: "7 — Estrangeira (sem similar, mercado interno)", value: "7" },
      { label: "8 — Nacional (conteúdo importado > 70%)", value: "8" },
    ],
    path: "nfe.icmsOrigin",
  },
  {
    group: "nfe",
    hint: "Ex.: 00, 102",
    key: "icmsCst",
    kind: "text",
    label: "CST do ICMS",
    numeric: true,
    path: "nfe.icmsCst",
  },
  {
    group: "nfe",
    hint: "Ex.: 01, 49",
    key: "pisCst",
    kind: "text",
    label: "CST do PIS",
    numeric: true,
    path: "nfe.pisCst",
  },
  {
    group: "nfe",
    hint: "Ex.: 01, 49",
    key: "cofinsCst",
    kind: "text",
    label: "CST do COFINS",
    numeric: true,
    path: "nfe.cofinsCst",
  },
  {
    group: "nfse",
    key: "taxLocation",
    kind: "select",
    label: "Local de incidência do ISS",
    options: [
      { label: "Município da empresa", value: "companyMunicipality" },
      { label: "Município do tomador", value: "customerMunicipality" },
      {
        label: "Município da prestação do serviço",
        value: "serviceProvisionMunicipality",
      },
    ],
    path: "nfse.taxLocation",
  },
  {
    group: "nfse",
    key: "taxationType",
    kind: "select",
    label: "Tipo de tributação do ISS",
    options: [
      {
        label: "Tributação no município",
        value: "taxationInMunicipality",
      },
      {
        label: "Tributação fora do município",
        value: "taxationOutsideMunicipality",
      },
      { label: "Isenção", value: "exemption" },
    ],
    path: "nfse.taxationType",
  },
];

const requiredFieldByPath = new Map(
  FISCAL_DEFAULTS_REQUIRED_FIELDS.map((field) => [field.path, field]),
);

export function getFiscalDefaultsFieldLabel(path: string) {
  return requiredFieldByPath.get(path)?.label ?? path;
}

export function getTaxDefaultValueAtPath(
  taxDefaults: Record<string, unknown>,
  path: string,
): unknown {
  const [group, key] = path.split(".", 2);
  if (!group) return undefined;
  if (key === undefined) return taxDefaults[group];
  const record = asRecord(taxDefaults[group]);
  return record ? record[key] : undefined;
}

/** Mirrors the backend `hasReviewedValue` semantics. */
export function listMissingRequiredTaxDefaults(
  taxDefaults: Record<string, unknown>,
): string[] {
  return FISCAL_DEFAULTS_REQUIRED_FIELDS.filter((field) => {
    const value = getTaxDefaultValueAtPath(taxDefaults, field.path);
    return value === null || value === undefined || value === "";
  }).map((field) => field.path);
}

/**
 * Extra provider-imported entries that are not part of the required guided
 * form: unknown keys inside the nfe/nfse groups and any other top-level key.
 * Scalar extras stay editable; structured values are preserved as-is.
 */
export function listFiscalDefaultsExtraEntries(
  taxDefaults: Record<string, unknown>,
): FiscalDefaultsExtraEntry[] {
  const entries: FiscalDefaultsExtraEntry[] = [];
  for (const [group, value] of Object.entries(taxDefaults)) {
    const record = asRecord(value);
    if (record && (group === "nfe" || group === "nfse")) {
      for (const [key, nestedValue] of Object.entries(record)) {
        const path = `${group}.${key}`;
        if (requiredFieldByPath.has(path)) continue;
        entries.push({
          editable: isScalar(nestedValue),
          path,
          value: nestedValue,
        });
      }
      continue;
    }
    if (group === "nfe" || group === "nfse") {
      entries.push({ editable: isScalar(value), path: group, value });
      continue;
    }
    entries.push({ editable: isScalar(value), path: group, value });
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path, "pt-BR"));
}

/**
 * Initial editable form values keyed by path: every required field plus every
 * editable extra entry. Values are stringified for the form controls.
 */
export function createTaxDefaultsFormValues(
  taxDefaults: Record<string, unknown>,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of FISCAL_DEFAULTS_REQUIRED_FIELDS) {
    const value = getTaxDefaultValueAtPath(taxDefaults, field.path);
    values[field.path] =
      value === null || value === undefined
        ? ""
        : formatFiscalDefaultValue(value);
  }
  for (const entry of listFiscalDefaultsExtraEntries(taxDefaults)) {
    if (!entry.editable) continue;
    values[entry.path] = formatFiscalDefaultValue(entry.value);
  }
  return values;
}

/**
 * Rebuilds the nested taxDefaults object from the edited form values. Unknown
 * provider fields (including structured values) are carried over untouched,
 * required fields are written at their nested paths, and scalar edits keep
 * the original value type (numbers stay numeric when the edit is numeric).
 */
export function buildReviewedTaxDefaults(
  original: Record<string, unknown>,
  edits: Record<string, string>,
): Record<string, unknown> {
  const reviewed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(original)) {
    reviewed[key] = asRecord(value) ? { ...asRecord(value) } : value;
  }
  for (const field of FISCAL_DEFAULTS_REQUIRED_FIELDS) {
    const edited = edits[field.path];
    if (edited === undefined) continue;
    const group = asRecord(reviewed[field.group]) ?? {};
    reviewed[field.group] = group;
    group[field.key] = coerceEditedValue(
      getTaxDefaultValueAtPath(original, field.path),
      edited,
      field,
    );
  }
  for (const [path, edited] of Object.entries(edits)) {
    if (requiredFieldByPath.has(path)) continue;
    const [group, key] = path.split(".", 2);
    if (!group) continue;
    if (key === undefined) {
      reviewed[group] = coerceEditedValue(original[group], edited);
      continue;
    }
    const originalGroup = asRecord(original[group]);
    if (!originalGroup || !Object.hasOwn(originalGroup, key)) continue;
    const editedGroup = asRecord(reviewed[group]) ?? {};
    reviewed[group] = editedGroup;
    editedGroup[key] = coerceEditedValue(originalGroup[key], edited);
  }
  return reviewed;
}

/**
 * Extracts the missing nested paths reported by the API
 * (`details.missingFields` on FISCAL_VALIDATION_FAILED responses).
 */
export function getBackendMissingFields(error: unknown): string[] {
  if (!(error instanceof AppApiError)) return [];
  const details = error.details;
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return [];
  }
  const missing = (details as Record<string, unknown>).missingFields;
  if (!Array.isArray(missing)) return [];
  return missing.filter(
    (entry): entry is string => typeof entry === "string" && entry.length > 0,
  );
}

function coerceEditedValue(
  original: unknown,
  edited: string,
  field?: FiscalDefaultsField,
): unknown {
  const trimmed = edited.trim();
  if (typeof original === "boolean" || field?.kind === "boolean") {
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    return original ?? trimmed;
  }
  if (typeof original === "number" && trimmed !== "") {
    // Codes like CFOP/NCM keep their textual shape when edited with
    // separators ("5.102"); plain digits keep the original numeric type.
    if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
    return trimmed;
  }
  return trimmed;
}

function isScalar(value: unknown) {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
