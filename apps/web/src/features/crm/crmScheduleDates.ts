export function isFutureScheduleValue(value: string) {
  const date = new Date(value);
  return Boolean(value && !Number.isNaN(date.getTime()) && date > new Date());
}

export function formatScheduleDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Horario ainda nao definido";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function readMinScheduleDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  ].join("T");
}
