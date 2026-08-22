import {
  Check,
  ChevronDown,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { ComponentType, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { AppTheme } from "../../app/theme";
import { Logo } from "./logo";

export type DashboardSidebarItem<Id extends string = string> = {
  badge?: number | string;
  icon: ComponentType<{ className?: string }>;
  id: Id;
  shortcut?: string;
  title: string;
  group?: string;
};

export type SidebarWorkspaceOption = {
  id: string;
  meta?: string;
  name: string;
};

export function SidebarWorkspace({
  collapsed,
  iconUrl,
  logoUrl,
  meta,
  name,
  onClose,
  onWorkspaceSelect,
  theme,
  workspaceId,
  workspaces,
}: {
  collapsed: boolean;
  iconUrl?: string | null | undefined;
  logoUrl?: string | null | undefined;
  meta: string;
  name: string;
  onClose: (() => void) | undefined;
  onWorkspaceSelect?: ((workspaceId: string) => void) | undefined;
  theme: AppTheme;
  workspaceId?: string | undefined;
  workspaces?: readonly SidebarWorkspaceOption[] | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const pickerId = useId();
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const compactLogoUrl = iconUrl ?? logoUrl;
  const availableWorkspaces =
    workspaces?.length && workspaceId
      ? workspaces
      : [{ id: workspaceId ?? "current", meta, name }];
  const canSwitch = Boolean(
    availableWorkspaces.length > 1 && onWorkspaceSelect,
  );

  useEffect(() => {
    if (isOpen) optionRefs.current[activeOptionIndex]?.focus();
  }, [activeOptionIndex, isOpen]);

  const closePicker = (restoreTrigger = false) => {
    setIsOpen(false);
    if (restoreTrigger) triggerRef.current?.focus();
  };

  const togglePicker = () => {
    if (isOpen) {
      closePicker();
      return;
    }
    const selectedIndex = availableWorkspaces.findIndex(
      (workspace) => workspace.id === workspaceId,
    );
    setActiveOptionIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  };

  const focusOption = (index: number) => {
    const normalized =
      (index + availableWorkspaces.length) % availableWorkspaces.length;
    setActiveOptionIndex(normalized);
    optionRefs.current[normalized]?.focus();
  };

  const onPickerKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown") nextIndex = activeOptionIndex + 1;
    if (event.key === "ArrowUp") nextIndex = activeOptionIndex - 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = availableWorkspaces.length - 1;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closePicker(true);
      return;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    focusOption(nextIndex);
  };

  const selectWorkspace = (nextWorkspaceId: string) => {
    closePicker();
    if (nextWorkspaceId !== workspaceId) onWorkspaceSelect?.(nextWorkspaceId);
  };

  const pickerMenu = isOpen ? (
    <>
      <button
        aria-hidden="true"
        className="workspace-sidebar__picker-backdrop"
        onClick={() => closePicker()}
        tabIndex={-1}
        type="button"
      />
      <div
        aria-label="Lojas disponíveis"
        className="workspace-sidebar__picker-menu"
        id={pickerId}
        onKeyDown={onPickerKeyDown}
        role="menu"
      >
        {availableWorkspaces.map((workspace, index) => {
          const active = workspace.id === workspaceId;
          return (
            <button
              aria-checked={active}
              className={`workspace-sidebar__picker-option${active ? " is-active" : ""}`}
              key={workspace.id}
              onClick={() => selectWorkspace(workspace.id)}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              role="menuitemradio"
              tabIndex={index === activeOptionIndex ? 0 : -1}
              type="button"
            >
              <span className="workspace-sidebar__picker-option-copy">
                <strong>{workspace.name}</strong>
                {workspace.meta ? <span>{workspace.meta}</span> : null}
              </span>
              {active ? <Check aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </>
  ) : null;

  if (collapsed) {
    return (
      <div
        className={`workspace-sidebar__brand workspace-sidebar__brand--compact${isOpen ? " is-store-picker-open" : ""}`}
      >
        <button
          aria-controls={canSwitch ? pickerId : undefined}
          aria-expanded={canSwitch ? isOpen : undefined}
          aria-haspopup={canSwitch ? "menu" : undefined}
          aria-label={canSwitch ? `Trocar loja. Atual: ${name}` : name}
          className="workspace-sidebar__compact-workspace-trigger"
          disabled={!canSwitch}
          onClick={togglePicker}
          ref={triggerRef}
          type="button"
        >
          <Logo
            alt=""
            className="workspace-sidebar__compact-logo"
            src={compactLogoUrl}
            variant={theme === "dark" ? "icon-white" : "icon"}
          />
        </button>
        {pickerMenu}
      </div>
    );
  }

  return (
    <div
      className={`workspace-sidebar__brand${isOpen ? " is-store-picker-open" : ""}`}
    >
      <div className="workspace-sidebar__logo-wrap">
        <Logo
          alt={name}
          className="workspace-sidebar__logo"
          src={logoUrl}
          variant={theme === "dark" ? "full-white" : "full"}
        />
      </div>

      <div className="workspace-sidebar__store-row">
        <div className="workspace-sidebar__store-picker">
          <button
            aria-controls={canSwitch ? pickerId : undefined}
            aria-expanded={isOpen}
            aria-haspopup={canSwitch ? "menu" : undefined}
            className="workspace-sidebar__store-trigger"
            disabled={!canSwitch}
            onClick={togglePicker}
            ref={triggerRef}
            type="button"
          >
            <span className="workspace-sidebar__store-identity">
              <span className="workspace-sidebar__store-icon">
                <Logo
                  alt={name}
                  className="workspace-sidebar__store-icon-image"
                  src={compactLogoUrl}
                  variant={theme === "dark" ? "icon-white" : "icon"}
                />
              </span>
              <span className="workspace-sidebar__store-copy">
                <strong>{name}</strong>
                <span>
                  <i aria-hidden="true" />
                  {meta}
                </span>
              </span>
            </span>
            {canSwitch ? (
              <ChevronDown
                aria-hidden="true"
                className={isOpen ? "is-open" : undefined}
              />
            ) : null}
          </button>

          {pickerMenu}
        </div>

        {onClose ? (
          <button
            aria-label="Fechar menu"
            className="workspace-sidebar__close"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardSidebarNavItem<Id extends string>({
  active,
  collapsed,
  item,
  onSelect,
}: {
  active: boolean;
  collapsed: boolean;
  item: DashboardSidebarItem<Id>;
  onSelect: (id: Id) => void;
}) {
  const Icon = item.icon;

  return (
    <button
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.title : undefined}
      className={`workspace-sidebar__nav-item${active ? " is-active" : ""}${collapsed ? " is-compact" : ""}`}
      onClick={() => onSelect(item.id)}
      title={collapsed ? item.title : undefined}
      type="button"
      data-module-id={item.id}
    >
      <span className="workspace-sidebar__nav-copy">
        <span className="workspace-sidebar__nav-icon">
          <Icon aria-hidden="true" />
        </span>
        {collapsed ? null : <span className="truncate">{item.title}</span>}
      </span>

      {collapsed ? null : (
        <span className="workspace-sidebar__nav-meta">
          {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
          {item.badge ? (
            <span className="workspace-sidebar__badge">{item.badge}</span>
          ) : null}
        </span>
      )}
    </button>
  );
}

export function SidebarFooterActions({
  isCompact,
  theme,
  onThemeToggle,
  onCollapsedChange,
}: {
  isCompact: boolean;
  theme: AppTheme;
  onThemeToggle: () => void;
  onCollapsedChange: ((collapsed: boolean) => void) | undefined;
}) {
  return (
    <div
      className={`workspace-sidebar__footer-actions${isCompact ? " is-compact" : ""}`}
    >
      <button
        aria-label={
          theme === "dark"
            ? "Alternar para tema claro"
            : "Alternar para tema escuro"
        }
        aria-pressed={theme === "dark"}
        className={`workspace-sidebar__footer-button${isCompact ? " is-compact" : ""}`}
        onClick={onThemeToggle}
        title={theme === "dark" ? "Tema claro" : "Tema escuro"}
        type="button"
      >
        {theme === "dark" ? (
          <Sun aria-hidden="true" className="workspace-sidebar__footer-icon" />
        ) : (
          <Moon aria-hidden="true" className="workspace-sidebar__footer-icon" />
        )}
        {!isCompact && (
          <span>{theme === "dark" ? "Tema Claro" : "Tema Escuro"}</span>
        )}
      </button>

      {onCollapsedChange && (
        <button
          aria-label={isCompact ? "Expandir sidebar" : "Recolher sidebar"}
          className={`workspace-sidebar__collapse-button${isCompact ? " is-compact" : ""}`}
          onClick={() => onCollapsedChange(!isCompact)}
          title={isCompact ? "Expandir" : "Recolher"}
          type="button"
        >
          {isCompact ? (
            <PanelLeftOpen aria-hidden="true" />
          ) : (
            <PanelLeftClose aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
}
