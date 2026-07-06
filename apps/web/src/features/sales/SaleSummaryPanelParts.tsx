export function SummaryRow({
  label,
  value,
  valueClassName = "text-app-text",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <dt className="text-muted font-bold">{label}</dt>
      <dd className={valueClassName}>{value}</dd>
    </div>
  );
}
