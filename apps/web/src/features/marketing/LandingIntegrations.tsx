import AnimatedContent from "../../components/ui/AnimatedContent";
import { landingPortals } from "./landingContent";

export function IntegrationsSection() {
  return (
    <section
      className="border-y border-line/60 bg-app-elevated/30 py-12"
      id="portais"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <AnimatedContent>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Sincronização em tempo real com os maiores portais automotivos
          </p>
        </AnimatedContent>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-8 sm:gap-14">
          {landingPortals.map((portal) => (
            <img
              key={portal.name}
              alt={`Logo ${portal.name}`}
              className="h-7 w-auto max-w-[120px] object-contain opacity-50 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
              src={portal.logo}
              loading="lazy"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
