const dayLabels: Record<string, string> = {
  friday: "Sexta",
  monday: "Segunda",
  saturday: "Sabado",
  sunday: "Domingo",
  thursday: "Quinta",
  tuesday: "Terca",
  wednesday: "Quarta",
};

export function businessHoursToText(
  businessHours: Record<string, unknown>,
): string {
  const text = businessHours.text;
  if (typeof text === "string") return text;

  const lines = businessHours.lines;
  if (Array.isArray(lines)) {
    return lines.filter((line) => typeof line === "string").join("\n");
  }

  return Object.entries(dayLabels)
    .flatMap(([key, label]) => toDisplayLine(label, businessHours[key]))
    .join("\n");
}

export function textToBusinessHours(text: string): Record<string, unknown> {
  const normalized = text.trim();
  return normalized ? { text: normalized } : {};
}

function toDisplayLine(label: string, value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return [`${label}: ${value.trim()}`];
  }
  if (isOpenCloseRange(value)) {
    return [`${label}: ${value.open} - ${value.close}`];
  }
  return [];
}

function isOpenCloseRange(
  value: unknown,
): value is { close: string; open: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const range = value as Record<string, unknown>;
  return typeof range.open === "string" && typeof range.close === "string";
}
