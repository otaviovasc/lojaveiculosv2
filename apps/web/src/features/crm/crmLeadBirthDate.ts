const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

export function getSaoPauloTodayIsoDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatLeadBirthDate(value: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return "Não informado";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function normalizeLeadBirthDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const canonical = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? trimmed
    : (() => {
        const brazilianDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
        return brazilianDate
          ? `${brazilianDate[3]}-${brazilianDate[2]}-${brazilianDate[1]}`
          : null;
      })();
  return canonical && isValidLeadBirthDate(canonical) ? canonical : null;
}

export function isValidLeadBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }
  return value <= getSaoPauloTodayIsoDate();
}
