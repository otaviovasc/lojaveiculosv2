import { ArrowRight, Sparkles } from "lucide-react";
import AnimatedContent from "../../components/ui/AnimatedContent";
import { LandingAuthActions } from "./LandingAuthActions";
import { LandingHeroShader } from "./LandingHeroShader";
import { LandingNav } from "./LandingNav";
import { landingHero, landingPills } from "./landingContent";

export { LandingNav };

export function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[85svh] flex-col items-center overflow-hidden bg-app text-app-text transition-colors duration-200">
      <LandingHeroShader />
      <div aria-hidden="true" className="landing-hero-ambient" />

      {/* Hero Content */}
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-20 pt-10 text-center sm:px-6 sm:pt-16 lg:px-8">
        {/* Minimal Category Lead */}
        <AnimatedContent duration={0.4} trigger="mount">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-red-500 font-bold">+</span>
            <p className="text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.28em] text-red-500">
              {landingHero.badge}
            </p>
          </div>
        </AnimatedContent>

        {/* Stark, Authoritative Headline */}
        <AnimatedContent delay={0.06} duration={0.5} trigger="mount">
          <h1 className="mt-5 font-display text-3xl font-extrabold uppercase tracking-[-0.03em] leading-[1.08] text-app-text sm:text-6xl lg:text-7xl">
            {landingHero.titleLead}{" "}
            <span className="text-red-500">{landingHero.titleAccent}</span>{" "}
            {landingHero.titleTrail}
          </h1>
        </AnimatedContent>

        {/* Subtitle */}
        <AnimatedContent delay={0.12} duration={0.5} trigger="mount">
          <p className="mx-auto mt-5 max-w-2xl text-sm font-normal leading-relaxed text-muted sm:text-lg sm:leading-8">
            {landingHero.subtitle}
          </p>
        </AnimatedContent>

        {/* High-Contrast Action Pair */}
        <AnimatedContent delay={0.18} duration={0.5} trigger="mount">
          <div className="mt-8 flex w-full max-w-xs flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
            <LandingAuthActions primaryLabel="Começar agora" />
            <a
              className="inline-flex h-12 items-center justify-center rounded-md border border-line bg-panel px-6 text-xs font-semibold uppercase tracking-wider text-app-text transition hover:border-line-strong hover:bg-panel-card"
              href="#funcionalidades"
            >
              {landingHero.secondaryCta}
            </a>
          </div>
        </AnimatedContent>

        {/* Proof Row with Bullet Pluses */}
        <AnimatedContent delay={0.24} duration={0.5} trigger="mount">
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-wider text-muted">
            {landingPills.map((pill) => (
              <span className="inline-flex items-center gap-1.5" key={pill}>
                <span className="font-mono text-red-500">+</span>
                {pill}
              </span>
            ))}
          </div>
        </AnimatedContent>

        {/* Product Frame with Clean Corner Brackets */}
        <AnimatedContent delay={0.3} duration={0.6} trigger="mount">
          <div className="relative mt-12 w-full max-w-5xl">
            {/* Corner markers on tablet/desktop */}
            <div className="absolute -left-3 -top-3 z-20 hidden font-mono text-sm font-bold text-red-500 sm:block">
              ⌜
            </div>
            <div className="absolute -right-3 -top-3 z-20 hidden font-mono text-sm font-bold text-red-500 sm:block">
              ⌝
            </div>
            <div className="absolute -bottom-3 -left-3 z-20 hidden font-mono text-sm font-bold text-red-500 sm:block">
              ⌞
            </div>
            <div className="absolute -bottom-3 -right-3 z-20 hidden font-mono text-sm font-bold text-red-500 sm:block">
              ⌟
            </div>

            <div className="overflow-hidden rounded-xl border border-line bg-app shadow-2xl">
              {/* Frame Chrome Header */}
              <div className="flex items-center justify-between border-b border-line bg-panel px-3 py-2 sm:px-4 sm:py-2.5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-red-500 sm:size-2.5" />
                  <span className="size-2 rounded-full bg-muted/40 sm:size-2.5" />
                  <span className="size-2 rounded-full bg-muted/40 sm:size-2.5" />
                  <span className="ml-2 truncate font-mono text-xs text-muted sm:ml-3">
                    app.lojaveiculos.com.br/estoque
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="font-mono text-xs font-bold text-emerald-500">
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
