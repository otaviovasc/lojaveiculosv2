import type {
  PdfPaymentRow,
  PdfVehicleInfo,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import {
  formatCurrencyCents,
  formatPdfDate,
} from "../../documents/render/reactPdfFormatHelpers.js";

const transferStatusLabels: Record<string, string> = {
  A_COMBINAR: "A Combinar",
  ISENTO: "Isento",
  NAO_INFORMADO: "Não Informado",
  PAGO_PELA_LOJA: "Pago pela Loja",
  PAGO_PELO_CLIENTE: "Pago pelo Cliente",
};

export const fuelTypeLabels: Record<string, string> = {
  diesel: "Diesel",
  electric: "Elétrico",
  ethanol: "Etanol",
  flex: "Flex",
  gasoline: "Gasolina",
  hybrid: "Híbrido",
  other: "Outro",
};

export function transferStatusLabel(value: unknown): string {
  const key = optionalText(value);
  if (!key) return "Não Informado";
  return transferStatusLabels[key] ?? key;
}

export function paymentSnapshots(value: unknown) {
  if (!Array.isArray(value))
    return [] as {
      row: PdfPaymentRow;
      tradeIn?: Record<string, unknown>;
    }[];
  return value.flatMap((item) => {
    const payment = asRecord(item);
    const amountCents = optionalNumber(payment.amountCents);
    if (amountCents === undefined) return [];
    const installments = optionalNumber(payment.installments);
    return [
      {
        row: {
          date: formatPdfDate(payment.paidAt ?? payment.dueAt),
          description:
            optionalText(payment.description) ??
            (installments && installments > 1
              ? `${installments}x de ${formatCurrencyCents(Math.round(amountCents / installments))}`
              : "-"),
          method: optionalText(payment.method) ?? "-",
          valueCents: amountCents,
        },
        tradeIn: asRecord(payment.tradeInVehicle),
      },
    ];
  });
}

export function tradeInVehicle(
  payments: readonly { tradeIn?: Record<string, unknown> }[],
): PdfVehicleInfo | undefined {
  const tradeIn = payments.find(
    (payment) => payment.tradeIn && Object.keys(payment.tradeIn).length > 0,
  )?.tradeIn;
  return tradeIn ? tradeInVehicleFromMetadata(tradeIn) : undefined;
}

export function tradeInVehicleFromMetadata(
  value: unknown,
): PdfVehicleInfo | undefined {
  const tradeIn = asRecord(value);
  if (!Object.keys(tradeIn).length) return undefined;
  return {
    brand: optionalText(tradeIn.brand),
    chassi: optionalText(tradeIn.chassi),
    color: optionalText(tradeIn.color),
    manufactureYear: optionalNumber(tradeIn.yearFabrication),
    model: optionalText(tradeIn.model),
    modelYear: optionalNumber(tradeIn.yearModel),
    plate: optionalText(tradeIn.plate),
    renavam: optionalText(tradeIn.renavam),
    version: optionalText(tradeIn.version),
    km: optionalNumber(tradeIn.km),
  };
}

export function witnesses(
  metadata: Record<string, unknown>,
): readonly string[] {
  const list = stringArray(metadata.witnesses).filter((name) => name.trim());
  if (list.length) return list;
  return [
    optionalText(metadata.witness1Name),
    optionalText(metadata.witness2Name),
  ].filter((name): name is string => Boolean(name));
}

export function formatReservationDeadline(value: unknown): string | undefined {
  const raw = optionalText(value);
  if (!raw) return undefined;
  const localMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (localMatch) {
    const [, year, month, day, hour, minute] = localMatch;
    return `${day}/${month}/${year} ${hour}:${minute}`;
  }
  const formatted = formatPdfDate(raw);
  return formatted || raw;
}

export function stringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function parseDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
