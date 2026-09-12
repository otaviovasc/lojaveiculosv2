import { Check, Moon, Sun, SunMoon } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import type {
  WebsiteBuilderAppearanceMode,
  WebsiteBuilderConfig,
} from "./WebsiteBuilderTypes";

const options: Array<{
  description: string;
  icon: typeof Sun;
  label: string;
  value: WebsiteBuilderAppearanceMode;
}> = [
  {
    description: "Mantém a vitrine sempre clara.",
    icon: Sun,
    label: "Claro",
    value: "light",
  },
  {
    description: "Mantém a vitrine sempre escura.",
    icon: Moon,
    label: "Escuro",
    value: "dark",
  },
  {
    description: "Exibe um botão para o visitante escolher.",
    icon: SunMoon,
    label: "Claro e escuro",
    value: "both",
  },
];

export function WebsiteBuilderAppearancePanel({
  config,
  updateConfig,
}: {
  config: WebsiteBuilderConfig;
  updateConfig: <K extends keyof WebsiteBuilderConfig>(
    key: K,
    value: WebsiteBuilderConfig[K],
  ) => void;
}) {
  const groupName = useId();
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-semibold text-foreground">
        Preferência de aparência
      </legend>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Escolha como a vitrine pública deve ser apresentada aos visitantes.
      </p>
      <div className="grid gap-2">
        {options.map((option) => {
          const selected = config.appearanceMode === option.value;
          const Icon = option.icon;
          return (
            <label
              className={cn(
                "relative flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                selected
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border/40 bg-card/40 text-foreground hover:bg-muted/30",
              )}
              key={option.value}
            >
              <input
                checked={selected}
                className="sr-only"
                name={`website-builder-appearance-${groupName}`}
                onChange={() => updateConfig("appearanceMode", option.value)}
                type="radio"
                value={option.value}
              />
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background/80">
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">
                  {option.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {option.description}
                </span>
              </span>
              {selected ? (
                <Check
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-primary"
                />
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
