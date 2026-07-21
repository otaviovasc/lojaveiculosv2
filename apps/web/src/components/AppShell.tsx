import { Command, Menu, Moon, Search, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  filterNavigationGroups,
  getModuleEntitlement,
  isActiveStoreOwner,
} from "../app/modulePermissions";
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
import { useTenantAdminBrand } from "../app/useTenantAdminBrand";
import { UserAccountButton } from "../features/account/UserAccountButton";
import { useOptionalAccountSession } from "../features/account/accountSession";
import { readRuntimeStoreSlug } from "../features/account/currentStore";
import {
  DashboardSidebar,
  type DashboardSidebarItem,
} from "./ui/dashboard-sidebar";
import { Logo } from "./ui/logo";
import { TextureBackground } from "./ui/TextureBackground";
import { WorkspaceCommandPalette } from "./ui/WorkspaceCommandPalette";

type AppShellProps = {
  activeModule: ModuleDefinition;
  children: ReactNode;
  onNavigate: (moduleId: ModuleId) => void;
};

function toSidebarItem(
  item: NavigationItem,
  badge?: string,
): DashboardSidebarItem<ModuleId> {
  return {
    ...(badge ? { badge } : {}),
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
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(() =>
    readBrowserPreferredTheme(),
  );
  const accountSession = useOptionalAccountSession();
  const storeLabel = readStoreLabel();
  const tenantBrandState = useTenantAdminBrand({
    fallbackStoreLabel: storeLabel,
    theme,
  });
  const sidebarItems = useMemo(
    () =>
      filterNavigationGroups(navigationGroups, accountSession).flatMap(
        (group) =>
          group.items.map((item) => ({
            ...toSidebarItem(
              item,
              isActiveStoreOwner(accountSession) &&
                !getModuleEntitlement(item.id, accountSession).canUse
                ? "PRO"
                : undefined,
            ),
            group: group.label,
          })),
      ),
    [accountSession],
  );
  const tenantBrand =
    tenantBrandState.kind === "loading" ? null : tenantBrandState.brand;

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

  if (!tenantBrand) {
    return (
      <div
        aria-label="Carregando identidade da loja"
        aria-live="polite"
        className="app-shell app-shell--loading"
        role="status"
      >
        <span className="sr-only">Preparando a área da loja</span>
        <aside aria-hidden="true" className="app-shell__loading-sidebar">
          <div className="h-12 animate-pulse rounded-lg bg-app-elevated" />
          <div className="mt-8 grid gap-3">
            {Array.from({ length: 7 }, (_, index) => (
              <div
                className="h-11 animate-pulse rounded-lg bg-app-elevated"
                key={index}
              />
            ))}
          </div>
        </aside>
        <div aria-hidden="true" className="app-shell__loading-content">
          <div className="h-16 border-b border-line bg-panel lg:hidden" />
          <main className="content-frame">
            <div className="h-24 animate-pulse rounded-lg bg-panel" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  className="h-28 animate-pulse rounded-lg bg-panel"
                  key={index}
                />
              ))}
            </div>
            <div className="h-80 animate-pulse rounded-lg bg-panel" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`app-shell${isSidebarCollapsed ? " app-shell--compact" : ""}`}
    >
      <aside className="app-shell__sidebar">
        <DashboardSidebar
          activeId={activeModule.id}
          collapsed={isSidebarCollapsed}
          items={sidebarItems}
          onCollapsedChange={setIsSidebarCollapsed}
          onSelect={navigate}
          onThemeToggle={toggleTheme}
          renderAccountControl={({ isCompact }) => (
            <UserAccountButton compact={isCompact} />
          )}
          theme={theme}
          workspaceIconUrl={tenantBrand.iconUrl}
          workspaceLogoUrl={tenantBrand.logoUrl}
          workspaceMeta={tenantBrand.storeLabel}
          workspaceName={tenantBrand.storeName}
          onSearchClick={() => setIsCommandOpen(true)}
        />
      </aside>

      <div className="app-shell__mobile-header">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-label="Abrir Menu"
            aria-controls="mobile-navigation"
            aria-expanded={isMobileNavOpen}
            className="app-shell__mobile-control"
            onClick={() => setIsMobileNavOpen(true)}
            type="button"
          >
            <Menu className="size-5" />
          </button>
          <Logo
            alt={tenantBrand.storeName}
            className="h-7.5 w-auto object-contain select-none mr-1"
            src={tenantBrand.logoUrl}
            variant={theme === "dark" ? "full-white" : "full"}
          />
          <div className="app-shell__mobile-title">
            <p>{tenantBrand.storeName}</p>
            <strong>{activeModule.title}</strong>
          </div>
        </div>

        <div className="app-shell__mobile-actions">
          <button
            aria-label="Buscar módulos"
            className="app-shell__mobile-control"
            onClick={() => setIsCommandOpen(true)}
            type="button"
          >
            <Search aria-hidden="true" />
          </button>
          <button
            aria-label="Mudar Tema"
            className="app-shell__mobile-control"
            onClick={toggleTheme}
            type="button"
          >
            {theme === "dark" ? (
              <Sun aria-hidden="true" />
            ) : (
              <Moon aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {isMobileNavOpen && (
        <div className="app-shell__mobile-overlay">
          <button
            aria-label="Fechar menu"
            className="app-shell__mobile-backdrop"
            onClick={() => setIsMobileNavOpen(false)}
            type="button"
          />
          <aside
            aria-label="Navegação mobile"
            aria-modal="true"
            className="app-shell__mobile-panel mobile-nav-enter"
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
              renderAccountControl={({ isCompact }) => (
                <UserAccountButton compact={isCompact} />
              )}
              theme={theme}
              variant="mobile"
              workspaceIconUrl={tenantBrand.iconUrl}
              workspaceLogoUrl={tenantBrand.logoUrl}
              workspaceMeta={tenantBrand.storeLabel}
              workspaceName={tenantBrand.storeName}
              onSearchClick={() => setIsCommandOpen(true)}
            />
          </aside>
        </div>
      )}

      <div
        className="app-shell__content relative"
        data-active-module={activeModule.id}
      >
        <TextureBackground />
        <div className="relative z-10">{children}</div>
      </div>

      <WorkspaceCommandPalette
        isOpen={isCommandOpen}
        items={sidebarItems}
        onClose={() => setIsCommandOpen(false)}
        onOpen={() => setIsCommandOpen(true)}
        onSelect={navigate}
      />
    </div>
  );
}

function readStoreLabel() {
  const env = import.meta.env as { VITE_DEV_STORE_SLUG?: string };
  return readRuntimeStoreSlug(env) ?? "Loja atual";
}
