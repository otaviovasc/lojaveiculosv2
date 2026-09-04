import AnimatedContent from "../../components/ui/AnimatedContent";
import { landingProductHighlights } from "./landingContent";

export function ProductSection() {
  return (
    <section className="px-5 py-20 sm:px-8 sm:py-28 lg:px-10" id="produto">
      <div className="mx-auto max-w-7xl">
        <AnimatedContent>
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-red-500">
              A plataforma por dentro
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold uppercase tracking-tight text-app-text sm:text-4xl">
              Tecnologia de ponta{" "}
              <span className="text-red-500">para sua revenda.</span>
            </h2>
            <p className="mt-4 text-base font-normal leading-relaxed text-muted">
              Desenvolvida para o ritmo real do pátio: veloz, intuitiva e
              conectada a todas as etapas da venda.
            </p>
          </div>
        </AnimatedContent>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {landingProductHighlights.map(
            ({ title, text, icon: Icon }, index) => (
              <AnimatedContent delay={0.06 * index} key={title}>
                <div className="flex flex-col justify-between border-t border-line/80 pt-6">
                  <div>
                    <Icon className="size-6 text-red-500" />
                    <h3 className="mt-4 font-display text-lg font-bold uppercase tracking-wide text-app-text">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {text}
                    </p>
                  </div>
                </div>
              </AnimatedContent>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
