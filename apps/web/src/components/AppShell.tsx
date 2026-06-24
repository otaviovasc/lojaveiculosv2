import { Menu, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { navigationGroups } from "../app/modules";
import type {
  ModuleDefinition,
  ModuleId,
  NavigationItem,
} from "../app/modules";
import {
  applyThemeToDocument,
  getNextTheme,
  persistTheme,
  readBrowserPreferredTheme,
  type AppTheme,
} from "../app/theme";
import {
  DashboardSidebar,
  type DashboardSidebarItem,
} from "./ui/dashboard-sidebar";

type AppShellProps = {
  activeModule: ModuleDefinition;
  children: ReactNode;
  onNavigate: (moduleId: ModuleId) => void;
};

const sidebarItems = navigationGroups.flatMap((group) =>
  group.items.map((item) => ({
    ...toSidebarItem(item),
    group: group.label,
  })),
);

function toSidebarItem(item: NavigationItem): DashboardSidebarItem<ModuleId> {
  return {
    icon: item.icon,
    id: item.id,
    title: item.label,
  };
}

export function AppShell({
  activeModule,
  children,
  onNavigate,
}: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(() =>
    readBrowserPreferredTheme(),
  );
  const storeLabel = readStoreLabel();

  const navigate = (moduleId: ModuleId) => {
    onNavigate(moduleId);
    setIsMobileNavOpen(false);
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme = getNextTheme(currentTheme);
      persistTheme(window.localStorage, nextTheme);
      return nextTheme;
    });
  };

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  return (
    <div
      className={
        "min-h-screen bg-app text-app-text lg:grid " +
        (isSidebarCollapsed
          ? "lg:grid-cols-[72px_1fr]"
          : "lg:grid-cols-[224px_1fr]")
      }
    >
      <aside
        className={
          "fixed left-0 top-0 z-30 hidden h-screen transition-[width] duration-300 lg:block " +
          (isSidebarCollapsed ? "w-[72px]" : "w-[224px]")
        }
      >
        <DashboardSidebar
          activeId={activeModule.id}
          collapsed={isSidebarCollapsed}
          items={sidebarItems}
          onCollapsedChange={setIsSidebarCollapsed}
          onSelect={navigate}
          onThemeToggle={toggleTheme}
          theme={theme}
          workspaceMeta={storeLabel}
          workspaceName="Loja Veiculos"
        />
      </aside>

      <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-panel px-4 lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-label="Abrir Menu"
            aria-controls="mobile-navigation"
            aria-expanded={isMobileNavOpen}
            className="flex size-10 items-center justify-center rounded-md text-app-text transition-colors hover:bg-app-elevated"
            onClick={() => setIsMobileNavOpen(true)}
            type="button"
          >
            <Menu className="size-5" />
          </button>
          <img
            src={
              theme === "dark"
                ? "/icons/logo_lv_white.svg"
                : "/icons/logo_lv.svg"
            }
            alt="Loja Veículos"
            className="h-7.5 w-auto object-contain select-none mr-1"
          />
          <div className="min-w-0 border-l border-line/60 pl-2.5">
            <p className="truncate text-[11px] font-black uppercase tracking-widest text-primary leading-tight">
              Loja Veículos
            </p>
            <p className="truncate text-[9px] font-black uppercase tracking-widest text-accent mt-0.5">
              {activeModule.title}
            </p>
          </div>
        </div>

        <button
          aria-label="Mudar Tema"
          className="flex size-10 items-center justify-center rounded-md text-app-text transition-colors hover:bg-app-elevated"
          onClick={toggleTheme}
          type="button"
        >
          {theme === "dark" ? (
            <Sun className="size-5 text-warning" />
          ) : (
            <Moon className="size-5 text-violet-start" />
          )}
        </button>
      </div>

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            aria-label="Fechar menu"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileNavOpen(false)}
            type="button"
          />
          <aside
            aria-label="Navegação mobile"
            aria-modal="true"
            className="mobile-nav-enter relative z-50 h-full w-[min(90vw,22rem)] max-w-sm shadow-2xl"
            id="mobile-navigation"
            role="dialog"
          >
            <DashboardSidebar
              activeId={activeModule.id}
              className="w-full"
              items={sidebarItems}
              onClose={() => setIsMobileNavOpen(false)}
              onSelect={navigate}
              onThemeToggle={toggleTheme}
              theme={theme}
              variant="mobile"
              workspaceMeta={storeLabel}
              workspaceName="Loja Veiculos"
            />
          </aside>
        </div>
      )}

      <div className="min-w-0 lg:col-start-2">{children}</div>
    </div>
  );
}

function readStoreLabel() {
  const env = import.meta.env as {
    DEV?: boolean;
    VITE_DEV_STORE_SLUG?: string;
  };
  return env.VITE_DEV_STORE_SLUG ?? (env.DEV ? "Loja local" : "Loja atual");
}
