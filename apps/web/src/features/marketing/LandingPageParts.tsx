import { Check, Quote } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedContent from "../../components/ui/AnimatedContent";
import { Logo } from "../../components/ui";
import { LandingAuthActions } from "./LandingAuthActions";
import { FeatureSection } from "./LandingFeatureSection";
import {
  MemphisCarIcon,
  MemphisCheckered,
  MemphisConcentric,
  MemphisCrosshair,
  MemphisDotMatrix,
  MemphisGaugeIcon,
  MemphisGearIcon,
  MemphisHatch,
  MemphisPlusGrid,
  MemphisSquiggle,
  MemphisStarburst,
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
    <section className="relative bg-gradient-to-b from-red-600 to-red-700 px-5 pt-4 pb-28 text-white sm:px-8 sm:pb-36 lg:px-10 overflow-hidden -mt-1">
      {/* Branded LV Logo Outline Pattern overlay on red */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-logo-pattern opacity-10 select-none mix-blend-overlay"
      />

      {/* Automotive & Gearhead Memphis Vectors from Lucide on Solid Red (NO card background) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      >
        {/* Top Left: Car Icon & Plus Grid */}
        <div className="absolute left-8 top-8 opacity-30">
          <MemphisCarIcon className="size-10 text-white" />
          <MemphisPlusGrid cols={4} rows={2} className="mt-3 text-white/40" />
        </div>

        {/* Top Right: Gear Icon & Concentric */}
        <div className="absolute right-10 top-6 opacity-30">
          <MemphisGearIcon className="size-10 text-white" />
          <MemphisConcentric className="mt-2 size-36 text-white/25" />
        </div>

        {/* Bottom Left: Gauge & Checkered Track */}
        <div className="absolute left-10 bottom-8 opacity-35">
          <MemphisGaugeIcon className="size-10 text-white" />
          <MemphisCheckered className="mt-2 text-white/40" />
        </div>

        {/* Bottom Right: Turbo Flame & Starburst */}
        <div className="absolute right-12 bottom-10 opacity-35">
          <MemphisTurboIcon className="size-10 text-white" />
          <MemphisStarburst className="mt-2 size-10 text-white/60" />
        </div>
      </div>

      <div className="relative mx-auto max-w-4xl text-center z-10">
        <AnimatedContent>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/15 px-3.5 py-1 text-xs font-black uppercase tracking-[0.28em] text-white backdrop-blur-sm">
            <span>{landingFinalCta.badge}</span>
          </div>
          <h2 className="mt-5 font-display text-3xl font-extrabold uppercase tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-sm">
            {landingFinalCta.title}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/95 sm:text-lg">
            {landingFinalCta.text}
          </p>
          <div className="mt-10 flex items-center justify-center">
            <Link
              to="/signup"
              className="inline-flex h-12 items-center justify-center rounded-md bg-black px-8 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-neutral-900 active:translate-y-px"
            >
              Criar minha loja
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
