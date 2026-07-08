import type { ReactNode } from "react";
import { countForFilter } from "./crmWhatsappQueueState";
import type {
  CrmWhatsappSessionCounts,
  CrmWhatsappSessionFilter,
  CrmWhatsappTag,
} from "./crmWhatsappTypes";

const quickFilterOptions: Array<{
  label: string;
  value: CrmWhatsappSessionFilter;
}> = [
  { label: "Novos", value: "fresh" },
  { label: "Sem atendente", value: "unassigned" },
  { label: "Meus", value: "mine" },
  { label: "Outros", value: "others" },
  { label: "Todos", value: "all" },
];

export function QueueMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <span className="crm-whatsapp-queue-metric">
      {icon}
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}

export function QueueQuickFilterRow({
  onQuickFilterChange,
  quickFilter,
  sessionCounts,
}: {
  onQuickFilterChange: (filter: CrmWhatsappSessionFilter) => void;
  quickFilter: CrmWhatsappSessionFilter;
  sessionCounts: CrmWhatsappSessionCounts;
}) {
  return (
    <div className="crm-whatsapp-filter-row" aria-label="Filtro rapido">
      {quickFilterOptions.map((option) => (
        <button
          aria-pressed={quickFilter === option.value}
          className={
            quickFilter === option.value
              ? "crm-whatsapp-filter crm-whatsapp-filter-active"
              : "crm-whatsapp-filter"
          }
          key={option.value}
          onClick={() => onQuickFilterChange(option.value)}
          type="button"
        >
          {option.label}
          <span>{countForFilter(sessionCounts, option.value)}</span>
        </button>
      ))}
    </div>
  );
}

export function QueueTagFilterRow({
  availableTags,
  onTagFilterToggle,
  selectedTagIds,
}: {
  availableTags: CrmWhatsappTag[];
  onTagFilterToggle: (tagId: string) => void;
  selectedTagIds: string[];
}) {
  if (availableTags.length === 0) return null;
  return (
    <div
      className="crm-whatsapp-tag-filter-row"
      aria-label="Filtrar por etiquetas"
    >
      {availableTags.slice(0, 8).map((tag) => (
        <button
          aria-pressed={selectedTagIds.includes(tag.id)}
          key={tag.id}
          onClick={() => onTagFilterToggle(tag.id)}
          type="button"
        >
          <i
            aria-hidden="true"
            style={{ backgroundColor: tag.color ?? "var(--color-muted)" }}
          />
          {tag.name}
        </button>
      ))}
    </div>
  );
}
