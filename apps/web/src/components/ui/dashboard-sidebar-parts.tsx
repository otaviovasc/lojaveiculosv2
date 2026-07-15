import {
  ChevronDown,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  X,
} from "lucide-react";
import { useState } from "react";
import type { ComponentType } from "react";
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

export function SidebarWorkspace({
  collapsed,
  iconUrl,
  logoUrl,
  meta,
  name,
  onClose,
  theme,
}: {
  collapsed: boolean;
  iconUrl?: string | null | undefined;
  logoUrl?: string | null | undefined;
  meta: string;
  name: string;
  onClose: (() => void) | undefined;
  theme: AppTheme;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const compactLogoUrl = iconUrl ?? logoUrl;

  if (collapsed) {
    return (
      <div className="workspace-sidebar__brand workspace-sidebar__brand--compact">
        <Logo
          alt={name}
          className="workspace-sidebar__compact-logo"
          src={compactLogoUrl}
          variant={theme === "dark" ? "icon-white" : "icon"}
        />
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
            aria-expanded={isOpen}
            className="workspace-sidebar__store-trigger"
            onClick={() => setIsOpen((current) => !current)}
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
            <ChevronDown
              aria-hidden="true"
              className={isOpen ? "is-open" : undefined}
            />
          </button>

          {isOpen ? (
            <>
              <button
                aria-label="Fechar seletor de loja"
                className="workspace-sidebar__picker-backdrop"
                onClick={() => setIsOpen(false)}
                type="button"
              />
              <div className="workspace-sidebar__picker-menu">
                <button
                  className="workspace-sidebar__picker-option is-active"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  {name}
                </button>
                <div className="workspace-sidebar__picker-divider" />
                <button
                  className="workspace-sidebar__picker-option"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  <span aria-hidden="true">+</span>
                  Criar loja
                </button>
              </div>
            </>
          ) : null}
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
        className="workspace-sidebar__footer-button"
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
          className="workspace-sidebar__collapse-button"
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
