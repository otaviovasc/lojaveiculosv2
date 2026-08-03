import { Quote } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedContent from "../../components/ui/AnimatedContent";
import { Logo } from "../../components/ui";
import { LandingAuthActions } from "./LandingAuthActions";
import {
  landingFeatures,
  landingFinalCta,
  landingMetrics,
  landingPains,
  landingSteps,
  landingTestimonials,
} from "./landingContent";

export function MetricsSection() {
  return (
    <section className="border-y border-line">
      <div className="mx-auto grid max-w-7xl gap-px px-5 sm:grid-cols-3 sm:gap-0 sm:px-8 lg:px-10">
        {landingMetrics.map(({ metric, label, text }, index) => (
          <AnimatedContent delay={0.08 * index} key={label}>
            <div className="flex h-full flex-col items-center gap-3 px-4 py-10 text-center sm:border-l sm:border-line sm:first:border-l-0">
              <span className="font-display text-5xl font-black tracking-tight text-app-text sm:text-6xl">
                {metric}
              </span>
              <span className="text-xs font-black uppercase tracking-[0.22em] text-accent">
                {label}
              </span>
              <p className="max-w-60 text-sm font-semibold leading-6 text-muted">
                {text}
              </p>
            </div>
          </AnimatedContent>
        ))}
      </div>
    </section>
  );
}

export function ProblemSection() {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <AnimatedContent>
          <p className="text-xs font-black uppercase tracking-[0.26em] text-accent">
            O status quo do mercado
          </p>
          <h2 className="mt-4 max-w-3xl font-display text-3xl font-black leading-tight tracking-tight text-app-text sm:text-5xl">
            Por que a maioria das lojas{" "}
            <span className="text-accent">perde o jogo digital.</span>
          </h2>
        </AnimatedContent>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {landingPains.map(({ title, pain, solution }, index) => (
            <AnimatedContent delay={0.06 * index} key={title}>
              <article className="flex h-full flex-col rounded-lg border border-line bg-panel p-5">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-base font-black uppercase tracking-wide text-app-text">
                  {title}
                </h3>
                <p className="mt-2 flex-1 text-sm font-semibold leading-6 text-muted">
                  {pain}
                </p>
                <p className="mt-4 border-t border-line pt-3 text-sm font-bold leading-6 text-app-text">
                  <span className="text-accent">Na Loja Veículos: </span>
                  {solution}
                </p>
              </article>
            </AnimatedContent>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WorkflowSection() {
  return (
    <section
      className="border-y border-line bg-panel px-5 py-16 sm:px-8 sm:py-24 lg:px-10"
      id="como-funciona"
    >
      <div className="mx-auto max-w-7xl">
        <AnimatedContent>
          <div className="flex flex-col items-center text-center">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-accent">
              Como funciona o motor
            </p>
            <h2 className="mt-4 max-w-3xl font-display text-3xl font-black leading-tight tracking-tight text-app-text sm:text-5xl">
              Da entrada do pátio{" "}
              <span className="text-accent">ao dinheiro no caixa.</span>
            </h2>
          </div>
        </AnimatedContent>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {landingSteps.map(({ title, text }, index) => (
            <AnimatedContent delay={0.08 * index} key={title}>
              <article className="group h-full rounded-lg border border-line bg-app p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40">
                <span className="flex size-10 items-center justify-center rounded-md bg-accent-soft text-sm font-black text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 text-xl font-black text-app-text">
                  {title}
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-muted">
                  {text}
                </p>
              </article>
            </AnimatedContent>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeatureSection() {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-10" id="plataforma">
      <div className="mx-auto max-w-7xl">
        <AnimatedContent>
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-accent">
                Plataforma
              </p>
              <h2 className="mt-4 max-w-2xl font-display text-3xl font-black leading-tight tracking-tight text-app-text sm:text-5xl">
                Tudo o que a loja usa no dia a dia.
              </h2>
            </div>
            <LandingAuthActions primaryLabel="Conhecer a plataforma" />
          </div>
        </AnimatedContent>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {landingFeatures.map(({ icon: Icon, label, text }, index) => (
            <AnimatedContent delay={0.05 * index} key={label}>
              <article className="group h-full rounded-lg border border-line bg-panel p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40">
                <Icon className="size-6 text-accent" />
                <h3 className="mt-4 text-lg font-black text-app-text">
                  {label}
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                  {text}
                </p>
              </article>
            </AnimatedContent>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section
      className="border-y border-line bg-panel px-5 py-16 sm:px-8 sm:py-24 lg:px-10"
      id="clientes"
    >
      <div className="mx-auto max-w-7xl">
        <AnimatedContent>
          <div className="flex flex-col items-center text-center">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-accent">
              Showrooms parceiros
            </p>
            <h2 className="mt-4 max-w-3xl font-display text-3xl font-black leading-tight tracking-tight text-app-text sm:text-5xl">
              Experiência real de{" "}
              <span className="text-accent">quem opera com a gente.</span>
            </h2>
          </div>
        </AnimatedContent>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {landingTestimonials.map(({ name, location, quote }, index) => (
            <AnimatedContent delay={0.08 * index} key={name}>
              <figure className="flex h-full flex-col rounded-lg border border-line bg-app p-6">
                <Quote className="size-5 text-accent" />
                <blockquote className="mt-4 flex-1 text-sm font-semibold leading-6 text-app-text">
                  “{quote}”
                </blockquote>
                <figcaption className="mt-5 border-t border-line pt-4">
                  <p className="text-sm font-black text-app-text">{name}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-widest text-accent">
                    {location}
                  </p>
                </figcaption>
              </figure>
            </AnimatedContent>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
      <AnimatedContent>
        <div className="relative isolate mx-auto flex max-w-5xl flex-col items-center overflow-hidden rounded-2xl border border-line bg-panel px-6 py-14 text-center sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="absolute -top-24 right-0 -z-10 size-64 rounded-full bg-accent-soft blur-3xl"
          />
          <span className="inline-flex items-center rounded-full border border-accent/40 bg-accent-soft px-4 py-1.5 text-xs font-black uppercase tracking-[0.26em] text-app-text">
            {landingFinalCta.badge}
          </span>
          <h2 className="mt-7 max-w-2xl font-display text-3xl font-black leading-tight tracking-tight text-app-text sm:text-5xl">
            {landingFinalCta.title}
          </h2>
          <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-muted">
            {landingFinalCta.text}
          </p>
          <div className="mt-9">
            <LandingAuthActions primaryLabel="Criar minha loja" />
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {landingFinalCta.points.map((point) => (
              <span
                className="inline-flex items-center gap-2.5 text-xs font-black uppercase tracking-widest text-muted"
                key={point}
              >
                <span className="size-1.5 rounded-full bg-accent" />
                {point}
              </span>
            ))}
          </div>
        </div>
      </AnimatedContent>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-line px-5 pb-8 pt-10 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <Link
          aria-label="Loja Veículos — início"
          className="flex items-center gap-3"
          to="/"
        >
          <Logo className="h-8 w-auto" variant="full-white" />
        </Link>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-bold text-muted">
          <a className="transition hover:text-app-text" href="#como-funciona">
            Como funciona
          </a>
          <a className="transition hover:text-app-text" href="#plataforma">
            Plataforma
          </a>
          <a className="transition hover:text-app-text" href="#clientes">
            Clientes
          </a>
        </nav>
        <LandingAuthActions compact primaryLabel="Criar conta" />
      </div>
      <p className="mx-auto mt-8 max-w-7xl text-xs font-semibold text-muted">
        © {new Date().getFullYear()} Loja Veículos. Sistema de gestão para lojas
        de veículos.
      </p>
    </footer>
  );
}
