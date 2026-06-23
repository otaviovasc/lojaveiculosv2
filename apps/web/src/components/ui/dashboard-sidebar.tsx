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

export type DashboardSidebarProps<Id extends string = string> = {
  activeId: Id;
  className?: string;
  collapsed?: boolean;
  items: readonly DashboardSidebarItem<Id>[];
  onClose?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  onSelect: (id: Id) => void;
  onThemeToggle: () => void;
  theme: AppTheme;
  variant?: "desktop" | "mobile";
  workspaceMeta?: string;
  workspaceName: string;
};

export function DashboardSidebar<Id extends string = string>({
  activeId,
  className = "",
  collapsed = false,
  items,
  onClose,
  onCollapsedChange,
  onSelect,
  onThemeToggle,
  theme,
  variant = "desktop",
  workspaceMeta = "Loja atual",
  workspaceName,
}: DashboardSidebarProps<Id>) {
  const isDesktop = variant === "desktop";
  const isCompact = isDesktop && collapsed;

  return (
    <div
      className={
        "flex h-full min-h-0 flex-col border-r border-line/60 bg-gradient-to-b from-panel via-panel to-app-elevated/20 text-app-text font-sans transition-all duration-300 " +
        className
      }
    >
      <SidebarWorkspace
        collapsed={isCompact}
        meta={workspaceMeta}
        name={workspaceName}
        onClose={onClose}
      />

      <nav
        aria-label="Modulos"
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {(() => {
          let lastGroup: string | undefined = undefined;
          return items.map((item) => {
            const showGroupHeader = item.group && item.group !== lastGroup;
            if (showGroupHeader) {
              lastGroup = item.group;
            }
            return (
              <div key={item.id} className="flex flex-col gap-1">
                {showGroupHeader &&
                  (isCompact ? (
                    <div className="h-px bg-line/60 my-2 mx-1" />
                  ) : (
                    <div className="px-3 pt-4 pb-1.5 text-[9px] font-black uppercase tracking-widest text-muted/50 dark:text-muted/40">
                      {item.group}
                    </div>
                  ))}
                <DashboardSidebarNavItem
                  active={item.id === activeId}
                  collapsed={isCompact}
                  item={item}
                  onSelect={onSelect}
                />
              </div>
            );
          });
        })()}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-line/60 px-3 py-3 bg-panel/10">
        <button
          aria-label={
            theme === "dark"
              ? "Alternar para tema claro"
              : "Alternar para tema escuro"
          }
          aria-pressed={theme === "dark"}
          className={
            "group flex min-h-10 items-center rounded-xl border border-line/60 bg-app-elevated/40 text-sm font-bold text-app-text transition-all duration-300 hover:bg-app-elevated/80 hover:border-line cursor-pointer shadow-sm " +
            (isCompact ? "justify-center px-2" : "justify-start gap-2.5 px-3")
          }
          onClick={onThemeToggle}
          title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          type="button"
        >
          {theme === "dark" ? (
            <Sun
              aria-hidden="true"
              className="size-4.5 shrink-0 text-warning transition-transform group-hover:rotate-12"
            />
          ) : (
            <Moon
              aria-hidden="true"
              className="size-4.5 shrink-0 text-violet-start transition-transform group-hover:-rotate-12"
            />
          )}
          {isCompact ? null : (
            <span className="transition-colors group-hover:text-primary">
              {theme === "dark" ? "Tema Claro" : "Tema Escuro"}
            </span>
          )}
        </button>

        {onCollapsedChange ? (
          <button
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
            aria-pressed={collapsed}
            className={
              "hidden min-h-10 items-center rounded-xl border border-line/60 bg-panel/30 text-sm font-bold text-muted transition-all duration-300 hover:bg-app-elevated/50 hover:text-app-text hover:border-line cursor-pointer lg:flex " +
              (isCompact ? "justify-center px-2" : "justify-start gap-2.5 px-3")
            }
            onClick={() => onCollapsedChange(!collapsed)}
            title={collapsed ? "Expandir" : "Recolher"}
            type="button"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-4.5 shrink-0" />
            ) : (
              <PanelLeftClose
                aria-hidden="true"
                className="size-4.5 shrink-0"
              />
            )}
            {isCompact ? null : (
              <span>{collapsed ? "Expandir" : "Recolher"}</span>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SidebarWorkspace({
  collapsed,
  meta,
  name,
  onClose,
}: {
  collapsed: boolean;
  meta: string;
  name: string;
  onClose: (() => void) | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "L";

  if (collapsed) {
    return (
      <div className="flex h-20 items-center justify-center border-b border-line/60">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-strong text-sm font-black italic text-white shadow-md border border-white/10 shrink-0">
          {initial}
        </div>
      </div>
    );
  }

  return (
    <div className="relative border-b border-line/60 p-3">
      <div className="flex items-center gap-2">
        <button
          className="group flex min-w-0 flex-1 items-center justify-between rounded-xl px-2.5 py-2.5 text-left border border-transparent hover:border-line/40 hover:bg-app-elevated/50 transition-all duration-300 cursor-pointer"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-strong text-sm font-black italic text-white shadow-md border border-white/10">
              {initial}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-black text-app-text group-hover:text-accent transition-colors leading-tight">
                {name}
              </span>
              <span className="truncate text-[10px] font-bold uppercase tracking-wider text-muted mt-0.5">
                {meta}
              </span>
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={
              "size-4 shrink-0 text-muted transition-transform duration-300 " +
              (isOpen ? "rotate-180 text-accent" : "group-hover:text-app-text")
            }
          />
        </button>

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

      {isOpen ? (
        <>
          <button
            aria-label="Fechar seletor de loja"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <div className="absolute left-3 right-3 top-[4.5rem] z-50 rounded-xl border border-line bg-panel p-1.5 shadow-xl backdrop-blur-md">
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
  );
}

function DashboardSidebarNavItem<Id extends string>({
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
