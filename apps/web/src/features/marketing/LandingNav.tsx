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
import { cn } from "../../lib/utils";
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
      className="inline-flex size-8 sm:size-9 items-center justify-center rounded-full bg-panel/60 text-muted transition hover:bg-panel hover:text-app-text cursor-pointer"
      onClick={handleToggle}
      type="button"
    >
      {theme === "dark" ? (
        <Sun className="size-3.5 sm:size-4 text-amber-400" />
      ) : (
        <Moon className="size-3.5 sm:size-4 text-app-text" />
      )}
    </button>
  );
}

export function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled
          ? "pointer-events-none px-3 pt-2 sm:px-6 sm:pt-3"
          : "bg-app/80 backdrop-blur-xl",
      )}
    >
      <nav
        className={cn(
          "mx-auto flex items-center justify-between gap-3 transition-all duration-300",
          isScrolled
            ? "pointer-events-auto max-w-5xl rounded-full bg-app/90 px-3.5 py-2 backdrop-blur-2xl sm:px-5 sm:py-2.5"
            : "max-w-7xl px-4 py-3 sm:px-8 sm:py-4 lg:px-10",
        )}
      >
        <Link
          aria-label="Loja Veículos — início"
          className="flex items-center gap-2 transition hover:opacity-90"
          to="/"
        >
          <Logo
            className={isScrolled ? "h-6 sm:h-7 w-auto" : "h-7 sm:h-8 w-auto"}
            variant="auto"
          />
        </Link>

        {/* Clean nav links */}
        <div className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
          <a className="transition hover:text-app-text" href="#funcionalidades">
            Plataforma
          </a>
          <a className="transition hover:text-app-text" href="#portais">
            Portais
          </a>
          <a className="transition hover:text-app-text" href="#clientes">
            Clientes
          </a>
        </div>

        {/* Theme Toggle & Auth CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LandingThemeToggle />
          <LandingAuthActions compact primaryLabel="Criar conta" />
        </div>
      </nav>
    </header>
  );
}
