import type { ReactNode } from "react";
import type { AppTheme } from "../../app/theme";
import {
  DashboardSidebarNavItem,
  SidebarWorkspace,
  SidebarFooterActions,
} from "./dashboard-sidebar-parts";
import type { DashboardSidebarItem } from "./dashboard-sidebar-parts";

export type { DashboardSidebarItem };

export type DashboardSidebarProps<Id extends string = string> = {
  activeId: Id;
  className?: string;
  collapsed?: boolean;
  items: readonly DashboardSidebarItem<Id>[];
  onClose?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  onSelect: (id: Id) => void;
  onThemeToggle: () => void;
  renderAccountControl?: (options: { isCompact: boolean }) => ReactNode;
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
  renderAccountControl,
  theme,
  variant = "desktop",
  workspaceMeta = "Loja atual",
  workspaceName,
}: DashboardSidebarProps<Id>) {
  const isCompact = variant === "desktop" && collapsed;
  const settingsItem = items.find((item) => item.id === "settings");
  const mainItems = items.filter((item) => item.id !== "settings");
  const accountControl = renderAccountControl?.({ isCompact });
  let lastGroup: string | undefined;

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
        className="custom-scrollbar flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-4"
      >
        {mainItems.map((item) => {
          const showHeader = item.group && item.group !== lastGroup;
          if (showHeader) lastGroup = item.group;
          return (
            <div key={item.id} className="flex flex-col gap-0.5">
              {showHeader &&
                (isCompact ? (
                  <div className="h-px bg-line/60 my-2 mx-1" />
                ) : (
                  <div
                    className={
                      "px-2.5 pb-1 text-sm font-black uppercase tracking-widest text-muted/50 dark:text-muted/40 " +
                      (lastGroup === undefined ? "pt-1" : "pt-4")
                    }
                  >
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
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-line/60 px-2.5 py-3 bg-panel/10">
        {isCompact ? (
          <>
            {accountControl}

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
            <div className="flex items-center gap-1">
              {accountControl}

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

        <SidebarFooterActions
          isCompact={isCompact}
          theme={theme}
          onThemeToggle={onThemeToggle}
          onCollapsedChange={onCollapsedChange}
        />
      </div>
    </div>
  );
}
