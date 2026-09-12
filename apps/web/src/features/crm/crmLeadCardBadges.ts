import type { ProductCrmLead } from "./productCrmTypes";

export type LeadFinancingBadge = {
  status: "approved" | "rejected" | "pending";
  label: string;
  bank?: string | undefined;
  amountFormatted?: string | undefined;
};

export type LeadVisitBadge = {
  datetimeFormatted: string;
  vehicleLabel?: string | undefined;
};

export type LeadTemperatureBadge = {
  type: "hot" | "cold" | "after_sale";
  label: string;
};

export type LeadCrmTag = {
  id?: string | undefined;
  name: string;
  color?: string | undefined;
  emoji?: string | undefined;
};

export function cleanPhoneForWhatsapp(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

export function readLeadFinancingBadge(
  metadata: Record<string, unknown>,
): LeadFinancingBadge | null {
  // Check V1 status_financiamento format
  const v1Financing = metadata.status_financiamento;
  if (v1Financing && typeof v1Financing === "object") {
    const f = v1Financing as Record<string, unknown>;
    const statusStr = String(f.status ?? "").toUpperCase();
    const bank = typeof f.banco === "string" ? f.banco.trim() : undefined;
    const rawVal = f.valorAprovado;
    const valNum =
      typeof rawVal === "number"
        ? rawVal
        : typeof rawVal === "string"
          ? parseFloat(rawVal)
          : undefined;
    const amountFormatted =
      valNum && !isNaN(valNum)
        ? new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
          }).format(valNum)
        : undefined;

    if (statusStr === "APROVADO") {
      return {
        status: "approved",
        label: "Financ. Aprovado",
        bank,
        amountFormatted,
      };
    }
    if (statusStr === "REPROVADO") {
      return { status: "rejected", label: "Financ. Reprovado", bank };
    }
  }

  // Check V2 financing / financingStatus format
  const v2Financing = metadata.financingStatus ?? metadata.financing;
  if (v2Financing) {
    if (typeof v2Financing === "string") {
      const s = v2Financing.toLowerCase();
      if (s === "approved" || s === "aprovado") {
        return { status: "approved", label: "Financ. Aprovado" };
      }
      if (s === "rejected" || s === "reprovado") {
        return { status: "rejected", label: "Financ. Reprovado" };
      }
      if (s === "pending" || s === "in_review" || s === "analise") {
        return { status: "pending", label: "Financ. em análise" };
      }
    } else if (typeof v2Financing === "object") {
      const f = v2Financing as Record<string, unknown>;
      const s = String(f.status ?? "").toLowerCase();
      const bank =
        typeof f.bankName === "string"
          ? f.bankName
          : typeof f.bank === "string"
            ? f.bank
            : undefined;
      const rawCents = f.approvedAmountCents ?? f.amountCents;
      const amountFormatted =
        typeof rawCents === "number"
          ? new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              maximumFractionDigits: 0,
            }).format(rawCents / 100)
          : undefined;

      if (s === "approved" || s === "aprovado") {
        return {
          status: "approved",
          label: "Financ. Aprovado",
          bank,
          amountFormatted,
        };
      }
      if (s === "rejected" || s === "reprovado") {
        return { status: "rejected", label: "Financ. Reprovado", bank };
      }
      if (s === "pending" || s === "in_review" || s === "analise") {
        return { status: "pending", label: "Financ. em análise", bank };
      }
    }
  }

  return null;
}

export function readLeadVisitBadge(
  metadata: Record<string, unknown>,
): LeadVisitBadge | null {
  const visitData =
    metadata.visita_agendada ?? metadata.visit ?? metadata.scheduled_visit;
  if (!visitData || typeof visitData !== "object") return null;

  const v = visitData as Record<string, unknown>;
  const rawDate = v.datetime ?? v.scheduledAt ?? v.date;
  if (typeof rawDate !== "string" || !rawDate) return null;

  try {
    const parsed = new Date(rawDate);
    if (isNaN(parsed.getTime())) return null;

    const datetimeFormatted = parsed.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const vehicleLabel =
      typeof v.veiculoLabel === "string"
        ? v.veiculoLabel
        : typeof v.vehicleTitle === "string"
          ? v.vehicleTitle
          : undefined;

    return { datetimeFormatted, vehicleLabel };
  } catch {
    return null;
  }
}

export function readLeadTemperatureBadge(
  metadata: Record<string, unknown>,
): LeadTemperatureBadge | null {
  const rawTag = metadata.tag ?? metadata.temperature;
  if (typeof rawTag !== "string") return null;

  const upper = rawTag.toUpperCase();
  if (upper === "LEAD_QUENTE" || upper === "HOT") {
    return { type: "hot", label: "Quente" };
  }
  if (upper === "LEAD_FRIO" || upper === "COLD") {
    return { type: "cold", label: "Frio" };
  }
  if (upper === "POS_VENDA" || upper === "AFTER_SALE") {
    return { type: "after_sale", label: "Pós-Venda" };
  }
  return null;
}

export function readLeadCrmTags(
  metadata: Record<string, unknown>,
): LeadCrmTag[] {
  const rawCandidate = metadata.tags_crm ?? metadata.tags;
  if (!Array.isArray(rawCandidate)) return [];
  const raw: readonly unknown[] = rawCandidate;

  const result: LeadCrmTag[] = [];
  for (let idx = 0; idx < raw.length; idx++) {
    const item = raw[idx];
    if (typeof item === "string" && item.trim()) {
      result.push({ id: `tag_${idx}`, name: item.trim() });
    } else if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const name = typeof obj.name === "string" ? obj.name.trim() : "";
      if (name) {
        result.push({
          id:
            typeof obj.id === "string" || typeof obj.id === "number"
              ? String(obj.id)
              : `tag_${idx}`,
          name,
          color: typeof obj.color === "string" ? obj.color : undefined,
          emoji: typeof obj.emoji === "string" ? obj.emoji : undefined,
        });
      }
    }
  }
  return result;
}

export function isLeadUnread(lead: ProductCrmLead): boolean {
  if (lead.metadata.read === false || lead.metadata.unread === true) {
    return true;
  }
  return false;
}

export type QuickScheduleOption = {
  label: string;
  dueAt: string;
};

export function getQuickScheduleDates(
  now: Date = new Date(),
): QuickScheduleOption[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDateOnly = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Hoje (17:00)
  const today = new Date(now);
  const todayIso = `${formatDateOnly(today)}T17:00:00`;

  // Amanhã (10:00)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = `${formatDateOnly(tomorrow)}T10:00:00`;

  // Segunda-feira (10:00)
  const nextMonday = new Date(now);
  const dayOfWeek = nextMonday.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  const mondayIso = `${formatDateOnly(nextMonday)}T10:00:00`;

  // Próxima semana (+7 dias 10:00)
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekIso = `${formatDateOnly(nextWeek)}T10:00:00`;

  return [
    { label: "Hoje (17h)", dueAt: todayIso },
    { label: "Amanhã (10h)", dueAt: tomorrowIso },
    { label: "Segunda-feira (10h)", dueAt: mondayIso },
    { label: "Próxima semana", dueAt: nextWeekIso },
  ];
}

export const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

export type LeadNextTaskBadge = {
  id: string;
  title: string;
  dueAt: string;
  status: "overdue" | "today" | "tomorrow" | "date";
  label: string;
};

export function getSaoPauloDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  return `${values.year}-${values.month}-${values.day}`;
}

export function readLeadNextTaskBadge(
  nextTask: ProductCrmLead["nextTask"],
  now: Date = new Date(),
): LeadNextTaskBadge | null {
  if (!nextTask || !nextTask.dueAt) return null;
  const dueDate = new Date(nextTask.dueAt);
  if (isNaN(dueDate.getTime())) return null;

  const todayKey = getSaoPauloDateKey(now);
  const dueKey = getSaoPauloDateKey(dueDate);

  const [y, m, d] = todayKey.split("-").map(Number);
  const tomorrowUtc = new Date(Date.UTC(y!, m! - 1, d! + 1));
  const tomorrowKey = `${tomorrowUtc.getUTCFullYear()}-${String(tomorrowUtc.getUTCMonth() + 1).padStart(2, "0")}-${String(tomorrowUtc.getUTCDate()).padStart(2, "0")}`;

  if (dueKey < todayKey) {
    return {
      id: nextTask.id,
      title: nextTask.title,
      dueAt: nextTask.dueAt,
      status: "overdue",
      label: "Atrasada",
    };
  }

  if (dueKey === todayKey) {
    return {
      id: nextTask.id,
      title: nextTask.title,
      dueAt: nextTask.dueAt,
      status: "today",
      label: "Hoje",
    };
  }

  if (dueKey === tomorrowKey) {
    return {
      id: nextTask.id,
      title: nextTask.title,
      dueAt: nextTask.dueAt,
      status: "tomorrow",
      label: "Amanhã",
    };
  }

  const [nowY] = todayKey.split("-");
  const [dueY] = dueKey.split("-");
  const formattedDate = dueDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: nowY !== dueY ? "numeric" : undefined,
    timeZone: SAO_PAULO_TIME_ZONE,
  });

  return {
    id: nextTask.id,
    title: nextTask.title,
    dueAt: nextTask.dueAt,
    status: "date",
    label: formattedDate,
  };
}
