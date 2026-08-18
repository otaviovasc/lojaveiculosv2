import { Check, ChevronDown, Tags, UsersRound } from "lucide-react";
import {
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { FeatureAnchoredPopover } from "../../components/ui/FeaturePopover";
import { countForFilter } from "./crmQueueState";
import type {
  CrmAssignableMember,
  CrmConversationCycleCounts,
  CrmConversationCycleFilter,
  CrmTag,
} from "./crmConversationTypes";

const quickFilterOptions: Array<{
  label: string;
  value: Exclude<CrmConversationCycleFilter, "others">;
}> = [
  { label: "Novos", value: "fresh" },
  { label: "Sem atendente", value: "unassigned" },
  { label: "Meus", value: "mine" },
  { label: "Todos", value: "all" },
];

export function QueueQuickFilterRow({
  assignableMembers,
  canAssign,
  currentUserId,
  onOtherAssigneeChange,
  onQuickFilterChange,
  otherAssigneeId,
  quickFilter,
  conversationCycleCounts,
}: {
  assignableMembers: CrmAssignableMember[];
  canAssign: boolean;
  currentUserId: string | null;
  onOtherAssigneeChange: (assigneeId: string | null) => void;
  onQuickFilterChange: (filter: CrmConversationCycleFilter) => void;
  otherAssigneeId: string | null;
  quickFilter: CrmConversationCycleFilter;
  conversationCycleCounts: CrmConversationCycleCounts;
}) {
  const othersButtonRef = useRef<HTMLButtonElement>(null);
  const othersButtonId = useId();
  const othersListboxId = useId();
  const othersInitialFocusRef = useRef<"first" | "last">("first");
  const [othersOpen, setOthersOpen] = useState(false);
  const countsByAssignee = new Map(
    conversationCycleCounts.assignees.map((item) => [
      item.assigneeId,
      item.count,
    ]),
  );
  const otherMembers = assignableMembers
    .filter(
      (member) =>
        member.isActive && String(member.id) !== String(currentUserId ?? ""),
    )
    .map((member) => ({
      ...member,
      activeChatCount: countsByAssignee.get(String(member.id)) ?? 0,
    }))
    .sort(
      (left, right) =>
        (right.activeChatCount ?? 0) - (left.activeChatCount ?? 0) ||
        left.name.localeCompare(right.name, "pt-BR"),
    );
  if (!canAssign) {
    return (
      <div className="crm-filter-row" aria-label="Filtros rápidos" role="group">
        <QuickFilterButton
          active
          count={countForFilter(conversationCycleCounts, "mine")}
          label="Meus"
          onClick={() => onQuickFilterChange("mine")}
        />
      </div>
    );
  }
  return (
    <div className="crm-filter-row" aria-label="Filtros rápidos" role="group">
      {quickFilterOptions.slice(0, 3).map((option) => (
        <QuickFilterButton
          active={quickFilter === option.value}
          count={countForFilter(conversationCycleCounts, option.value)}
          key={option.value}
          label={option.label}
          onClick={() => onQuickFilterChange(option.value)}
        />
      ))}
      <div className="crm-filter-anchor">
        <button
          aria-controls={othersListboxId}
          aria-expanded={othersOpen}
          aria-haspopup="listbox"
          aria-pressed={quickFilter === "others"}
          className={
            quickFilter === "others"
              ? "crm-filter crm-filter-active"
              : "crm-filter"
          }
          onClick={() => {
            othersInitialFocusRef.current = "first";
            onQuickFilterChange("others");
            setOthersOpen((open) => !open);
          }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            event.preventDefault();
            othersInitialFocusRef.current =
              event.key === "ArrowUp" ? "last" : "first";
            onQuickFilterChange("others");
            setOthersOpen(true);
          }}
          id={othersButtonId}
          ref={othersButtonRef}
          type="button"
        >
          <span className="crm-filter-label">Outros</span>
          <span>{countForFilter(conversationCycleCounts, "others")}</span>
          <ChevronDown aria-hidden="true" />
        </button>
        <FeatureAnchoredPopover
          anchorRef={othersButtonRef}
          ariaLabel="Atendentes da loja"
          className="crm-filter-menu"
          id={othersListboxId}
          initialFocus={othersInitialFocusRef.current}
          isOpen={othersOpen}
          onClose={() => setOthersOpen(false)}
          onKeyDown={handlePopupNavigation}
          role="listbox"
        >
          <AssigneeFilterOption
            active={!otherAssigneeId}
            count={countForFilter(conversationCycleCounts, "others")}
            label="Todos os atendentes"
            onClick={() => {
              onOtherAssigneeChange(null);
              setOthersOpen(false);
            }}
            subtitle="Outros responsáveis"
          />
          {otherMembers.map((member) => (
            <AssigneeFilterOption
              active={String(member.id) === otherAssigneeId}
              count={member.activeChatCount ?? 0}
              key={member.id}
              label={member.name}
              onClick={() => {
                onOtherAssigneeChange(String(member.id));
                setOthersOpen(false);
              }}
              subtitle={formatCrmMemberRole(member.role)}
            />
          ))}
        </FeatureAnchoredPopover>
      </div>
      <QuickFilterButton
        active={quickFilter === "all"}
        count={countForFilter(conversationCycleCounts, "all")}
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
  availableTags: CrmTag[];
  onTagFilterToggle: (tagId: string) => void;
  selectedTagIds: string[];
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const buttonId = useId();
  const menuId = useId();
  const initialFocusRef = useRef<"first" | "last">("first");
  const [open, setOpen] = useState(false);
  if (availableTags.length === 0) return null;

  return (
    <div className="crm-filter-anchor">
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        className={
          selectedTagIds.length
            ? "crm-queue-dropdown crm-queue-dropdown-active"
            : "crm-queue-dropdown"
        }
        id={buttonId}
        onClick={() => {
          initialFocusRef.current = "first";
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          initialFocusRef.current = event.key === "ArrowUp" ? "last" : "first";
          setOpen(true);
        }}
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
        ariaLabel="Filtrar por etiquetas"
        className="crm-filter-menu"
        id={menuId}
        initialFocus={initialFocusRef.current}
        isOpen={open}
        onClose={() => setOpen(false)}
        onKeyDown={handlePopupNavigation}
      >
        <div aria-label="Etiquetas disponíveis" role="group">
          {availableTags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <button
                aria-checked={selected}
                className="crm-filter-menu-option"
                key={tag.id}
                onClick={() => onTagFilterToggle(tag.id)}
                role="menuitemcheckbox"
                type="button"
              >
                <span className="crm-filter-menu-check">
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

function handlePopupNavigation(event: ReactKeyboardEvent<HTMLDivElement>) {
  if (
    event.key !== "ArrowDown" &&
    event.key !== "ArrowUp" &&
    event.key !== "Home" &&
    event.key !== "End"
  ) {
    return;
  }
  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      '[role="option"]:not([aria-disabled="true"]), [role="menuitemcheckbox"]:not([aria-disabled="true"])',
    ),
  );
  if (items.length === 0) return;
  event.preventDefault();
  const currentIndex = items.indexOf(document.activeElement as HTMLElement);
  let nextIndex = 0;
  if (event.key === "End") nextIndex = items.length - 1;
  if (event.key === "ArrowUp") {
    nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
  }
  if (event.key === "ArrowDown") {
    nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
  }
  items[nextIndex]?.focus();
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
      className={active ? "crm-filter crm-filter-active" : "crm-filter"}
      onClick={onClick}
      type="button"
    >
      {label}
      <span>{count}</span>
    </button>
  );
}

function AssigneeFilterOption({
  active,
  count,
  label,
  onClick,
  subtitle,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
  subtitle: string;
}) {
  return (
    <button
      aria-selected={active}
      className="crm-assignee-option"
      onClick={onClick}
      role="option"
      type="button"
    >
      <span className="crm-assignee-check">
        {active ? <Check aria-hidden="true" /> : null}
      </span>
      <span aria-hidden="true" className="crm-assignee-avatar">
        {label === "Todos os atendentes" ? (
          <UsersRound aria-hidden="true" />
        ) : (
          label.slice(0, 1).toLocaleUpperCase("pt-BR")
        )}
      </span>
      <span className="crm-assignee-copy">
        <strong>{label}</strong>
        <small>{subtitle}</small>
      </span>
      <span className="crm-assignee-count">{count > 999 ? "999+" : count}</span>
    </button>
  );
}

export function formatCrmMemberRole(role: string) {
  const labels: Record<string, string> = {
    ADMIN: "Administrador",
    AGENCY: "Gestor da agência",
    INVESTOR: "Investidor",
    MEMBER: "Vendedor",
    OWNER: "Dono",
    SALESMAN: "Vendedor",
    SUPERVISOR: "Supervisor",
  };
  return labels[role.toLocaleUpperCase("pt-BR")] ?? "Membro da equipe";
}
