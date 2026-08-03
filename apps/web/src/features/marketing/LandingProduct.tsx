import { Check } from "lucide-react";
import AnimatedContent from "../../components/ui/AnimatedContent";
import { landingProductHighlights } from "./landingContent";

export function ProductSection() {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-10" id="produto">
      <div className="mx-auto max-w-7xl">
        <AnimatedContent>
          <div className="flex flex-col items-center text-center">
            <span className="landing-glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-[0.26em] text-muted">
              <span className="size-1.5 rounded-full bg-accent" />A plataforma
              por dentro
            </span>
            <h2 className="mt-6 max-w-3xl font-display text-3xl font-black leading-tight tracking-tight text-app-text sm:text-5xl">
              Tecnologia de ponta{" "}
              <span className="text-accent">para sua revenda.</span>
            </h2>
          </div>
        </AnimatedContent>
        <AnimatedContent delay={0.08}>
          <figure className="landing-glass mt-12 overflow-hidden rounded-xl shadow-2xl">
            <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="ml-3 flex-1 truncate rounded-md bg-app px-3 py-1 text-xs font-semibold text-muted">
                app.lojaveiculos.com.br/estoque
              </span>
            </div>
            <img
              alt="Painel de estoque da Loja Veículos com veículos, status e ações operacionais"
              className="block aspect-[16/9] w-full object-cover object-top"
              decoding="async"
              src="/marketing/hero-app-shot.jpg"
            />
          </figure>
        </AnimatedContent>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {landingProductHighlights.map(({ title, text }, index) => (
            <AnimatedContent delay={0.08 * index} key={title}>
              <article className="h-full rounded-lg border border-line bg-panel p-5">
                <span className="flex size-8 items-center justify-center rounded-md bg-accent-soft">
                  <Check className="size-4 text-accent" />
                </span>
                <h3 className="mt-4 text-base font-black text-app-text">
                  {title}
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
