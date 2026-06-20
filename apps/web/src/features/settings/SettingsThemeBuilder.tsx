import { Check } from "lucide-react";
import { SettingsInput } from "./SettingsPanelParts";
import type { StoreSettingsSnapshot } from "./types";

export function SettingsThemeBuilder({
  draft,
  onChange,
}: {
  draft: StoreSettingsSnapshot;
  onChange: (settings: StoreSettingsSnapshot) => void;
}) {
  const theme = normalizeTheme(draft.publicSite.theme);
  const updateTheme = (nextTheme: Record<string, unknown>) =>
    onChange({
      ...draft,
      publicSite: { ...draft.publicSite, theme: nextTheme },
    });

  return (
    <div className="settings-builder">
      <span>Builder da pagina</span>
      <div className="settings-section-toggles">
        {builderSections.map((section) => {
          const enabled = theme.sections.includes(section.key);
          return (
            <button
              className={enabled ? "is-active" : ""}
              key={section.key}
              onClick={() =>
                updateTheme({
                  ...theme,
                  sections: enabled
                    ? theme.sections.filter((key) => key !== section.key)
                    : [...theme.sections, section.key],
                })
              }
              type="button"
            >
              {enabled ? <Check className="size-4" /> : null}
              {section.label}
            </button>
          );
        })}
      </div>
      <SettingsInput
        label="Mensagem principal"
        onChange={(value) => updateTheme({ ...theme, headline: value })}
        value={theme.headline}
      />
      <SettingsInput
        label="Tom visual"
        onChange={(value) => updateTheme({ ...theme, tone: value })}
        value={theme.tone}
      />
    </div>
  );
}

const builderSections = [
  { key: "featured", label: "Destaques" },
  { key: "financing", label: "Financiamento" },
  { key: "trust", label: "Garantias" },
  { key: "contact", label: "Contato" },
] as const;

function normalizeTheme(theme: Record<string, unknown>) {
  return {
    headline:
      typeof theme.headline === "string"
        ? theme.headline
        : "Veiculos selecionados para compra segura",
    sections: Array.isArray(theme.sections)
      ? theme.sections.filter(
          (item): item is string => typeof item === "string",
        )
      : ["featured", "financing", "trust", "contact"],
    tone: typeof theme.tone === "string" ? theme.tone : "professional",
  };
}
