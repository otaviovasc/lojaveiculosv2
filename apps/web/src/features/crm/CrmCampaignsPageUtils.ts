import type {
  CrmScheduledMessage,
  CrmConversationCycle,
} from "./crmConversationTypes";
export { readMinDateTimeLocal } from "./crmDateTimeLocal";

export type CampaignCsvRow = {
  name: string;
  phone: string;
  rawPhone: string;
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
      return { name, phone: normalizePhone(phone), rawPhone: phone };
    })
    .filter((row) => row.phone && row.phone !== "telefone");
}

export function matchCampaignCsvRows(
  rows: CampaignCsvRow[],
  conversationCycles: CrmConversationCycle[],
) {
  const phones = new Set(rows.map((row) => row.phone));
  return conversationCycles.filter((cycle) =>
    phones.has(normalizePhone(cycle.customerPhone ?? "")),
  );
}

export function renderCampaignMessage(
  template: string,
  cycle: CrmConversationCycle,
) {
  return template.replaceAll(
    "{nome}",
    cycle.customerDisplayName?.trim() || "cliente",
  );
}

export function summarizeCampaignSchedules(messages: CrmScheduledMessage[]) {
  return [
    { label: "Pendentes", value: countStatus(messages, "pending") },
    { label: "Enviadas", value: countStatus(messages, "sent") },
    { label: "Falhas", value: countStatus(messages, "failed") },
    { label: "Canceladas", value: countStatus(messages, "cancelled") },
  ];
}

function countStatus(
  messages: CrmScheduledMessage[],
  status: CrmScheduledMessage["status"],
) {
  return messages.filter((item) => item.status === status).length;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}
