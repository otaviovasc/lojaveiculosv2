export function readMinDateTimeLocal(now = new Date()) {
  const nextMinute = new Date(now);
  nextMinute.setSeconds(0, 0);
  nextMinute.setMinutes(nextMinute.getMinutes() + 1);
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    `${nextMinute.getFullYear()}-${pad(nextMinute.getMonth() + 1)}-${pad(nextMinute.getDate())}`,
    `${pad(nextMinute.getHours())}:${pad(nextMinute.getMinutes())}`,
  ].join("T");
}
