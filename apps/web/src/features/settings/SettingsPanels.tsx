import { Globe2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { SettingsInput, SettingsSection } from "./SettingsPanelParts";
import { normalizePublicSlug } from "./settingsMasks";
import { SettingsStoreProfilePanel } from "./SettingsStoreProfilePanel";
import { SettingsStorefrontDesigner } from "./SettingsStorefrontDesigner";
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
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <SettingsStoreProfilePanel draft={draft} setDraft={setDraft} />

      <SettingsSection
        icon={<Globe2 className="size-5" />}
        title="Site publico e vitrine"
      >
        <SettingsInput
          help="Use apenas letras, numeros e hifens."
          label="Subdominio"
          onChange={(value) =>
            setDraft({
              ...draft,
              identity: {
                ...draft.identity,
                publicSlug: normalizePublicSlug(value),
              },
            })
          }
          suffix=".lojaveiculos.com.br"
          value={draft.identity.publicSlug}
        />
        <SettingsStorefrontDesigner draft={draft} onChange={setDraft} />
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
