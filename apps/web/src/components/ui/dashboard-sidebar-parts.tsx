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
  meta,
  name,
  onClose,
  theme,
}: {
  collapsed: boolean;
  meta: string;
  name: string;
  onClose: (() => void) | undefined;
  theme: AppTheme;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (collapsed) {
    return (
      <div className="flex h-20 items-center justify-center border-b border-line/60 px-2 py-4">
        <img
          src={
            theme === "dark" ? "/icons/logo_lv_white.svg" : "/icons/logo_lv.svg"
          }
          alt="Loja Veículos"
          className="h-6 w-auto max-w-[64px] object-contain select-none transition-transform duration-300 hover:scale-105"
        />
      </div>
    );
  }

  return (
    <div className="relative border-b border-line/60 p-4">
      {/* Brand logo container */}
      <div className="mb-4.5 px-1.5 flex items-center justify-center">
        <img
          src={
            theme === "dark" ? "/icons/logo_lv_white.svg" : "/icons/logo_lv.svg"
          }
          alt="Loja Veículos"
          className="h-7 w-auto object-contain select-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <button
            className="group flex w-full min-w-0 items-center justify-between rounded-xl px-2.5 py-2 text-left border border-line/50 bg-app-elevated/30 hover:bg-app-elevated/70 hover:border-line-strong/50 transition-all duration-300 cursor-pointer shadow-sm"
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-panel dark:bg-white/5 shadow-inner border border-line-strong/10 group-hover:scale-105 transition-transform duration-300 p-1.5">
                <img
                  src={
                    theme === "dark"
                      ? "/icons/logo_lv_white.svg"
                      : "/icons/logo_lv.svg"
                  }
                  alt="Loja"
                  className="size-full object-contain select-none"
                />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-xs.5 font-black text-primary leading-tight group-hover:text-accent transition-colors">
                  {name}
                </span>
                <span className="truncate text-[9px] font-black uppercase tracking-widest text-muted mt-0.5 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {meta}
                </span>
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className={
                "size-3.5 shrink-0 text-muted transition-transform duration-300 " +
                (isOpen
                  ? "rotate-180 text-accent"
                  : "group-hover:text-app-text")
              }
            />
          </button>

          {isOpen ? (
            <>
              <button
                aria-label="Fechar seletor de loja"
                className="fixed inset-0 z-40 cursor-default bg-transparent"
                onClick={() => setIsOpen(false)}
                type="button"
              />
              <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-line bg-panel p-1.5 shadow-xl backdrop-blur-md">
                <button
                  className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-black text-accent bg-accent-soft border border-accent/10 transition-colors cursor-pointer"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  {name}
                </button>
                <div className="mx-2 my-1.5 h-px bg-line/60" />
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-muted transition-colors hover:bg-app-elevated hover:text-app-text cursor-pointer"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  <span className="text-base leading-none font-bold text-accent">
                    +
                  </span>
                  Criar loja
                </button>
              </div>
            </>
          ) : null}
        </div>

        {onClose ? (
          <button
            aria-label="Fechar menu"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted border border-transparent hover:border-line/40 transition-colors hover:bg-app-elevated hover:text-app-text lg:hidden cursor-pointer"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
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
      className={
        "group relative flex min-h-10 items-center rounded-xl text-sm transition-all duration-200 cursor-pointer " +
        (active
          ? "bg-accent-soft border border-accent/15 text-accent font-black shadow-sm"
          : "text-muted hover:bg-app-elevated/60 hover:text-app-text border border-transparent") +
        " " +
        (collapsed
          ? "justify-center px-2"
          : "justify-between gap-3 px-3 hover:translate-x-0.5")
      }
      onClick={() => onSelect(item.id)}
      title={collapsed ? item.title : undefined}
      type="button"
    >
      {/* Visual Accent Strip for Active Item */}
      {active && !collapsed && (
        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-accent" />
      )}

      <span className="flex min-w-0 items-center gap-2.5 relative z-10">
        <span className="flex size-5 shrink-0 items-center justify-center">
          <Icon className="size-4.5 transition-transform duration-300 group-hover:scale-110" />
        </span>
        {collapsed ? null : <span className="truncate">{item.title}</span>}
      </span>

      {collapsed ? null : (
        <span className="flex shrink-0 items-center gap-2 relative z-10">
          {item.shortcut ? (
            <kbd className="hidden h-5 items-center rounded border border-line bg-app px-1.5 font-mono text-[9px] font-bold text-muted group-hover:inline-flex">
              {item.shortcut}
            </kbd>
          ) : null}
          {item.badge ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent border border-accent/15 px-1.5 text-[9px] font-black text-white shadow-sm">
              {item.badge}
            </span>
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
    <div className={"flex gap-2 " + (isCompact ? "flex-col" : "items-center")}>
      <button
        aria-label={
          theme === "dark"
            ? "Alternar para tema claro"
            : "Alternar para tema escuro"
        }
        aria-pressed={theme === "dark"}
        className={
          "group theme-toggle-btn h-10 px-3 flex items-center " +
          (isCompact ? "justify-center w-full" : "flex-1 justify-start gap-2.5")
        }
        onClick={onThemeToggle}
        title={theme === "dark" ? "Tema claro" : "Tema escuro"}
        type="button"
      >
        {theme === "dark" ? (
          <Sun
            aria-hidden="true"
            className="size-4.5 shrink-0 text-warning theme-icon"
          />
        ) : (
          <Moon
            aria-hidden="true"
            className="size-4.5 shrink-0 text-violet-start theme-icon"
          />
        )}
        {!isCompact && (
          <span className="font-semibold text-sm">
            {theme === "dark" ? "Tema Claro" : "Tema Escuro"}
          </span>
        )}
        <div className="gloss-overlay" />
      </button>

      {onCollapsedChange && (
        <button
          aria-label={isCompact ? "Expandir sidebar" : "Recolher sidebar"}
          className={
            "hidden h-10 items-center justify-center rounded-xl border collapse-toggle-btn cursor-pointer lg:flex shrink-0 " +
            (isCompact ? "w-full" : "w-10")
          }
          onClick={() => onCollapsedChange(!isCompact)}
          title={isCompact ? "Expandir" : "Recolher"}
          type="button"
        >
          {isCompact ? (
            <PanelLeftOpen aria-hidden="true" className="size-4.5 shrink-0" />
          ) : (
            <PanelLeftClose aria-hidden="true" className="size-4.5 shrink-0" />
          )}
        </button>
      )}
    </div>
  );
}
