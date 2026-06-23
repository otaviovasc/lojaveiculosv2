import { Moon, PanelLeftClose, PanelLeftOpen, Sun, User } from "lucide-react";
import type { ComponentType } from "react";
import type { AppTheme } from "../../app/theme";
import {
  DashboardSidebarNavItem,
  SidebarWorkspace,
} from "./dashboard-sidebar-parts";

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

  const settingsItem = items.find((item) => item.id === "settings");
  const mainItems = items.filter((item) => item.id !== "settings");

  return (
    <div
      className={
        "flex h-full min-h-0 flex-col border-r border-line/60 bg-panel text-app-text font-sans transition-all duration-300 " +
        className
      }
    >
      <SidebarWorkspace
        collapsed={isCompact}
        meta={workspaceMeta}
        name={workspaceName}
        onClose={onClose}
        theme={theme}
      />

      <nav
        aria-label="Modulos"
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {(() => {
          let lastGroup: string | undefined = undefined;
          return mainItems.map((item) => {
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
        {isCompact ? (
          <>
            {/* Mocked Profile Icon in compact mode */}
            <div className="flex justify-center py-1">
              <div
                className="size-9 bg-accent-soft text-accent rounded-full flex items-center justify-center font-bold border border-accent/15"
                title="João Silva (Administrador)"
              >
                <User className="size-4.5" />
              </div>
            </div>

            {settingsItem && (
              <DashboardSidebarNavItem
                active={activeId === "settings"}
                collapsed={isCompact}
                item={settingsItem}
                onSelect={onSelect}
              />
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {/* User Profile (to the left of settings) */}
              <div className="flex flex-1 items-center gap-2.5 min-w-0 px-2 py-1">
                <div className="size-9 bg-accent-soft text-accent rounded-full flex items-center justify-center font-bold shrink-0 border border-accent/15">
                  <User className="size-4.5" />
                </div>
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="truncate text-xs font-black text-primary">
                    João Silva
                  </span>
                  <span className="truncate text-[9px] font-black uppercase tracking-widest text-muted mt-0.5">
                    Administrador
                  </span>
                </div>
              </div>

              {settingsItem && (
                <button
                  aria-label={settingsItem.title}
                  className={
                    "group size-10 shrink-0 flex items-center justify-center rounded-xl border border-transparent transition-all duration-200 cursor-pointer " +
                    (activeId === "settings"
                      ? "bg-accent-soft border-accent/15 text-accent font-black shadow-sm"
                      : "text-muted hover:bg-app-elevated/60 hover:text-app-text hover:border-line/40")
                  }
                  onClick={() => onSelect(settingsItem.id)}
                  title={settingsItem.title}
                  type="button"
                >
                  <settingsItem.icon className="size-4.5 transition-transform duration-300 group-hover:scale-110" />
                </button>
              )}
            </div>
          </>
        )}

        {isCompact ? (
          <>
            <button
              aria-label={
                theme === "dark"
                  ? "Alternar para tema claro"
                  : "Alternar para tema escuro"
              }
              aria-pressed={theme === "dark"}
              className="group theme-toggle-btn justify-center w-full h-10"
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
              <div className="gloss-overlay" />
            </button>

            {onCollapsedChange && (
              <button
                aria-label="Expandir sidebar"
                className="hidden h-10 w-full items-center justify-center rounded-xl border collapse-toggle-btn cursor-pointer lg:flex"
                onClick={() => onCollapsedChange(false)}
                title="Expandir"
                type="button"
              >
                <PanelLeftOpen
                  aria-hidden="true"
                  className="size-4.5 shrink-0"
                />
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              aria-label={
                theme === "dark"
                  ? "Alternar para tema claro"
                  : "Alternar para tema escuro"
              }
              aria-pressed={theme === "dark"}
              className="group theme-toggle-btn flex-1 min-h-10 justify-start gap-2.5 px-3"
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
              <span className="font-semibold text-sm">
                {theme === "dark" ? "Tema Claro" : "Tema Escuro"}
              </span>
              <div className="gloss-overlay" />
            </button>

            {onCollapsedChange && (
              <button
                aria-label="Recolher sidebar"
                className="hidden size-10 items-center justify-center rounded-xl border collapse-toggle-btn cursor-pointer lg:flex shrink-0"
                onClick={() => onCollapsedChange(true)}
                title="Recolher"
                type="button"
              >
                <PanelLeftClose
                  aria-hidden="true"
                  className="size-4.5 shrink-0"
                />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
