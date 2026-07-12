import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  CreditCard,
  Plus,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import {
  applyThemeToDocument,
  getNextTheme,
  persistTheme,
  readBrowserPreferredTheme,
  type AppTheme,
} from "../../app/theme";
import { UserAccountButton } from "../account/UserAccountButton";

export function AgencyLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [theme, setTheme] = useState<AppTheme>(() =>
    readBrowserPreferredTheme(),
  );

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

  useEffect(() => {
    if (!isMobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    mobileCloseButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      mobileMenuButtonRef.current?.focus();
    };
  }, [isMobileOpen]);

  const menuItems = [
    {
      path: "/agency/admin",
      label: "Portal da Agência",
      icon: LayoutDashboard,
      end: true,
    },
    {
      path: "/agency/admin/stats",
      label: "Estatísticas",
      icon: BarChart3,
    },
    {
      path: "/agency/admin/unified-billing",
      label: "Cobrança Unificada",
      icon: CreditCard,
    },
    {
      path: "/agency/admin/create-store",
      label: "Adicionar Loja",
      icon: Plus,
    },
  ];

  return (
    <div className="min-h-screen bg-app text-app-text lg:grid lg:grid-cols-[76px_1fr] agency-layout">
      <a className="agency-skip-link" href="#agency-main-content">
        Ir para o conteúdo
      </a>
      {/* Sidebar Desktop */}
      <aside
        aria-label="Navegação da agência"
        className="agency-sidebar hidden lg:flex lg:flex-col lg:justify-between h-screen fixed left-0 top-0 z-30 collapsed-sidebar"
      >
        <div>
          {/* Logo Brand Lockup */}
          <div className="agency-brand-lockup flex h-20 items-center gap-3 px-4 overflow-hidden shrink-0">
            <div className="agency-brand-mark shrink-0">
              <img
                alt=""
                aria-hidden="true"
                src="/icons/lv-logo-white-red.svg"
              />
            </div>
            <div className="brand-text flex flex-col whitespace-nowrap">
              <p className="text-sm font-black uppercase tracking-wider">
                Rede de Agências
              </p>
              <p className="agency-brand-subtitle text-xs font-bold tracking-widest uppercase">
                Console de operação
              </p>
            </div>
          </div>

          <nav
            className="flex flex-col gap-1.5 py-6 px-0"
            aria-label="Menu Principal"
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={!!item.end}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    "agency-menu-item " +
                    (isActive ? "agency-menu-item-active" : "text-muted")
                  }
                >
                  <div className="size-6 flex items-center justify-center shrink-0">
                    <Icon className="size-4.5" />
                  </div>
                  <span className="agency-menu-label">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User profile & theme toggles */}
        <div className="agency-sidebar-footer p-4 space-y-3 overflow-hidden">
          <div className="agency-user-account">
            <UserAccountButton />
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label={
                theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
              }
              onClick={toggleTheme}
              className="agency-theme-toggle flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold"
              title={
                theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
              }
            >
              {theme === "dark" ? (
                <>
                  <Sun className="size-3.5 text-warning shrink-0" />
                  <span className="toggle-text">Tema Claro</span>
                </>
              ) : (
                <>
                  <Moon className="size-3.5 text-violet-foreground shrink-0" />
                  <span className="toggle-text">Tema Escuro</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="agency-mobile-header lg:hidden flex h-16 items-center justify-between px-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            aria-controls="agency-mobile-navigation"
            aria-expanded={isMobileOpen}
            onClick={() => setIsMobileOpen(true)}
            className="agency-mobile-icon-button p-2 rounded-lg"
            aria-label="Abrir menu da agência"
            ref={mobileMenuButtonRef}
          >
            <Menu className="size-5" />
          </button>
          <div className="agency-mobile-logo">
            <img alt="" aria-hidden="true" src="/icons/lv-logo-white-red.svg" />
          </div>
          <span className="agency-mobile-brand text-sm font-black uppercase tracking-wider">
            Rede de Agências
          </span>
        </div>

        <button
          onClick={toggleTheme}
          className="agency-mobile-icon-button p-2 rounded-lg"
          aria-label={
            theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
          }
        >
          {theme === "dark" ? (
            <Sun className="size-5" />
          ) : (
            <Moon className="size-5" />
          )}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileOpen && (
        <div
          aria-label="Menu da agência"
          aria-modal="true"
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
        >
          <button
            aria-label="Fechar menu da agência"
            className="agency-mobile-backdrop fixed inset-0 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
            type="button"
          />
          <aside
            className="agency-mobile-drawer relative z-10 flex flex-col justify-between w-72 max-w-xs overflow-hidden h-full p-4 animate-fade-in"
            id="agency-mobile-navigation"
          >
            <div>
              <div className="agency-mobile-drawer-brand flex items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="agency-mobile-logo agency-mobile-logo--drawer">
                    <img
                      alt=""
                      aria-hidden="true"
                      src="/icons/lv-logo-white-red.svg"
                    />
                  </div>
                  <span className="text-sm font-black uppercase tracking-wider">
                    Rede de Agências
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="agency-mobile-icon-button p-1 rounded-lg"
                  aria-label="Fechar menu da agência"
                  ref={mobileCloseButtonRef}
                >
                  <X className="size-5" />
                </button>
              </div>

              <nav
                className="flex flex-col gap-1.5 py-6 px-0"
                aria-label="Menu Mobile"
              >
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={!!item.end}
                      onClick={() => setIsMobileOpen(false)}
                      className={({ isActive }) =>
                        "agency-menu-item " +
                        (isActive ? "agency-menu-item-active" : "text-muted")
                      }
                    >
                      <Icon className="size-4" />
                      <span className="agency-menu-label">{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="agency-mobile-drawer-footer pt-4 space-y-3">
              <div className="agency-user-account">
                <UserAccountButton />
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main
        className="min-w-0 min-h-screen lg:col-start-2"
        id="agency-main-content"
      >
        <Outlet />
      </main>
    </div>
  );
}
