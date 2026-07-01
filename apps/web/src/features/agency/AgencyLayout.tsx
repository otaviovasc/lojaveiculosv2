import { useEffect, useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  Users,
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
      path: "/agency/admin/team-access",
      label: "Acessos de Equipe",
      icon: Users,
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
      {/* Sidebar Desktop */}
      <aside className="hidden border-r border-line bg-panel lg:flex lg:flex-col lg:justify-between h-screen fixed left-0 top-0 z-30 text-primary collapsed-sidebar">
        <div>
          {/* Logo Brand Lockup */}
          <div className="flex h-20 items-center gap-3 px-6 border-b border-line bg-panel text-primary overflow-hidden shrink-0">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-white font-black italic shadow-sm shrink-0 hover:rotate-12 transition-transform duration-300">
              AG
            </div>
            <div className="brand-text flex flex-col whitespace-nowrap">
              <p className="text-sm font-black uppercase tracking-wider">
                Agency Console
              </p>
              <p className="text-[10px] font-bold text-accent tracking-widest uppercase">
                Portal de Gestão
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
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User profile & theme toggles */}
        <div className="border-t border-line p-4 space-y-3 bg-panel/50 overflow-hidden">
          <UserAccountButton />

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-app-elevated hover:bg-line border border-line rounded-lg text-xs font-bold transition-all text-primary"
              title="Mudar Tema"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="size-3.5 text-warning shrink-0" />
                  <span className="toggle-text">Tema Claro</span>
                </>
              ) : (
                <>
                  <Moon className="size-3.5 text-violet-start shrink-0" />
                  <span className="toggle-text">Tema Escuro</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden flex h-16 items-center justify-between px-4 border-b border-line bg-panel sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 hover:bg-app-elevated rounded-lg"
            aria-label="Abrir Menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-white font-black italic">
            AG
          </div>
          <span className="text-sm font-black uppercase tracking-wider">
            Agency Console
          </span>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-app-elevated rounded-lg"
          aria-label="Mudar Tema"
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
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="relative flex flex-col justify-between w-72 max-w-xs bg-panel border-r border-line h-full shadow-2xl p-4 animate-fade-in">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-line">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-white font-black italic">
                    AG
                  </div>
                  <span className="text-sm font-black uppercase tracking-wider">
                    Agency
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1 hover:bg-app-elevated rounded-lg"
                  aria-label="Fechar Menu"
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
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-line pt-4 space-y-3">
              <UserAccountButton />
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="min-w-0 min-h-screen lg:col-start-2">
        <Outlet />
      </main>
    </div>
  );
}
