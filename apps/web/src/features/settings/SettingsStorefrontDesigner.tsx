import { Check, LayoutTemplate } from "lucide-react";
import {
  applyStorefrontTemplate,
  createStorefrontTheme,
  normalizeStorefrontTemplateKey,
  storefrontTemplates,
  type StorefrontTemplateKey,
} from "../publicSite/storefrontTemplates";
import {
  SettingsInput,
  SettingsStatus,
  SettingsTextarea,
} from "./SettingsPanelParts";
import { SettingsStorefrontPreview } from "./SettingsStorefrontPreview";
import type { StoreSettingsSnapshot } from "./types";

export function SettingsStorefrontDesigner({
  draft,
  onChange,
}: {
  draft: StoreSettingsSnapshot;
  onChange: (settings: StoreSettingsSnapshot) => void;
}) {
  const theme = createStorefrontTheme(
    draft.publicSite.theme,
    draft.publicSite.layoutKey,
  );
  const selectedTemplateKey = normalizeStorefrontTemplateKey(
    draft.publicSite.layoutKey,
  );
  const setPublicSite = (
    publicSite: Partial<StoreSettingsSnapshot["publicSite"]>,
  ) =>
    onChange({ ...draft, publicSite: { ...draft.publicSite, ...publicSite } });
  const setTheme = (nextTheme: Record<string, unknown>) =>
    setPublicSite({ theme: nextTheme });
  const selectTemplate = (key: StorefrontTemplateKey) =>
    setPublicSite({
      layoutKey: key,
      theme: applyStorefrontTemplate(draft.publicSite.theme, key),
    });

  return (
    <div className="storefront-designer">
      <div className="settings-builder">
        <span>Template da vitrine</span>
        <div className="storefront-template-grid">
          {storefrontTemplates.map((template) => (
            <button
              className={
                selectedTemplateKey === template.key
                  ? "storefront-template-card is-active"
                  : "storefront-template-card"
              }
              key={template.key}
              onClick={() => selectTemplate(template.key)}
              type="button"
            >
              <span className="storefront-template-icon">
                <LayoutTemplate aria-hidden="true" className="size-5" />
              </span>
              <span>
                <strong>{template.label}</strong>
                <p>{template.description}</p>
              </span>
            </button>
          ))}
        </div>
      </div>

      <SettingsInput
        label="Dominio proprio"
        onChange={(value) => setPublicSite({ customDomain: value || null })}
        placeholder="www.sualoja.com.br"
        type="url"
        value={draft.publicSite.customDomain ?? ""}
      />
      <SettingsStatus status={draft.publicSite.customDomainStatus} />
      <SettingsInput
        label="Imagem principal"
        onChange={(value) => setPublicSite({ heroImageUrl: value || null })}
        placeholder="https://..."
        type="url"
        value={draft.publicSite.heroImageUrl ?? ""}
      />
      <SettingsInput
        label="Chamada principal"
        onChange={(value) => setTheme({ ...theme, headline: value })}
        maxLength={96}
        value={theme.headline}
      />
      <SettingsInput
        label="Selo da vitrine"
        onChange={(value) => setTheme({ ...theme, badgeLabel: value })}
        maxLength={36}
        value={theme.badgeLabel}
      />
      <SettingsInput
        label="Texto do CTA"
        onChange={(value) => setTheme({ ...theme, ctaLabel: value })}
        maxLength={32}
        value={theme.ctaLabel}
      />
      <SettingsInput
        label="SEO title"
        onChange={(value) => setPublicSite({ seoTitle: value })}
        maxLength={70}
        value={draft.publicSite.seoTitle ?? ""}
      />
      <SettingsTextarea
        label="SEO description"
        onChange={(value) => setPublicSite({ seoDescription: value })}
        value={draft.publicSite.seoDescription ?? ""}
      />

      <div className="settings-builder">
        <span>Blocos visiveis</span>
        <div className="settings-section-toggles">
          {builderSections.map((section) => {
            const enabled = theme.sections.includes(section.key);
            return (
              <button
                className={enabled ? "is-active" : ""}
                key={section.key}
                onClick={() =>
                  setTheme({
                    ...theme,
                    sections: enabled
                      ? theme.sections.filter((key) => key !== section.key)
                      : [...theme.sections, section.key],
                  })
                }
                type="button"
              >
                {enabled ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : null}
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="settings-toggle">
        <input
          checked={draft.publicSite.isPublished}
          onChange={(event) =>
            setPublicSite({ isPublished: event.target.checked })
          }
          type="checkbox"
        />
        <span>Publicar vitrine no subdominio</span>
      </label>

      <SettingsStorefrontPreview draft={draft} />
    </div>
  );
}

const builderSections = [
  { key: "featured", label: "Estoque" },
  { key: "financing", label: "Financiamento" },
  { key: "trust", label: "Garantias" },
  { key: "contact", label: "Contato" },
] as const;
