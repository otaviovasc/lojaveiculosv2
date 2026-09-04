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

const BANK_NAMES: Record<string, string> = {
  pan: "Banco PAN",
  bancopan: "Banco PAN",
  bv: "BV Financeira",
  banco_bv: "BV Financeira",
  bancobv: "BV Financeira",
  santander: "Santander Financiamentos",
  banco_santander: "Santander Financiamentos",
  itau: "Itaú Auto",
  banco_itau: "Itaú Auto",
  bradesco: "Bradesco Financiamentos",
  banco_bradesco: "Bradesco Financiamentos",
  safra: "Banco Safra",
  banco_safra: "Banco Safra",
  daycoval: "Banco Daycoval",
  banco_daycoval: "Banco Daycoval",
  omni: "Omni Financeira",
  digimais: "Banco Digimais",
  banco_digimais: "Banco Digimais",
  c6: "C6 Bank",
  c6bank: "C6 Bank",
  volkswagen: "Banco Volkswagen",
  bb: "Banco do Brasil",
  bancodobrasil: "Banco do Brasil",
  caixa: "Caixa Econômica",
  creditas: "Creditas",
};

export function formatBankName(
  bankName: string | null | undefined,
  bankCode?: string | null | undefined,
): string {
  const raw = bankName?.trim() || bankCode?.trim() || "";
  if (!raw) return "Banco Parceiro";
  const key = normalizeText(raw).replace(/[\s_-]+/g, "");
  if (BANK_NAMES[key]) return BANK_NAMES[key];
  for (const [k, v] of Object.entries(BANK_NAMES)) {
    if (key.includes(k)) return v;
  }
  // Title case fallback
  return raw
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const REASON_TRANSLATIONS: Record<string, string> = {
  creditconditionnotfound:
    "Condição de crédito não encontrada para este perfil",
  nomarginavailable: "Sem margem de crédito disponível",
  scoreinsufficient: "Score insuficiente para a política do banco",
  insufficientscore: "Score insuficiente para a política do banco",
  agelimitexceeded: "Idade do veículo ou proponente fora da política do banco",
  vehiclenoteligible: "Veículo não elegível nesta instituição financeira",
  policymismatch: "Perfil fora dos critérios de elegibilidade do banco",
  alreadyinprogress: "Proposta já em andamento nesta instituição",
  cpfrestricted: "Restrição cadastral informada pelo banco",
  documentinvalid: "Divergência cadastral nos documentos",
  systemtimeout: "Tempo limite de resposta do banco parceiro esgotado",
  integrationerror: "Falha temporária de comunicação com o sistema bancário",
  unavailable: "Condição indisponível no momento",
  denied: "Proposta não aprovada pela mesa de crédito",
  refused: "Proposta recusada pelo banco parceiro",
  rejected: "Proposta rejeitada pelas regras da instituição",
};

export function formatCredereReason(
  reason: string | null | undefined,
  identifier?: string | null | undefined,
): string {
  const candidate = reason?.trim() || identifier?.trim() || "";
  if (!candidate) return "O banco não informou detalhes do motivo.";

  const normalized = normalizeText(candidate);
  const key = normalized.replace(/[\s_-]+/g, "");

  if (REASON_TRANSLATIONS[key]) return REASON_TRANSLATIONS[key];

  for (const [k, v] of Object.entries(REASON_TRANSLATIONS)) {
    if (key === k || key.includes(k)) return v;
  }

  // If reason is a snake_case or slug code
  if (/^[a-z0-9_]+$/i.test(candidate)) {
    const humanized = candidate
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
    return humanized;
  }

  return candidate;
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
  if (
    normalized.includes("credit_condition_not_found") ||
    normalized.includes("condicao de credito nao encontrada")
  ) {
    return {
      body: "Nenhuma tabela de financiamento do banco atingiu os critérios com os valores de entrada e prazo informados. Tente ajustar o valor de entrada.",
      title: "Ajuste de entrada sugerido",
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
