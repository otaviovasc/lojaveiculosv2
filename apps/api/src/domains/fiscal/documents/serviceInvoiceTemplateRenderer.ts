const variablePattern = /\{([a-zA-Z0-9_.]+)\}/g;

export const fiscalTemplateVariables = [
  "customer.document",
  "customer.documentMasked",
  "customer.email",
  "customer.name",
  "customer.phone",
  "invoice.competenceMonth",
  "invoice.competenceYear",
  "invoice.grossAmount",
  "invoice.irrfAmount",
  "invoice.issAmount",
  "invoice.netAmount",
  "recipient.city",
  "recipient.document",
  "recipient.legalName",
  "recipient.state",
  "sale.commissionAmount",
  "sale.date",
  "sale.downPaymentAmount",
  "sale.financedAmount",
  "sale.id",
  "sale.periodReference",
  "sale.totalAmount",
  "vehicle.brand",
  "vehicle.chassis",
  "vehicle.color",
  "vehicle.fuelType",
  "vehicle.model",
  "vehicle.modelYear",
  "vehicle.odometer",
  "vehicle.plate",
  "vehicle.renavam",
  "vehicle.salePrice",
  "vehicle.version",
  "vehicle.year",
] as const;

const allowedVariables = new Set<string>(fiscalTemplateVariables);

export type RenderFiscalTemplateResult = {
  renderedDescription: string;
  unresolvedVariables: readonly string[];
  usedVariables: readonly string[];
};

export function renderFiscalTemplate(
  template: string,
  variables: Record<string, unknown>,
): RenderFiscalTemplateResult {
  const unresolved = new Set<string>();
  const used = new Set<string>();
  const renderedDescription = template.replace(
    variablePattern,
    (placeholder, path: string) => {
      if (!allowedVariables.has(path)) {
        unresolved.add(path);
        return placeholder;
      }
      const value = readPath(variables, path);
      if (value === undefined || value === null || value === "") {
        unresolved.add(path);
        return placeholder;
      }
      used.add(path);
      return String(value);
    },
  );

  return {
    renderedDescription,
    unresolvedVariables: [...unresolved],
    usedVariables: [...used],
  };
}

function readPath(source: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, source);
}
