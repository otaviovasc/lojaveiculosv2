import {
  Calendar,
  Gauge,
  Fuel,
  Settings2,
  Palette,
  DoorOpen,
  Hash,
  Fingerprint,
  Layers,
} from "lucide-react";
import type { StorefrontBuilderComponent } from "@lojaveiculosv2/shared";
import type { BuilderRenderContext } from "./pageBuilderRenderTypes";
import { textProp } from "./pageBuilderRenderUtils";

export function VehicleSpecsBlock({
  component,
}: {
  component: StorefrontBuilderComponent;
  context: BuilderRenderContext;
}) {
  const props = component.props;
  const title = textProp(props.title) ?? "Ficha Técnica";
  const subtitle =
    textProp(props.subtitle) ?? "Especificações detalhadas do veículo";
  const specs = (props.specs ?? {}) as Record<string, string>;

  // Icon mapping helper
  const getIconForSpec = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes("ano")) return <Calendar className="size-4 text-accent" />;
    if (k.includes("km") || k.includes("quilometragem") || k.includes("rodado"))
      return <Gauge className="size-4 text-accent" />;
    if (k.includes("combust") || k.includes("fuel"))
      return <Fuel className="size-4 text-accent" />;
    if (k.includes("cambio") || k.includes("câmbio") || k.includes("transmiss"))
      return <Settings2 className="size-4 text-accent" />;
    if (k.includes("cor")) return <Palette className="size-4 text-accent" />;
    if (k.includes("porta")) return <DoorOpen className="size-4 text-accent" />;
    if (k.includes("placa")) return <Hash className="size-4 text-accent" />;
    if (k.includes("chassi") || k.includes("vin"))
      return <Fingerprint className="size-4 text-accent" />;
    return <Layers className="size-4 text-accent" />;
  };

  const specsList = Object.entries(specs).filter(
    ([, value]) => value && value !== "Não informado" && value !== "-",
  );

  return (
    <section className="bg-panel border-y border-line/45 py-14">
      <div className="public-storefront-shell px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-accent">
            Ficha Técnica
          </p>
          <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight md:text-4xl text-app-text">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2.5 text-sm font-medium leading-relaxed text-muted">
              {subtitle}
            </p>
          )}
        </div>

        {specsList.length === 0 ? (
          <p className="text-center text-xs font-bold text-muted">
            Nenhuma especificação informada.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {specsList.map(([label, value]) => (
              <div
                key={label}
                className="bg-app border border-line/50 rounded-xl p-4.5 flex flex-col justify-between gap-3 shadow-[0_2px_8px_rgba(15,23,42,0.01)] transition-all duration-300 hover:border-accent/30 hover:shadow-[0_8px_20px_rgba(15,23,42,0.03)]"
              >
                <div className="flex items-center justify-between gap-2 border-b border-line/30 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-muted truncate">
                    {label}
                  </span>
                  {getIconForSpec(label)}
                </div>
                <strong className="block text-sm font-extrabold text-app-text leading-tight break-words">
                  {value}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
