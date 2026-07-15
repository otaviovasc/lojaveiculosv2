import { Check, ChevronDown, Tags, UserRound } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { FeatureAnchoredPopover } from "../../components/ui/FeaturePopover";
import { countForFilter } from "./crmWhatsappQueueState";
import type {
  CrmWhatsappAssignableMember,
  CrmWhatsappSessionCounts,
  CrmWhatsappSessionFilter,
  CrmWhatsappTag,
} from "./crmWhatsappTypes";

const quickFilterOptions: Array<{
  label: string;
  value: Exclude<CrmWhatsappSessionFilter, "others">;
}> = [
  { label: "Novos", value: "fresh" },
  { label: "Sem atendente", value: "unassigned" },
  { label: "Meus", value: "mine" },
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
  assignableMembers,
  currentUserId,
  onOtherAssigneeChange,
  onQuickFilterChange,
  otherAssigneeId,
  quickFilter,
  sessionCounts,
}: {
  assignableMembers: CrmWhatsappAssignableMember[];
  currentUserId: string | null;
  onOtherAssigneeChange: (assigneeId: string | null) => void;
  onQuickFilterChange: (filter: CrmWhatsappSessionFilter) => void;
  otherAssigneeId: string | null;
  quickFilter: CrmWhatsappSessionFilter;
  sessionCounts: CrmWhatsappSessionCounts;
}) {
  const othersButtonRef = useRef<HTMLButtonElement>(null);
  const [othersOpen, setOthersOpen] = useState(false);
  const otherMembers = assignableMembers.filter(
    (member) =>
      member.isActive && String(member.id) !== String(currentUserId ?? ""),
  );
  return (
    <div className="crm-whatsapp-filter-row" aria-label="Filtro rápido">
      {quickFilterOptions.slice(0, 3).map((option) => (
        <QuickFilterButton
          active={quickFilter === option.value}
          count={countForFilter(sessionCounts, option.value)}
          key={option.value}
          label={option.label}
          onClick={() => onQuickFilterChange(option.value)}
        />
      ))}
      <div className="crm-whatsapp-filter-anchor">
        <button
          aria-expanded={othersOpen}
          aria-haspopup="menu"
          aria-pressed={quickFilter === "others"}
          className={
            quickFilter === "others"
              ? "crm-whatsapp-filter crm-whatsapp-filter-active"
              : "crm-whatsapp-filter"
          }
          onClick={() => {
            onQuickFilterChange("others");
            setOthersOpen((open) => !open);
          }}
          ref={othersButtonRef}
          type="button"
        >
          <span className="crm-whatsapp-filter-label">Outros</span>
          <span>{countForFilter(sessionCounts, "others")}</span>
          <ChevronDown aria-hidden="true" />
        </button>
        <FeatureAnchoredPopover
          anchorRef={othersButtonRef}
          className="crm-whatsapp-filter-menu"
          isOpen={othersOpen}
          onClose={() => setOthersOpen(false)}
        >
          <div aria-label="Atendentes da loja" role="group">
            <FilterMenuOption
              active={!otherAssigneeId}
              label="Todos os atendentes"
              onClick={() => {
                onOtherAssigneeChange(null);
                setOthersOpen(false);
              }}
            />
            {otherMembers.map((member) => (
              <FilterMenuOption
                active={String(member.id) === otherAssigneeId}
                key={member.id}
                label={member.name}
                onClick={() => {
                  onOtherAssigneeChange(String(member.id));
                  setOthersOpen(false);
                }}
              />
            ))}
          </div>
        </FeatureAnchoredPopover>
      </div>
      <QuickFilterButton
        active={quickFilter === "all"}
        count={countForFilter(sessionCounts, "all")}
        label="Todos"
        onClick={() => onQuickFilterChange("all")}
      />
    </div>
  );
}

export function QueueTagFilterMenu({
  availableTags,
  onTagFilterToggle,
  selectedTagIds,
}: {
  availableTags: CrmWhatsappTag[];
  onTagFilterToggle: (tagId: string) => void;
  selectedTagIds: string[];
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  if (availableTags.length === 0) return null;

  return (
    <div className="crm-whatsapp-filter-anchor">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className={
          selectedTagIds.length
            ? "crm-whatsapp-queue-dropdown crm-whatsapp-queue-dropdown-active"
            : "crm-whatsapp-queue-dropdown"
        }
        onClick={() => setOpen((current) => !current)}
        ref={anchorRef}
        type="button"
      >
        <Tags aria-hidden="true" />
        <span>Etiquetas</span>
        {selectedTagIds.length ? (
          <strong>{selectedTagIds.length}</strong>
        ) : null}
        <ChevronDown aria-hidden="true" />
      </button>
      <FeatureAnchoredPopover
        anchorRef={anchorRef}
        className="crm-whatsapp-filter-menu"
        isOpen={open}
        onClose={() => setOpen(false)}
      >
        <div aria-label="Filtrar por etiquetas" role="group">
          {availableTags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <button
                aria-pressed={selected}
                className="crm-whatsapp-filter-menu-option"
                key={tag.id}
                onClick={() => onTagFilterToggle(tag.id)}
                type="button"
              >
                <span className="crm-whatsapp-filter-menu-check">
                  {selected ? <Check aria-hidden="true" /> : null}
                </span>
                <i
                  aria-hidden="true"
                  style={{ backgroundColor: tag.color ?? "var(--color-muted)" }}
                />
                <span>
                  {tag.emoji ? `${tag.emoji} ` : ""}
                  {tag.name}
                </span>
              </button>
            );
          })}
        </div>
      </FeatureAnchoredPopover>
    </div>
  );
}

function QuickFilterButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={
        active
          ? "crm-whatsapp-filter crm-whatsapp-filter-active"
          : "crm-whatsapp-filter"
      }
      onClick={onClick}
      type="button"
    >
      {label}
      <span>{count}</span>
    </button>
  );
}

function FilterMenuOption({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className="crm-whatsapp-filter-menu-option"
      onClick={onClick}
      type="button"
    >
      <span className="crm-whatsapp-filter-menu-avatar">
        <UserRound aria-hidden="true" />
      </span>
      <span>{label}</span>
      {active ? <Check aria-hidden="true" /> : null}
    </button>
  );
}
