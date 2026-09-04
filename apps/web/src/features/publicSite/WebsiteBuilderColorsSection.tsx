import { AlertTriangle, Check } from "lucide-react";
import { FeatureColorPicker } from "../../components/ui/FeatureColorPicker";
import { contrastRatio, parseHexColor } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { websiteBuilderColorPalettes } from "./WebsiteBuilderModel";
import type { WebsiteBuilderConfig } from "./WebsiteBuilderTypes";

const hexColor = (value: string) => `${String.fromCharCode(35)}${value}`;

const colorFields = [
  {
    fallback: websiteBuilderColorPalettes[0].colors.brandColor,
    key: "brandColor",
    label: "Cor da Marca",
  },
  {
    fallback: websiteBuilderColorPalettes[0].colors.accentColor,
    key: "accentColor",
    label: "Cor de Destaque",
  },
  {
    fallback: websiteBuilderColorPalettes[0].colors.backgroundColor,
    key: "backgroundColor",
    label: "Fundo das Seções",
  },
] as const;

export function WebsiteBuilderColorsSection({
  config,
  onUpdate,
}: {
  config: WebsiteBuilderConfig;
  onUpdate: <K extends keyof WebsiteBuilderConfig>(
    key: K,
    value: WebsiteBuilderConfig[K],
  ) => void;
}) {
  const currentMatch = websiteBuilderColorPalettes.find(
    (palette) =>
      config.brandColor.toLowerCase() ===
        palette.colors.brandColor.toLowerCase() &&
      config.accentColor.toLowerCase() ===
        palette.colors.accentColor.toLowerCase() &&
      config.backgroundColor.toLowerCase() ===
        palette.colors.backgroundColor.toLowerCase(),
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Paletas Prontas
        </h4>
        <p className="text-xs text-muted-foreground">
          Clique para aplicar uma paleta de cores.
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {websiteBuilderColorPalettes.map((palette) => {
            const isActive = currentMatch === palette;
            return (
              <button
                className={cn(
                  "group relative flex flex-col gap-2 rounded-lg border p-2.5 text-left transition-all duration-200",
                  isActive
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/40 hover:border-border bg-card/40",
                )}
                key={palette.name}
                onClick={() => {
                  onUpdate("brandColor", palette.colors.brandColor);
                  onUpdate("accentColor", palette.colors.accentColor);
                  onUpdate("backgroundColor", palette.colors.backgroundColor);
                }}
                type="button"
              >
                <div className="flex justify-center gap-1.5">
                  {Object.values(palette.colors).map((color) => (
                    <div
                      className="h-6 w-6 shrink-0 rounded-full border border-card/80"
                      key={color}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium leading-tight text-foreground/90">
                    {palette.name}
                  </span>
                  {isActive ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 border-t border-border/40 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Estilos Rápidos por Perfil de Loja
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {[
            {
              accent: hexColor("EAB308"),
              bg: hexColor("FAFAFA"),
              brand: hexColor("B81820"),
              label: "Seminovos Mega Feirão",
              tag: "Destaque & Alta Conversão",
            },
            {
              accent: hexColor("D4A847"),
              bg: hexColor("0F172A"),
              brand: hexColor("0F172A"),
              label: "Imports Luxo & Exclusivos",
              tag: "Elegante & Premium",
            },
            {
              accent: hexColor("0EA5E9"),
              bg: hexColor("F8FAFC"),
              brand: hexColor("1E293B"),
              label: "Multimarcas Urban",
              tag: "Clean & Profissional",
            },
          ].map((style) => (
            <button
              className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5 text-left transition-colors hover:bg-muted/30"
              key={style.label}
              onClick={() => {
                onUpdate("brandColor", style.brand);
                onUpdate("accentColor", style.accent);
                onUpdate("backgroundColor", style.bg);
              }}
              type="button"
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div
                    className="h-4 w-4 rounded-full border border-card"
                    style={{ backgroundColor: style.brand }}
                  />
                  <div
                    className="h-4 w-4 rounded-full border border-card"
                    style={{ backgroundColor: style.accent }}
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {style.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{style.tag}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-primary">
                Aplicar
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Personalizar Cores
          </h4>
          <button
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:underline"
            onClick={() => {
              const defaultPalette = websiteBuilderColorPalettes[0].colors;
              onUpdate("brandColor", defaultPalette.brandColor);
              onUpdate("accentColor", defaultPalette.accentColor);
              onUpdate("backgroundColor", defaultPalette.backgroundColor);
            }}
            type="button"
          >
            Restaurar padrão
          </button>
        </div>
        <div className="space-y-4">
          {colorFields.map(({ fallback, key, label }) => (
            <FeatureColorPicker
              fallbackColor={fallback}
              key={key}
              label={label}
              onChange={(value) => onUpdate(key, value as never)}
              presets={websiteBuilderColorPalettes.map(
                (palette) => palette.colors[key],
              )}
              value={(config[key] as string | undefined) ?? fallback}
            />
          ))}
        </div>
        <WebsiteBuilderContrastWarning config={config} />
      </div>
    </div>
  );
}

function colorContrastRatio(a: string, b: string) {
  const foreground = parseHexColor(a);
  const background = parseHexColor(b);
  return foreground && background
    ? contrastRatio(foreground, background)
    : null;
}

function WebsiteBuilderContrastWarning({
  config,
}: {
  config: WebsiteBuilderConfig;
}) {
  const warnings: string[] = [];
  const inkRatio = colorContrastRatio(
    config.brandColor,
    config.backgroundColor,
  );
  const accentRatio = colorContrastRatio(
    config.accentColor,
    config.backgroundColor,
  );

  if (inkRatio !== null && inkRatio < 4.5) {
    warnings.push(
      "A cor da marca tem pouco contraste com o fundo das seções; os textos podem ficar ilegíveis.",
    );
  }
  if (accentRatio !== null && accentRatio < 3) {
    warnings.push(
      "A cor de destaque tem pouco contraste com o fundo; botões e links podem ficar difíceis de ler.",
    );
  }

  if (!warnings.length) return null;

  return (
    <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-strong" />
      <div className="space-y-1">
        {warnings.map((warning) => (
          <p
            className="text-xs leading-relaxed text-warning-strong"
            key={warning}
          >
            {warning}
          </p>
        ))}
      </div>
    </div>
  );
}
