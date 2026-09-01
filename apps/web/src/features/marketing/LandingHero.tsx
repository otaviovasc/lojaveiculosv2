import { ArrowRight, Sparkles } from "lucide-react";
import AnimatedContent from "../../components/ui/AnimatedContent";
import { LandingAuthActions } from "./LandingAuthActions";
import { LandingHeroShader } from "./LandingHeroShader";
import {
  MemphisCarBadge,
  MemphisCheckered,
  MemphisConcentric,
  MemphisCrosshair,
  MemphisDotMatrix,
  MemphisGaugeBadge,
  MemphisGearBadge,
  MemphisHatch,
  MemphisPlusGrid,
  MemphisTurboBadge,
} from "./LandingMemphisGraphics";
import { LandingNav } from "./LandingNav";
import { landingHero, landingPills } from "./landingContent";

export { LandingNav };

export function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[92svh] flex-col items-center overflow-hidden bg-app">
      <LandingHeroShader />
      <div aria-hidden="true" className="landing-hero-scrim" />
      <LandingNav />

      {/* Architecturally Distributed Memphis Telemetry Side Rails */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-32 -z-10 mx-auto hidden max-w-7xl justify-between px-8 select-none lg:flex"
      >
        {/* Left Side Rail: Gauge Telemetry & Dot Matrix */}
        <div className="flex flex-col items-center gap-6 opacity-35">
          <MemphisGaugeBadge className="size-11 text-red-500" />
          <div className="h-16 w-px bg-line" />
          <MemphisDotMatrix cols={4} rows={6} className="text-muted" />
        </div>

        {/* Right Side Rail: Gear Telemetry & Plus Array */}
        <div className="flex flex-col items-center gap-6 opacity-35">
          <MemphisGearBadge className="size-11 text-red-500" />
          <div className="h-16 w-px bg-line" />
          <MemphisPlusGrid cols={3} rows={4} className="text-muted" />
        </div>
      </div>

      {/* Hero Content */}
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-20 lg:px-8">
        {/* Minimal Memphis Category Lead with Crosshairs */}
        <AnimatedContent duration={0.4} trigger="mount">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs text-red-500/70">⌜</span>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-red-500">
              {landingHero.badge}
            </p>
            <span className="font-mono text-xs text-red-500/70">⌝</span>
          </div>
        </AnimatedContent>

        {/* Stark, Authoritative Headline */}
        <AnimatedContent delay={0.06} duration={0.5} trigger="mount">
          <h1 className="mt-6 font-display text-4xl font-extrabold uppercase tracking-[-0.035em] leading-[1.06] text-app-text sm:text-6xl lg:text-7xl">
            {landingHero.titleLead}{" "}
            <span className="text-red-500">{landingHero.titleAccent}</span>{" "}
            {landingHero.titleTrail}
          </h1>
        </AnimatedContent>

        {/* Subtitle */}
        <AnimatedContent delay={0.12} duration={0.5} trigger="mount">
          <p className="mx-auto mt-7 max-w-2xl text-base font-normal leading-relaxed text-muted sm:text-lg sm:leading-8">
            {landingHero.subtitle}
          </p>
        </AnimatedContent>

        {/* High-Contrast Action Pair */}
        <AnimatedContent delay={0.18} duration={0.5} trigger="mount">
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <LandingAuthActions primaryLabel="Começar agora" />
            <a
              className="inline-flex h-12 items-center justify-center rounded-md border border-line bg-panel/40 px-6 text-xs font-semibold uppercase tracking-wider text-app-text transition hover:border-line-strong hover:bg-panel"
              href="#produto"
            >
              {landingHero.secondaryCta}
            </a>
          </div>
        </AnimatedContent>

        {/* Memphis Proof Row with Bullet Pluses */}
        <AnimatedContent delay={0.24} duration={0.5} trigger="mount">
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-bold uppercase tracking-wider text-muted">
            {landingPills.map((pill) => (
              <span className="inline-flex items-center gap-2" key={pill}>
                <span className="font-mono text-red-500">+</span>
                {pill}
              </span>
            ))}
          </div>
        </AnimatedContent>

        {/* Product Frame with Memphis Technical Corner Accents */}
        <AnimatedContent delay={0.3} duration={0.6} trigger="mount">
          <div className="relative mt-14 w-full max-w-5xl">
            {/* Top-left & bottom-right Memphis corner markers */}
            <div className="absolute -left-3 -top-3 z-20 font-mono text-sm font-bold text-red-500">
              ⌜
            </div>
            <div className="absolute -right-3 -top-3 z-20 font-mono text-sm font-bold text-red-500">
              ⌝
            </div>
            <div className="absolute -bottom-3 -left-3 z-20 font-mono text-sm font-bold text-red-500">
              ⌞
            </div>
            <div className="absolute -bottom-3 -right-3 z-20 font-mono text-sm font-bold text-red-500">
              ⌟
            </div>

            <div className="overflow-hidden rounded-xl border border-line bg-app shadow-2xl">
              {/* Frame Chrome Header */}
              <div className="flex items-center justify-between border-b border-line bg-panel px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-red-500" />
                  <span className="size-2.5 rounded-full bg-muted/40" />
                  <span className="size-2.5 rounded-full bg-muted/40" />
                  <span className="ml-3 font-mono text-xs text-muted">
                    app.lojaveiculos.com.br/estoque
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  <span className="font-mono text-xs text-emerald-400">
                    [ONLINE]
                  </span>
                </div>
              </div>

              {/* Product Screenshot */}
              <img
                alt="Painel de estoque da Loja Veículos com veículos, status e ações operacionais"
                className="block aspect-[16/9] w-full object-cover object-top"
                decoding="async"
                src="/marketing/hero-app-shot.jpg"
                loading="eager"
              />
            </div>
          </div>
        </AnimatedContent>
      </div>
    </section>
  );
}
