import { Building2, Globe2, Image, Mail, MapPin, Save } from "lucide-react";
import { useEffect, useState } from "react";
import {
  SettingsInput,
  SettingsSection,
  SettingsStatus,
  SettingsTextarea,
} from "./SettingsPanelParts";
import { SettingsThemeBuilder } from "./SettingsThemeBuilder";
import type { StoreSettingsSnapshot } from "./types";

export function SettingsForm({
  isSaving,
  onSave,
  settings,
}: {
  isSaving: boolean;
  onSave: (settings: StoreSettingsSnapshot) => Promise<void>;
  settings: StoreSettingsSnapshot;
}) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => setDraft(settings), [settings]);

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <SettingsSection icon={<Building2 className="size-5" />} title="Loja">
        <SettingsInput
          label="Nome fantasia"
          onChange={(value) =>
            setDraft({
              ...draft,
              identity: { ...draft.identity, tradingName: value },
            })
          }
          value={draft.identity.tradingName}
        />
        <SettingsInput
          label="Razao social"
          onChange={(value) =>
            setDraft({
              ...draft,
              identity: { ...draft.identity, legalName: value },
            })
          }
          value={draft.identity.legalName ?? ""}
        />
        <SettingsInput
          label="Documento"
          onChange={(value) =>
            setDraft({
              ...draft,
              profile: { ...draft.profile, documentNumber: value },
            })
          }
          value={draft.profile.documentNumber ?? ""}
        />
        <SettingsInput
          icon={<Mail className="size-4" />}
          label="Email"
          onChange={(value) =>
            setDraft({
              ...draft,
              profile: { ...draft.profile, contactEmail: value },
            })
          }
          value={draft.profile.contactEmail ?? ""}
        />
        <SettingsInput
          label="WhatsApp"
          onChange={(value) =>
            setDraft({
              ...draft,
              profile: { ...draft.profile, whatsappPhone: value },
            })
          }
          value={draft.profile.whatsappPhone ?? ""}
        />
        <SettingsInput
          icon={<MapPin className="size-4" />}
          label="Cidade"
          onChange={(value) =>
            setDraft({
              ...draft,
              profile: { ...draft.profile, addressCity: value },
            })
          }
          value={draft.profile.addressCity ?? ""}
        />
      </SettingsSection>

      <SettingsSection
        icon={<Globe2 className="size-5" />}
        title="Site publico"
      >
        <SettingsInput
          label="Subdominio"
          onChange={(value) =>
            setDraft({
              ...draft,
              identity: { ...draft.identity, publicSlug: value },
            })
          }
          suffix=".lojaveiculos.com.br"
          value={draft.identity.publicSlug}
        />
        <SettingsInput
          label="Dominio proprio"
          onChange={(value) =>
            setDraft({
              ...draft,
              publicSite: { ...draft.publicSite, customDomain: value || null },
            })
          }
          value={draft.publicSite.customDomain ?? ""}
        />
        <SettingsStatus status={draft.publicSite.customDomainStatus} />
        <SettingsInput
          icon={<Image className="size-4" />}
          label="Imagem hero"
          onChange={(value) =>
            setDraft({
              ...draft,
              publicSite: { ...draft.publicSite, heroImageUrl: value || null },
            })
          }
          value={draft.publicSite.heroImageUrl ?? ""}
        />
        <div className="settings-builder">
          <span>Layout da vitrine</span>
          <div className="settings-segmented">
            {["classic", "showroom", "compact"].map((layout) => (
              <button
                className={
                  draft.publicSite.layoutKey === layout ? "is-active" : ""
                }
                key={layout}
                onClick={() =>
                  setDraft({
                    ...draft,
                    publicSite: { ...draft.publicSite, layoutKey: layout },
                  })
                }
                type="button"
              >
                {layout}
              </button>
            ))}
          </div>
        </div>
        <SettingsThemeBuilder draft={draft} onChange={setDraft} />
        <SettingsInput
          label="SEO title"
          onChange={(value) =>
            setDraft({
              ...draft,
              publicSite: { ...draft.publicSite, seoTitle: value },
            })
          }
          value={draft.publicSite.seoTitle ?? ""}
        />
        <SettingsTextarea
          label="SEO description"
          onChange={(value) =>
            setDraft({
              ...draft,
              publicSite: { ...draft.publicSite, seoDescription: value },
            })
          }
          value={draft.publicSite.seoDescription ?? ""}
        />
        <label className="settings-toggle">
          <input
            checked={draft.publicSite.isPublished}
            onChange={(event) =>
              setDraft({
                ...draft,
                publicSite: {
                  ...draft.publicSite,
                  isPublished: event.target.checked,
                },
              })
            }
            type="checkbox"
          />
          <span>Publicar vitrine no subdominio</span>
        </label>
        <button
          className="settings-save"
          disabled={isSaving}
          onClick={() => void onSave(draft)}
          type="button"
        >
          <Save aria-hidden="true" className="size-4" />
          {isSaving ? "Salvando" : "Salvar configuracoes"}
        </button>
      </SettingsSection>
    </section>
  );
}
