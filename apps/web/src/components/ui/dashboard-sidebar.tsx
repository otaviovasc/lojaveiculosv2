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
  workspaceIconUrl?: string | null | undefined;
  workspaceLogoUrl?: string | null | undefined;
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
  workspaceIconUrl,
  workspaceLogoUrl,
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
      className={`workspace-sidebar${isCompact ? " workspace-sidebar--compact" : ""}${variant === "mobile" ? " workspace-sidebar--mobile" : ""} ${className}`}
    >
      <SidebarWorkspace
        collapsed={isCompact}
        meta={workspaceMeta}
        name={workspaceName}
        onClose={onClose}
        theme={theme}
        iconUrl={workspaceIconUrl}
        logoUrl={workspaceLogoUrl}
      />

      <nav
        aria-label="Modulos"
        className="workspace-sidebar__nav custom-scrollbar"
      >
        {mainItems.map((item) => {
          const showHeader = item.group && item.group !== lastGroup;
          if (showHeader) lastGroup = item.group;
          return (
            <div key={item.id} className="workspace-sidebar__group-item">
              {showHeader &&
                (isCompact ? (
                  <div className="workspace-sidebar__separator" />
                ) : (
                  <div className="workspace-sidebar__group-label">
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

      <div className="workspace-sidebar__footer">
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
            <div className="workspace-sidebar__account-row">
              {accountControl}

              {settingsItem && (
                <button
                  aria-label={settingsItem.title}
                  className={`workspace-sidebar__utility${activeId === "settings" ? " workspace-sidebar__utility--active" : ""}`}
                  onClick={() => onSelect(settingsItem.id)}
                  title={settingsItem.title}
                  type="button"
                >
                  <settingsItem.icon aria-hidden="true" />
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
