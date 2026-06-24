import { Check, Pencil, User } from "lucide-react";
import { useRef, useState } from "react";
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
  const [userName, setUserName] = useState(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("dashboard_user_name") ?? "João Silva")
      : "João Silva",
  );
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEdit = () => {
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleSave = () => {
    setIsEditing(false);
    const finalName = userName.trim() || "João Silva";
    setUserName(finalName);
    if (typeof window !== "undefined")
      localStorage.setItem("dashboard_user_name", finalName);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setUserName(
      typeof window !== "undefined"
        ? (localStorage.getItem("dashboard_user_name") ?? "João Silva")
        : "João Silva",
    );
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (e.relatedTarget && (e.relatedTarget as HTMLElement).closest("button"))
      return;
    handleSave();
  };

  const isCompact = variant === "desktop" && collapsed;
  const settingsItem = items.find((item) => item.id === "settings");
  const mainItems = items.filter((item) => item.id !== "settings");
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
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                      "px-2.5 pb-1 text-[9px] font-black uppercase tracking-widest text-muted/50 dark:text-muted/40 " +
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
            {/* Mocked Profile Icon in compact mode */}
            <div className="flex justify-center py-1">
              <div
                className="size-9 bg-accent-soft text-accent rounded-full flex items-center justify-center font-bold border border-accent/15"
                title={`${userName} (Administrador)`}
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
              <div className="flex flex-1 items-center gap-2.5 min-w-0 px-2 py-1.5">
                <div className="size-9 bg-accent-soft text-accent rounded-full flex items-center justify-center font-bold shrink-0 border border-accent/15">
                  <User className="size-4.5" />
                </div>
                <div className="flex flex-col min-w-0 flex-1 leading-tight gap-0.5">
                  <div className="relative flex items-center min-w-0 w-full">
                    <input
                      ref={inputRef}
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      disabled={!isEditing}
                      onBlur={handleBlur}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="words"
                      spellCheck={false}
                      className={
                        "w-full text-xs font-black text-primary bg-transparent pl-2.5 pr-8.5 py-1.5 rounded-md border transition-all duration-300 focus:outline-none focus:ring-1 " +
                        (isEditing
                          ? "border-accent/40 bg-app-elevated/45 focus:border-accent focus:ring-accent/20"
                          : "border-line/45 hover:border-line-strong/60 bg-transparent disabled:cursor-default")
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSave();
                        } else if (e.key === "Escape") {
                          handleCancel();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={isEditing ? handleSave : handleEdit}
                      className={
                        "absolute right-1 size-6 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer " +
                        (isEditing
                          ? "bg-accent text-white hover:bg-accent-strong scale-100"
                          : "bg-transparent text-muted hover:text-accent hover:bg-accent-soft hover:scale-105")
                      }
                      title={isEditing ? "Salvar nome" : "Editar nome"}
                    >
                      <div className="relative size-3.5 flex items-center justify-center">
                        <Pencil
                          className={
                            "absolute size-3.5 transition-all duration-300 transform " +
                            (isEditing
                              ? "opacity-0 rotate-90 scale-50 pointer-events-none"
                              : "opacity-100 rotate-0 scale-100")
                          }
                        />
                        <Check
                          className={
                            "absolute size-3.5 transition-all duration-300 transform " +
                            (!isEditing
                              ? "opacity-0 -rotate-90 scale-50 pointer-events-none"
                              : "opacity-100 rotate-0 scale-100")
                          }
                        />
                      </div>
                    </button>
                  </div>
                  <span className="truncate text-[9px] font-black uppercase tracking-widest text-muted pl-2.5">
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
