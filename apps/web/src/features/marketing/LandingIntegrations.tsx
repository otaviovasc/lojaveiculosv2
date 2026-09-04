import AnimatedContent from "../../components/ui/AnimatedContent";
import { landingPortals } from "./landingContent";

export function IntegrationsSection() {
  return (
    <section
      className="relative border-y border-line/60 bg-app-elevated/30 py-12 overflow-hidden"
      id="portais"
    >
      {/* Branded Logo Pattern from logged-in design */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-logo-pattern select-none"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <AnimatedContent>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Sincronização em tempo real com os maiores portais automotivos
          </p>
        </AnimatedContent>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-8 sm:gap-14">
          {landingPortals.map((portal) => (
            <div
              key={portal.name}
              className="flex h-8 items-center justify-center"
            >
              <img
                alt={`Logo ${portal.name}`}
                className="h-6 sm:h-7 w-auto max-w-[130px] object-contain opacity-60 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
                src={portal.logo}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
