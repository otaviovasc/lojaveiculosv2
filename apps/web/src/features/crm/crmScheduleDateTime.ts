export function readScheduleDateParts(
  scheduledAt: string,
  fallbackTime: string,
) {
  const parsedDate =
    scheduledAt && !Number.isNaN(new Date(scheduledAt).getTime())
      ? new Date(scheduledAt)
      : null;
  const timeString =
    scheduledAt && scheduledAt.includes("T")
      ? (scheduledAt.split("T")[1]?.slice(0, 5) ?? fallbackTime)
      : fallbackTime;
  return { parsedDate, timeString };
}
