import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { websiteBuilderColorPalettes } from "./WebsiteBuilderModel";
import type { WebsiteBuilderConfig } from "./WebsiteBuilderTypes";

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
    label: "Fundo das Secoes",
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
        <div className="grid grid-cols-2 gap-3">
          {websiteBuilderColorPalettes.map((palette) => {
            const isActive = currentMatch === palette;
            return (
              <button
                className={cn(
                  "group relative flex flex-col gap-2.5 rounded-xl border-2 p-3.5 text-left transition-all duration-200",
                  isActive
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/20"
                    : "border-border/50 hover:border-muted-foreground/40 hover:bg-muted/30",
                )}
                key={palette.name}
                onClick={() => {
                  onUpdate("brandColor", palette.colors.brandColor);
                  onUpdate("accentColor", palette.colors.accentColor);
                  onUpdate("backgroundColor", palette.colors.backgroundColor);
                }}
                type="button"
              >
                <div className="flex justify-center gap-2">
                  {Object.values(palette.colors).map((color) => (
                    <div
                      className="h-8 w-8 shrink-0 rounded-full border-2 border-card shadow-sm"
                      key={color}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium leading-tight text-foreground/90">
                    {palette.name}
                  </span>
                  {isActive ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Personalizar Cores
        </h4>
        <div className="space-y-4">
          {colorFields.map(({ fallback, key, label }) => (
            <div className="space-y-2" key={key}>
              <Label className="text-xs font-medium">{label}</Label>
              <div className="flex items-center gap-3">
                <input
                  className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border-2 border-border/50 shadow-inner"
                  onChange={(event) =>
                    onUpdate(key, event.target.value as never)
                  }
                  type="color"
                  value={(config[key] as string | undefined) ?? fallback}
                />
                <Input
                  className="h-10 flex-1 font-mono text-xs"
                  onChange={(event) =>
                    onUpdate(key, event.target.value as never)
                  }
                  value={(config[key] as string | undefined) ?? ""}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
