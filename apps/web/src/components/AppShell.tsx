import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { navigationGroups } from "../app/modules";
import type { ModuleDefinition, ModuleId } from "../app/modules";
import {
  applyThemeToDocument,
  getNextTheme,
  persistTheme,
  readBrowserPreferredTheme,
  type AppTheme,
} from "../app/theme";

type AppShellProps = {
  activeModule: ModuleDefinition;
  children: ReactNode;
  onNavigate: (moduleId: ModuleId) => void;
};

type NavigationListProps = {
  activeModuleId: ModuleId;
  onNavigate: (moduleId: ModuleId) => void;
};

function NavigationList({ activeModuleId, onNavigate }: NavigationListProps) {
  return (
    <nav className="flex flex-col gap-5 p-4" aria-label="Modulos">
      {navigationGroups.map((group) => (
        <section className="space-y-2" key={group.label}>
          <p className="px-2 text-[10px] font-black uppercase tracking-widest text-muted">
            {group.label}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeModuleId;

            return (
              <button
                aria-current={isActive ? "page" : undefined}
                className={`nav-item ${isActive ? "nav-item-active" : ""}`}
                key={item.id}
                onClick={() => onNavigate(item.id)}
                type="button"
              >
                <Icon aria-hidden="true" className="size-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </section>
      ))}
    </nav>
  );
}

export function AppShell({
  activeModule,
  children,
  onNavigate,
}: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
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
    <div className="min-h-screen bg-app text-app-text lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="hidden border-r border-line bg-panel lg:block">
        <BrandLockup storeLabel={storeLabel} />
        <NavigationList
          activeModuleId={activeModule.id}
          onNavigate={navigate}
        />
      </aside>

      {isMobileNavOpen ? (
        <div className="mobile-nav lg:hidden" role="presentation">
          <aside
            aria-label="Navegacao mobile"
            aria-modal="true"
            className="mobile-nav-panel"
            id="mobile-navigation"
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-line pr-4">
              <BrandLockup storeLabel={storeLabel} />
              <button
                aria-label="Fechar menu"
                className="icon-button"
                onClick={() => setIsMobileNavOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <NavigationList
              activeModuleId={activeModule.id}
              onNavigate={navigate}
            />
          </aside>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="shell-header">
          <div className="flex items-center gap-2">
            <button
              aria-label="Abrir menu"
              aria-controls="mobile-navigation"
              aria-expanded={isMobileNavOpen}
              className="icon-button lg:hidden"
              onClick={() => setIsMobileNavOpen(true)}
              type="button"
            >
              <Menu aria-hidden="true" className="size-5" />
            </button>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-muted">
                {activeModule.eyebrow}
              </p>
              <h1 className="text-lg font-black lg:text-2xl">
                {activeModule.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button aria-label="Buscar" className="icon-button" type="button">
              <Search aria-hidden="true" className="size-5" />
            </button>
            <button
              aria-label={
                theme === "dark"
                  ? "Alternar para tema claro"
                  : "Alternar para tema escuro"
              }
              aria-pressed={theme === "dark"}
              className="icon-button"
              onClick={toggleTheme}
              type="button"
            >
              {theme === "dark" ? (
                <Sun aria-hidden="true" className="size-5" />
              ) : (
                <Moon aria-hidden="true" className="size-5" />
              )}
            </button>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

function BrandLockup({ storeLabel }: { storeLabel: string }) {
  return (
    <div className="flex h-20 items-center gap-3 px-5">
      <div className="flex size-11 items-center justify-center rounded-lg bg-accent-soft text-accent">
        LV
      </div>
      <div>
        <p className="text-sm font-black">Loja Veiculos</p>
        <p className="text-xs font-semibold text-muted">{storeLabel}</p>
      </div>
    </div>
  );
}

function readStoreLabel() {
  const env = import.meta.env as {
    DEV?: boolean;
    VITE_DEV_STORE_SLUG?: string;
  };
  return env.VITE_DEV_STORE_SLUG ?? (env.DEV ? "test-store" : "store scope");
}
