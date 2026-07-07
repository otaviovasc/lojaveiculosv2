import type {
  CrmWhatsappScheduledMessage,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";

export type CampaignCsvRow = {
  name: string;
  phone: string;
};

export function parseCampaignCsv(value: string): CampaignCsvRow[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [phone = "", name = ""] = line
        .split(",")
        .map((part) => part.trim());
      return { name, phone: normalizePhone(phone) };
    })
    .filter((row) => row.phone && row.phone !== "telefone");
}

export function matchCampaignCsvRows(
  rows: CampaignCsvRow[],
  sessions: CrmWhatsappSession[],
) {
  const phones = new Set(rows.map((row) => row.phone));
  return sessions.filter((session) =>
    phones.has(normalizePhone(session.buyerPhone ?? "")),
  );
}

export function renderCampaignMessage(
  template: string,
  session: CrmWhatsappSession,
) {
  return template.replaceAll("{nome}", session.buyerName?.trim() || "cliente");
}

export function summarizeCampaignSchedules(
  messages: CrmWhatsappScheduledMessage[],
) {
  return [
    { label: "Pendentes", value: countStatus(messages, "pending") },
    { label: "Enviadas", value: countStatus(messages, "sent") },
    { label: "Falhas", value: countStatus(messages, "failed") },
    { label: "Canceladas", value: countStatus(messages, "cancelled") },
  ];
}

export function readMinDateTimeLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  ].join("T");
}

function countStatus(
  messages: CrmWhatsappScheduledMessage[],
  status: CrmWhatsappScheduledMessage["status"],
) {
  return messages.filter((item) => item.status === status).length;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}
