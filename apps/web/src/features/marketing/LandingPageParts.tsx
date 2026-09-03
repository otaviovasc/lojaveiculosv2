import { Check, Quote } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedContent from "../../components/ui/AnimatedContent";
import { Logo } from "../../components/ui";
import { LandingAuthActions } from "./LandingAuthActions";
import { FeatureSection } from "./LandingFeatureSection";
import {
  MemphisCarIcon,
  MemphisConcentric,
  MemphisDotMatrix,
  MemphisGearIcon,
  MemphisHatch,
  MemphisPlusGrid,
  MemphisSpeedCheckered,
  MemphisSquiggle,
  MemphisStarburst,
  MemphisTachometerArc,
  MemphisTurboIcon,
  MemphisZigZag,
} from "./LandingMemphisGraphics";
import {
  landingFinalCta,
  landingMetrics,
  landingPains,
  landingSteps,
  landingTestimonials,
} from "./landingContent";

export { FeatureSection };

export function MetricsSection() {
  return (
    <section className="relative border-y border-line/60 bg-panel/30 overflow-hidden">
      {/* Branded LV Logo Outline Pattern from logged-in shell */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-logo-pattern-subtle select-none"
      />

      {/* Memphis Accent Background Graphics */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 select-none opacity-20"
      >
        <MemphisPlusGrid
          cols={6}
          rows={2}
          className="absolute left-6 top-4 text-muted"
        />
        <MemphisDotMatrix
          cols={8}
          rows={3}
          className="absolute right-8 bottom-4 text-red-500/40"
        />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl divide-y divide-line/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {landingMetrics.slice(0, 3).map(({ metric, label, text }, index) => (
          <AnimatedContent delay={0.06 * index} key={label}>
            <div className="relative flex flex-col items-center px-6 py-12 text-center sm:py-16">
              {/* Memphis corner marker */}
              <span className="absolute top-3 left-3 font-mono text-xs text-muted">
                +
              </span>
              <span className="font-display text-5xl font-extrabold tracking-tight text-app-text sm:text-6xl">
                {metric}
              </span>
              <span className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-red-500">
                {label}
              </span>
              <p className="mt-2 max-w-xs text-sm font-normal leading-relaxed text-muted">
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
    <section className="relative px-5 py-24 sm:px-8 sm:py-32 lg:px-10 overflow-hidden">
      {/* Memphis Background Hatch & Squiggles */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-20 select-none opacity-20"
      >
        <MemphisHatch className="w-24 h-16 text-muted" />
        <MemphisSquiggle className="mt-2 w-28 h-5 text-red-500" />
      </div>

      <div className="mx-auto max-w-7xl">
        <AnimatedContent>
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-red-500 font-bold">
                +
              </span>
              <span className="text-xs font-black uppercase tracking-[0.24em] text-red-500">
                O status quo do mercado
              </span>
            </div>
            <h2 className="mt-3 font-display text-3xl font-extrabold uppercase tracking-tight text-app-text sm:text-5xl">
              Por que a maioria das lojas{" "}
              <span className="text-red-500">perde o jogo digital.</span>
            </h2>
            <p className="mt-4 text-base text-muted">
              Os quatro gargalos estruturais que travam a velocidade e drenam a
              margem de uma revenda tradicional:
            </p>
          </div>
        </AnimatedContent>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {landingPains.map(({ title, pain }, index) => (
            <AnimatedContent delay={0.05 * index} key={title}>
              <div className="relative flex h-full flex-col justify-between border-t border-line/80 pt-6">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex size-7 items-center justify-center rounded bg-red-500/10 font-mono text-xs font-bold text-red-500 border border-red-500/20">
                      0{index + 1}
                    </span>
                    <span className="font-mono text-xs text-muted">///</span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold uppercase tracking-wide text-app-text">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {pain}
                  </p>
                </div>
              </div>
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
      className="relative border-y border-line/60 bg-panel/30 px-5 py-24 sm:px-8 sm:py-32 lg:px-10 overflow-hidden"
      id="como-funciona"
    >
      <div className="mx-auto max-w-7xl">
        <AnimatedContent>
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-red-500 font-bold">
                ✦
              </span>
              <span className="text-xs font-black uppercase tracking-[0.24em] text-red-500">
                Como funciona o motor
              </span>
            </div>
            <h2 className="mt-3 font-display text-3xl font-extrabold uppercase tracking-tight text-app-text sm:text-5xl">
              Da entrada do pátio{" "}
              <span className="text-red-500">ao dinheiro no caixa.</span>
            </h2>
            <p className="mt-4 text-base text-muted">
              Uma esteira contínua em três fases para operar sem retrabalho
              manual.
            </p>
          </div>
        </AnimatedContent>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {landingSteps.map(({ step, title, text }, index) => (
            <AnimatedContent delay={0.06 * index} key={title}>
              <div className="relative flex h-full flex-col justify-between border-t border-line/80 pt-6">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex size-8 items-center justify-center rounded-sm bg-red-600 font-mono text-xs font-black text-white">
                      {step}
                    </span>
                    <MemphisZigZag className="w-16 h-3 text-muted" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-bold uppercase tracking-wide text-app-text">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {text}
                  </p>
                </div>
              </div>
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
      className="relative border-t border-line/60 bg-gradient-to-b from-panel/20 via-panel/60 to-red-600 px-5 pt-20 pb-32 sm:px-8 sm:pt-28 sm:pb-40 lg:px-10 overflow-hidden"
      id="clientes"
    >
      <div className="relative mx-auto max-w-7xl z-10">
        <AnimatedContent>
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-red-500 font-bold">
                ✶
              </span>
              <span className="text-xs font-black uppercase tracking-[0.24em] text-red-500">
                Showrooms parceiros
              </span>
            </div>
            <h2 className="mt-3 font-display text-3xl font-extrabold uppercase tracking-tight text-app-text sm:text-5xl">
              Experiência real de{" "}
              <span className="text-red-500">quem opera com a gente.</span>
            </h2>
          </div>
        </AnimatedContent>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {landingTestimonials.map(
            ({ name, location, quote, image }, index) => (
              <AnimatedContent delay={0.06 * index} key={name}>
                <figure className="relative flex h-full flex-col justify-between border-t border-line/80 pt-6 bg-panel/70 backdrop-blur-md rounded-b-xl p-5 shadow-lg">
                  <div>
                    <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-lg border border-line bg-app">
                      <img
                        alt={`Fachada da loja parceira ${name}`}
                        className="size-full object-cover"
                        src={image}
                        loading="lazy"
                      />
                    </div>
                    <Quote className="size-5 text-red-500" />
                    <blockquote className="mt-3 text-sm leading-relaxed text-app-text">
                      “{quote}”
                    </blockquote>
                  </div>

                  <figcaption className="mt-6 border-t border-line/60 pt-4">
                    <p className="font-display text-sm font-bold text-app-text">
                      {name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{location}</p>
                  </figcaption>
                </figure>
              </AnimatedContent>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative bg-gradient-to-br from-red-600 via-red-600 to-red-700 px-5 pt-14 pb-28 text-white sm:px-8 sm:pt-20 sm:pb-36 lg:px-10 overflow-hidden -mt-1">
      {/* Branded LV Logo Outline Pattern overlay on red */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-logo-pattern opacity-10 select-none mix-blend-overlay"
      />

      {/* Subtle Ambient Background Watermarks */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      >
        <span className="absolute top-4 right-6 font-mono text-xs text-white/30 tracking-widest hidden sm:block">
          + + +
        </span>
        <span className="absolute bottom-6 left-6 font-mono text-xs text-white/30 tracking-widest hidden sm:block">
          + + +
        </span>

        {/* Ambient watermark for smaller viewports (< lg) */}
        <MemphisTachometerArc className="absolute -top-10 -left-10 size-48 text-white/10 lg:hidden" />
        <MemphisConcentric className="absolute -bottom-14 -right-14 size-56 text-white/10 lg:hidden" />
        <MemphisSpeedCheckered
          cols={6}
          className="absolute bottom-4 left-4 text-white/15 lg:hidden"
        />
      </div>

      {/* Left Flank Memphis Composition (Clean Automotive Vectors - Desktop) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-6 xl:left-14 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-6 select-none z-0"
      >
        <MemphisTachometerArc className="size-28 text-white/35 transition-transform duration-700 hover:scale-105" />
        <MemphisSpeedCheckered
          cols={8}
          className="text-white opacity-40 -rotate-6"
        />
        <div className="flex items-center gap-3">
          <MemphisCarIcon className="size-8 text-white/80 drop-shadow" />
          <MemphisSquiggle className="w-20 h-4 text-white/60 -rotate-3" />
        </div>
      </div>

      {/* Right Flank Memphis Composition (Clean Engineering Vectors - Desktop) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-6 xl:right-14 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-6 select-none z-0"
      >
        <div className="relative flex size-28 items-center justify-center">
          <MemphisConcentric className="size-28 text-white/25" />
          <MemphisGearIcon className="absolute size-9 text-white/70 animate-[spin_20s_linear_infinite]" />
        </div>
        <MemphisHatch className="w-20 h-10 text-white/25 rounded-sm border border-white/20 rotate-3" />
        <div className="flex items-center gap-3">
          <MemphisStarburst className="size-8 text-white/85 drop-shadow animate-pulse" />
          <MemphisTurboIcon className="size-8 text-white/80" />
        </div>
      </div>

      {/* Central CTA Content */}
      <div className="relative mx-auto max-w-3xl text-center z-10">
        <AnimatedContent>
          <p className="text-xs font-black uppercase tracking-[0.26em] text-white/90">
            {landingFinalCta.badge}
          </p>

          <h2 className="mt-4 font-display text-3xl font-extrabold uppercase tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-md text-balance">
            {landingFinalCta.title}
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-base text-white/95 sm:text-lg leading-relaxed text-pretty">
            {landingFinalCta.text}
          </p>

          <div className="mt-10 flex items-center justify-center">
            <Link
              to="/signup"
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-lg bg-black px-10 text-xs sm:text-sm font-bold uppercase tracking-wider text-white transition-all duration-200 hover:bg-neutral-900 hover:scale-105 active:scale-[0.98] border border-white/15"
            >
              <span>Criar minha loja</span>
              <span className="font-mono text-base transition-transform duration-200 group-hover:translate-x-1.5">
                →
              </span>
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-bold text-white/95">
            {landingFinalCta.points.map((point) => (
              <span className="inline-flex items-center gap-2" key={point}>
                <Check className="size-4 text-white stroke-[3]" />
                {point}
              </span>
            ))}
          </div>
        </AnimatedContent>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="relative z-20 border-t border-line/60 bg-app px-5 py-12 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <Link
          aria-label="Loja Veículos — início"
          className="flex items-center gap-3"
          to="/"
        >
          <Logo className="h-7 w-auto" variant="auto" />
        </Link>
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted">
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
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} Loja Veículos. Todos os direitos
          reservados.
        </p>
      </div>
    </footer>
  );
}
