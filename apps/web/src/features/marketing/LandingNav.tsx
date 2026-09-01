import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  applyThemeToDocument,
  getNextTheme,
  persistTheme,
  readBrowserPreferredTheme,
  type AppTheme,
} from "../../app/theme";
import { Logo } from "../../components/ui";
import { LandingAuthActions } from "./LandingAuthActions";

export function LandingThemeToggle() {
  const [theme, setTheme] = useState<AppTheme>("dark");

  useEffect(() => {
    const current = readBrowserPreferredTheme();
    setTheme(current);
    applyThemeToDocument(current);
  }, []);

  const handleToggle = () => {
    const next = getNextTheme(theme);
    setTheme(next);
    applyThemeToDocument(next);
    if (typeof window !== "undefined") {
      persistTheme(window.localStorage, next);
    }
  };

  return (
    <button
      aria-label={`Alternar para tema ${theme === "dark" ? "claro" : "escuro"}`}
      className="inline-flex size-9 items-center justify-center rounded-md border border-line bg-panel/50 text-muted transition hover:border-line-strong hover:bg-panel hover:text-app-text cursor-pointer"
      onClick={handleToggle}
      type="button"
    >
      {theme === "dark" ? (
        <Sun className="size-4 text-amber-400" />
      ) : (
        <Moon className="size-4 text-app-text" />
      )}
    </button>
  );
}

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-line/60 bg-app/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <Link
          aria-label="Loja Veículos — início"
          className="flex items-center gap-3 transition hover:opacity-90"
          to="/"
        >
          <Logo className="h-8 w-auto" variant="auto" />
        </Link>

        {/* Clean nav links */}
        <div className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
          <a className="transition hover:text-app-text" href="#funcionalidades">
            Plataforma
          </a>
          <a className="transition hover:text-app-text" href="#como-funciona">
            Como Funciona
          </a>
          <a className="transition hover:text-app-text" href="#portais">
            Portais
          </a>
          <a className="transition hover:text-app-text" href="#clientes">
            Clientes
          </a>
        </div>

        {/* Theme Toggle & Auth CTA */}
        <div className="flex items-center gap-3">
          <LandingThemeToggle />
          <LandingAuthActions compact primaryLabel="Criar conta" />
        </div>
      </nav>
    </header>
  );
}
