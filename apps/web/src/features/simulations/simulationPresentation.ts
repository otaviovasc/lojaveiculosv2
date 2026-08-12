import type { CredereSimulation, CredereSimulationCondition } from "./types";

const refusalStatuses = new Set([
  "denied",
  "error",
  "failed",
  "refused",
  "rejected",
  "unavailable",
]);

export type GroupedCredereRefusal = CredereSimulationCondition & {
  affectedInstallments: number[];
  occurrences: number;
};

type CredereConditionIdentity = CredereSimulationCondition & {
  affectedInstallments?: readonly number[];
};

export function conditionResultKey(
  condition: CredereConditionIdentity,
  kind: "accepted" | "refused" = "accepted",
) {
  const bank = [condition.bankCode, condition.bankName]
    .map((value) => normalizeText(value ?? ""))
    .filter(Boolean)
    .join("-");
  const detail = normalizeText(condition.reason ?? condition.summary ?? "");
  const terms = condition.affectedInstallments?.length
    ? [...condition.affectedInstallments].sort((a, b) => a - b).join(",")
    : String(condition.installments ?? "unknown-term");
  return [
    kind,
    bank || "unknown-bank",
    normalizeText(condition.status),
    detail,
    terms,
    String(condition.totalAmountCents ?? "unknown-total"),
  ].join(":");
}

export function conditionResultRenderKey(
  conditions: readonly CredereConditionIdentity[],
  index: number,
  kind: "accepted" | "refused" = "accepted",
) {
  const condition = conditions[index];
  if (!condition) return `${kind}:missing:${index}`;
  const baseKey = conditionResultKey(condition, kind);
  let occurrence = 0;
  for (let cursor = 0; cursor < index; cursor += 1) {
    const previous = conditions[cursor];
    if (previous && conditionResultKey(previous, kind) === baseKey) {
      occurrence += 1;
    }
  }
  return `${baseKey}:${occurrence}`;
}

export function simulationSnapshotsEqual(
  previous: CredereSimulation | null | undefined,
  next: CredereSimulation | null | undefined,
) {
  if (previous === next) return true;
  if (previous == null || next == null) return false;
  return JSON.stringify(previous) === JSON.stringify(next);
}

export function splitSimulationConditions(
  conditions: readonly CredereSimulationCondition[],
) {
  const accepted: CredereSimulationCondition[] = [];
  const refused: CredereSimulationCondition[] = [];
  for (const condition of conditions) {
    if (refusalStatuses.has(normalizeText(condition.status))) {
      refused.push(condition);
    } else {
      accepted.push(condition);
    }
  }
  return { accepted, refused: groupRepeatedRefusals(refused) };
}

export function groupRepeatedRefusals(
  conditions: readonly CredereSimulationCondition[],
): GroupedCredereRefusal[] {
  const groups = new Map<string, GroupedCredereRefusal>();
  for (const condition of conditions) {
    const detail = condition.reason ?? condition.summary ?? "";
    const key = [condition.bankCode ?? condition.bankName ?? "", detail]
      .map(normalizeText)
      .join("::");
    const existing = groups.get(key);
    if (existing) {
      existing.occurrences += 1;
      if (
        condition.installments !== null &&
        !existing.affectedInstallments.includes(condition.installments)
      ) {
        existing.affectedInstallments.push(condition.installments);
        existing.affectedInstallments.sort((a, b) => a - b);
      }
      continue;
    }
    groups.set(key, {
      ...condition,
      affectedInstallments:
        condition.installments === null ? [] : [condition.installments],
      occurrences: 1,
    });
  }
  return [...groups.values()];
}

export function getCredereReasonGuidance(reason: string | null) {
  const normalized = normalizeText(reason ?? "");
  if (normalized.includes("pre-analise") && normalized.includes("andamento")) {
    return {
      body: "Este banco já está analisando o documento. Aguarde a análise existente; reenviar agora não acelera o processo.",
      title: "Pré-análise já em andamento",
    };
  }
  if (
    normalized.includes("molicar") &&
    ["invalido", "incompativel", "nao encontrado", "nao localizado"].some(
      (term) => normalized.includes(term),
    )
  ) {
    return {
      body: "O banco não validou a identificação do veículo. Revise o modelo Molicar e a compatibilidade dos anos antes de criar outra simulação.",
      title: "Veículo não validado na base Molicar",
    };
  }
  return null;
}

export function simulationStatusLabel(status: string) {
  switch (normalizeText(status)) {
    case "available":
      return "Condição disponível";
    case "completed":
      return "Consulta concluída";
    case "denied":
    case "refused":
    case "rejected":
      return "Não disponível";
    case "error":
    case "failed":
      return "Falha informada";
    case "pending":
    case "processing":
    case "requested":
    case "submitted":
      return "Em processamento";
    case "indeterminate":
      return "Resultado indeterminado";
    case "unavailable":
      return "Indisponível";
    default:
      return "Status informado pelo provedor";
  }
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
