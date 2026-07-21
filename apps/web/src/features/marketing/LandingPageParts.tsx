import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/ui";
import { LandingAuthActions } from "./LandingAuthActions";
import { landingFeatures, landingPains, landingSteps } from "./landingContent";

export function OutcomeStrip() {
  return (
    <section className="border-y border-line bg-panel text-app-text">
      <div className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:grid-cols-3 sm:px-8 lg:px-10">
        {["Sem adesão", "Site incluído", "Operação auditada"].map((item) => (
          <div
            className="flex items-center gap-3 text-sm font-black"
            key={item}
          >
            <Check className="size-5 text-emerald-600" />
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProblemSection() {
  return (
    <section className="bg-app px-5 py-16 text-app-text sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.26em] text-accent-strong">
          O status quo do mercado
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-black sm:text-4xl">
          Por que a maioria das lojas perde o jogo digital.
        </h2>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {landingPains.map(({ title, pain, solution }, index) => (
            <article
              className="rounded-md border border-line bg-panel p-5 shadow-sm"
              key={title}
            >
              <span className="text-xs font-black uppercase tracking-[0.22em] text-accent-strong">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-base font-black uppercase tracking-wide">
                {title}
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                {pain}
              </p>
              <p className="mt-3 border-t border-line pt-3 text-sm font-bold leading-6 text-app-text">
                <span className="text-accent-strong">Na Loja Veículos: </span>
                {solution}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WorkflowSection() {
  return (
    <section
      className="bg-panel px-5 py-16 text-app-text sm:px-8 lg:px-10"
      id="como-funciona"
    >
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.26em] text-accent-strong">
          Como funciona
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-black sm:text-4xl">
          Da entrada do pátio ao dinheiro no caixa.
        </h2>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {landingSteps.map(([label, text], index) => (
            <article
              className="group rounded-md border border-line bg-app p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-md"
              key={label}
            >
              <span className="flex size-10 items-center justify-center rounded-md bg-primary text-sm font-black text-white transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                {index + 1}
              </span>
              <h3 className="mt-5 text-xl font-black">{label}</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-muted">
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeatureSection() {
  return (
    <section
      className="bg-app px-5 py-16 text-app-text sm:px-8 lg:px-10"
      id="plataforma"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-accent-strong">
              Plataforma
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black sm:text-4xl">
              Tudo o que a loja usa no dia a dia.
            </h2>
          </div>
          <LandingAuthActions primaryLabel="Conhecer a plataforma" />
        </div>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {landingFeatures.map(({ icon: Icon, label, text }) => (
            <article
              className="group rounded-md border border-line bg-panel/40 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:bg-panel hover:shadow-md"
              key={label}
            >
              <Icon className="size-6 text-accent" />
              <h3 className="mt-4 text-lg font-black">{label}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="bg-primary px-5 py-16 text-white sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.26em] text-accent">
            Loja Veículos V2
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black sm:text-4xl">
            Entre, crie sua loja e continue direto no painel operacional.
          </h2>
        </div>
        <LandingAuthActions primaryLabel="Criar minha loja" />
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-white/12 bg-primary px-5 pb-8 pt-10 text-white sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <Link className="flex items-center gap-3" to="/">
          <Logo className="h-8 w-auto" variant="full-white" />
        </Link>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-bold text-white/75">
          <a className="transition hover:text-white" href="#como-funciona">
            Como funciona
          </a>
          <a className="transition hover:text-white" href="#plataforma">
            Plataforma
          </a>
        </nav>
        <LandingAuthActions compact primaryLabel="Criar conta" />
      </div>
      <p className="mx-auto mt-8 max-w-7xl text-xs font-semibold text-white/50">
        © {new Date().getFullYear()} Loja Veículos. Sistema de gestão para lojas
        de veículos.
      </p>
    </footer>
  );
}
