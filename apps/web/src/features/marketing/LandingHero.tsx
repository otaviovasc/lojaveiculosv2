import { Headphones, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedContent from "../../components/ui/AnimatedContent";
import { Logo } from "../../components/ui";
import { LandingAuthActions } from "./LandingAuthActions";
import { LandingHeroShader } from "./LandingHeroShader";
import { landingHero, landingPills } from "./landingContent";

const pillIcons = [Zap, Headphones, ShieldCheck] as const;

export function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[92svh] items-center overflow-hidden">
      <LandingHeroShader />
      <div aria-hidden="true" className="landing-hero-scrim" />
      <LandingNav />
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-5 pb-20 pt-32 text-center sm:px-8 lg:px-10">
        <AnimatedContent duration={0.6} trigger="mount">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-4 py-1.5 text-xs font-black uppercase tracking-[0.28em] text-app-text">
            <Sparkles className="size-3.5 text-accent-text" />
            {landingHero.badge}
          </span>
        </AnimatedContent>
        <AnimatedContent delay={0.08} duration={0.6} trigger="mount">
          <h1 className="mt-8 max-w-5xl font-display text-4xl font-black leading-[1.02] tracking-tight text-app-text sm:text-6xl lg:text-7xl">
            {landingHero.titleLead}{" "}
            <span className="text-accent-text">{landingHero.titleAccent}</span>{" "}
            {landingHero.titleTrail}
          </h1>
        </AnimatedContent>
        <AnimatedContent delay={0.16} duration={0.6} trigger="mount">
          <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-7 text-muted sm:text-lg sm:leading-8">
            {landingHero.subtitle}
          </p>
        </AnimatedContent>
        <AnimatedContent delay={0.24} duration={0.6} trigger="mount">
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LandingAuthActions primaryLabel="Começar agora" />
            <a
              className="inline-flex h-12 items-center justify-center rounded-md border border-line-strong px-5 text-sm font-black text-app-text transition hover:bg-panel"
              href="#plataforma"
            >
              {landingHero.secondaryCta}
            </a>
          </div>
        </AnimatedContent>
        <AnimatedContent delay={0.32} duration={0.6} trigger="mount">
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {landingPills.map((pill, index) => {
              const PillIcon = pillIcons[index] ?? Zap;
              return (
                <span
                  className="landing-glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-muted"
                  key={pill}
                >
                  <PillIcon className="size-3.5 text-accent-text" />
                  {pill}
                </span>
              );
            })}
          </div>
        </AnimatedContent>
      </div>
    </section>
  );
}

export function LandingNav() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
        <Link
          aria-label="Loja Veículos — início"
          className="flex items-center gap-3"
          to="/"
        >
          <Logo className="h-9 w-auto" variant="full-white" />
        </Link>
        <div className="flex items-center gap-2">
          <LandingAuthActions compact primaryLabel="Criar conta" />
        </div>
      </nav>
    </header>
  );
}
