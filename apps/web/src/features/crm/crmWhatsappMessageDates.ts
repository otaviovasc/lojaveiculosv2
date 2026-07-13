import type { WhatsappMessageDisplayGroup } from "./crmWhatsappMessageGroups";

export function messageGroupTimestamp(group: WhatsappMessageDisplayGroup) {
  const message = group.kind === "media" ? group.messages[0] : group.message;
  return message?.providerTimestamp ?? message?.createdAt ?? "";
}

export function shouldShowMessageDay(
  group: WhatsappMessageDisplayGroup,
  previous?: WhatsappMessageDisplayGroup,
) {
  if (!previous) return true;
  return (
    dayKey(messageGroupTimestamp(group)) !==
    dayKey(messageGroupTimestamp(previous))
  );
}

export function formatWhatsappMessageDay(
  value: string,
  now: Date = new Date(),
) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data desconhecida";
  if (dayKey(date) === dayKey(now)) return "Hoje";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(date) === dayKey(yesterday)) return "Ontem";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function dayKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "invalid";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
