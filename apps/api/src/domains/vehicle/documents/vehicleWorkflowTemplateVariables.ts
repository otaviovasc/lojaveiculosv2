export function interpolateWorkflowTemplateClause(
  clause: string,
  variables: Record<string, string>,
): string {
  return Object.entries(variables).reduce(
    (current, [variable, value]) => current.replaceAll(variable, value),
    clause,
  );
}

export function createWorkflowTemplateVariables(input: {
  buyer: Record<string, unknown>;
  finance: Record<string, unknown>;
  vehicle: Record<string, unknown>;
}): Record<string, string> {
  return {
    "{{buyer.document}}": text(input.buyer.document),
    "{{buyer.name}}": text(input.buyer.name),
    "{{finance.paymentMethod}}": text(input.finance.paymentMethod),
    "{{finance.salePrice}}": money(
      input.finance.salePriceCents ?? input.finance.totalAmountCents,
    ),
    "{{finance.signalAmount}}": money(input.finance.signalAmountCents),
    "{{vehicle.plate}}": text(input.vehicle.plate),
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

function text(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}
