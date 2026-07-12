export function interpolateWorkflowTemplateClause(
  clause: string,
  variables: Record<string, string>,
): string {
  const unresolved: string[] = [];
  const interpolated = clause.replace(/\{\{[^{}]+\}\}/g, (token) => {
    if (!Object.hasOwn(variables, token)) {
      unresolved.push(token);
      return token;
    }
    return variables[token] ?? "";
  });
  if (unresolved.length) {
    throw new WorkflowTemplateVariableResolutionError(unresolved);
  }
  return interpolated;
}

export class WorkflowTemplateVariableResolutionError extends Error {
  readonly tokens: readonly string[];

  constructor(tokens: readonly string[]) {
    const uniqueTokens = [...new Set(tokens)].sort();
    super(
      `Workflow template has unresolved variables: ${uniqueTokens.join(", ")}`,
    );
    this.name = "WorkflowTemplateVariableResolutionError";
    this.tokens = uniqueTokens;
  }
}

export function createWorkflowTemplateVariables(input: {
  buyer: Record<string, unknown>;
  finance: Record<string, unknown>;
  store?: Record<string, unknown>;
  vehicle: Record<string, unknown>;
}): Record<string, string> {
  return {
    "{{buyer.address}}": text(input.buyer.address),
    "{{buyer.document}}": text(input.buyer.document),
    "{{buyer.email}}": text(input.buyer.email),
    "{{buyer.name}}": text(input.buyer.name),
    "{{buyer.phone}}": text(input.buyer.phone),
    "{{finance.paymentMethod}}": text(input.finance.paymentMethod),
    "{{finance.salePrice}}": money(
      input.finance.salePriceCents ?? input.finance.totalAmountCents,
    ),
    "{{finance.signalAmount}}": money(input.finance.signalAmountCents),
    "{{store.address}}": text(input.store?.address),
    "{{store.document}}": text(input.store?.document),
    "{{store.email}}": text(input.store?.email),
    "{{store.name}}": text(input.store?.name, "Loja Veículos"),
    "{{store.phone}}": text(input.store?.phone),
    "{{vehicle.chassis}}": text(input.vehicle.vin),
    "{{vehicle.color}}": text(input.vehicle.color),
    "{{vehicle.km}}": text(input.vehicle.km),
    "{{vehicle.plate}}": text(input.vehicle.plate),
    "{{vehicle.renavam}}": text(input.vehicle.renavam),
    "{{vehicle.title}}": text(input.vehicle.title),
  };
}

function money(value: unknown): string {
  if (typeof value !== "number") return "-";
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value / 100);
}

function text(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}
