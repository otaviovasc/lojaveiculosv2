import { Globe2, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFormSection,
} from "../../components/ui/FeatureForms";
import {
  FeatureActionButton,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { getDomainStatusLabel } from "./settingsLabels";
import { createStoreSettingsDraft } from "./settingsPatch";
import type { StoreSettingsSnapshot } from "./types";

export function SettingsDomainPanel({
  isSaving,
  onSave,
  settings,
}: {
  isSaving: boolean;
  onSave: (settings: StoreSettingsSnapshot) => Promise<void>;
  settings: StoreSettingsSnapshot;
}) {
  const [draft, setDraft] = useState(() => createStoreSettingsDraft(settings));

  useEffect(() => setDraft(createStoreSettingsDraft(settings)), [settings]);

  const publicAddress =
    draft.identity.primaryDomain ??
    draft.publicSite.customDomain ??
    (draft.identity.publicSlug
      ? `/${draft.identity.publicSlug}`
      : "Endereço público não definido");

  return (
    <FeatureSection
      className="settings-profile-panel"
      padding="none"
      radius="xl"
    >
      <form
        className="settings-profile-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave(draft);
        }}
      >
        <header className="settings-profile-summary">
          <div className="settings-profile-logo-frame">
            <Globe2 aria-hidden="true" className="size-8" />
          </div>

          <div className="settings-profile-summary-copy">
            <p className="settings-profile-eyebrow">Canais</p>
            <h3 className="settings-profile-name">Domínio da loja</h3>
            <div className="settings-profile-meta">
              <span>
                <Globe2 aria-hidden="true" className="size-3.5" />
                {publicAddress}
              </span>
              <FeatureStatusBadge
                size="dense"
                tone={domainStatusTone(draft.publicSite.customDomainStatus)}
              >
                {getDomainStatusLabel(draft.publicSite.customDomainStatus)}
              </FeatureStatusBadge>
            </div>
          </div>

          <p className="settings-profile-summary-note">
            O domínio próprio aponta a vitrine pública da loja para o endereço
            da sua marca.
          </p>
        </header>

        <div className="settings-profile-sections">
          <FeatureFormSection
            className="settings-profile-section"
            description="Endereço atual da vitrine pública da loja."
            title={
              <span className="settings-profile-section-title">
                <Globe2 aria-hidden="true" className="size-4" />
                Endereço público
              </span>
            }
          >
            <FeatureField
              className="settings-profile-field"
              hint="Este é o endereço que os clientes usam hoje para acessar a vitrine."
              label="Endereço ativo"
            >
              <FeatureInput
                className="settings-profile-input"
                readOnly
                value={publicAddress}
              />
            </FeatureField>
          </FeatureFormSection>

          <FeatureFormSection
            className="settings-profile-section"
            description="Configure um domínio próprio e aponte o DNS para a plataforma."
            title={
              <span className="settings-profile-section-title">
                <ShieldCheck aria-hidden="true" className="size-4" />
                Domínio personalizado
              </span>
            }
          >
            <div className="grid gap-4">
              <FeatureField
                className="settings-profile-field"
                hint="Informe apenas o domínio, sem https://. Depois de salvar, aponte o DNS (CNAME) para a plataforma e aguarde a verificação."
                label="Domínio personalizado"
              >
                <FeatureInput
                  className="settings-profile-input"
                  inputMode="url"
                  maxLength={191}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      publicSite: {
                        ...draft.publicSite,
                        customDomain: event.target.value.trim() || null,
                      },
                    })
                  }
                  placeholder="www.sualoja.com.br"
                  value={draft.publicSite.customDomain ?? ""}
                />
              </FeatureField>
              {draft.publicSite.customDomainStatus === "pending" &&
              draft.publicSite.verificationToken ? (
                <FeatureField
                  className="settings-profile-field"
                  hint="Crie um registro TXT com este token no provedor de DNS para concluir a verificação."
                  label="Token de verificação"
                >
                  <FeatureInput
                    className="settings-profile-input"
                    readOnly
                    value={draft.publicSite.verificationToken}
                  />
                </FeatureField>
              ) : null}
            </div>
          </FeatureFormSection>
        </div>

        <footer className="settings-profile-save-bar">
          <p>Alterações no domínio podem levar alguns minutos para propagar.</p>
          <FeatureActionButton
            icon={isSaving ? LoaderCircle : Save}
            isBusy={isSaving}
            label={isSaving ? "Salvando alterações" : "Salvar alterações"}
            type="submit"
            variant="primary"
          />
        </footer>
      </form>
    </FeatureSection>
  );
}

function domainStatusTone(
  status: StoreSettingsSnapshot["publicSite"]["customDomainStatus"],
) {
  switch (status) {
    case "verified":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "failed":
      return "danger" as const;
    case "not_configured":
      return "neutral" as const;
  }
}
