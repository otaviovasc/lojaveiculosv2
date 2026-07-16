import {
  Building2,
  Clock3,
  Globe2,
  LoaderCircle,
  MapPin,
  Phone,
  Save,
  ScrollText,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  FeatureInput,
  FeatureTextarea,
} from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFormSection,
} from "../../components/ui/FeatureForms";
import {
  FeatureActionButton,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import {
  applyInputMask,
  formatBrazilianDocument,
  formatBrazilianPhone,
  formatBrazilianWhatsappPhone,
  formatBrazilianZipCode,
} from "../../lib/masks";
import {
  businessHoursToText,
  textToBusinessHours,
} from "./settingsBusinessHours";
import { fetchBrazilianZipCodeAddress } from "./settingsCep";
import { SettingsStateCityFields } from "./SettingsStateCityFields";
import { createStoreSettingsDraft } from "./settingsPatch";
import type { StoreSettingsSnapshot } from "./types";

export function SettingsStoreProfilePanel({
  isSaving,
  onSave,
  settings,
}: {
  isSaving: boolean;
  onSave: (settings: StoreSettingsSnapshot) => Promise<void>;
  settings: StoreSettingsSnapshot;
}) {
  const [draft, setDraft] = useState(() => createStoreSettingsDraft(settings));
  const [zipLookup, setZipLookup] = useState<ZipLookupState>({
    kind: "idle",
  });

  useEffect(() => setDraft(createStoreSettingsDraft(settings)), [settings]);

  const lookupZipCode = async () => {
    const zipCode = draft.profile.addressZipCode ?? "";
    const digits = zipCode.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setZipLookup({ kind: "loading" });
    try {
      const address = await fetchBrazilianZipCodeAddress(zipCode);
      if (!address) {
        setZipLookup({ kind: "idle" });
        return;
      }
      setDraft((current) => ({
        ...current,
        profile: {
          ...current.profile,
          addressCity: address.city,
          addressState: address.state,
        },
      }));
      setZipLookup({ kind: "success" });
    } catch (error) {
      setZipLookup({
        kind: "error",
        message: formatApiErrorDisplay(
          error,
          "Não foi possível consultar o CEP.",
        ),
      });
    }
  };

  const storeName = draft.identity.tradingName.trim() || "Perfil da loja";
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
            {draft.profile.logoImageUrl ? (
              <img
                alt={`Logo de ${storeName}`}
                className="settings-profile-logo"
                src={draft.profile.logoImageUrl}
              />
            ) : (
              <Building2 aria-hidden="true" className="size-8" />
            )}
          </div>

          <div className="settings-profile-summary-copy">
            <p className="settings-profile-eyebrow">Identidade da loja</p>
            <h3 className="settings-profile-name">{storeName}</h3>
            <div className="settings-profile-meta">
              <span>
                <Globe2 aria-hidden="true" className="size-3.5" />
                {publicAddress}
              </span>
              {draft.profile.documentNumber ? (
                <span>
                  <ScrollText aria-hidden="true" className="size-3.5" />
                  {draft.profile.documentNumber}
                </span>
              ) : null}
            </div>
          </div>

          <p className="settings-profile-summary-note">
            Estes dados alimentam documentos, atendimento e a vitrine pública.
          </p>
        </header>

        <div className="settings-profile-sections">
          <FeatureFormSection
            className="settings-profile-section settings-profile-section--identity"
            description="Nome e documento usados nos registros oficiais da loja."
            title={
              <span className="settings-profile-section-title">
                <Building2 aria-hidden="true" className="size-4" />
                Identificação da empresa
              </span>
            }
          >
            <div className="grid gap-4 md:grid-cols-3">
              <FeatureField
                className="settings-profile-field md:col-span-2"
                label="Nome fantasia"
              >
                <FeatureInput
                  className="settings-profile-input"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      identity: {
                        ...draft.identity,
                        tradingName: event.target.value,
                      },
                    })
                  }
                  required
                  value={draft.identity.tradingName}
                />
              </FeatureField>
              <FeatureField
                className="settings-profile-field"
                label="Razão social"
              >
                <FeatureInput
                  className="settings-profile-input"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      identity: {
                        ...draft.identity,
                        legalName: event.target.value,
                      },
                    })
                  }
                  value={draft.identity.legalName ?? ""}
                />
              </FeatureField>
              <FeatureField
                className="settings-profile-field md:col-span-3"
                hint="CPF ou CNPJ usado em documentos comerciais."
                label="Documento fiscal (CNPJ/CPF)"
              >
                <FeatureInput
                  className="settings-profile-input"
                  inputMode="numeric"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      profile: {
                        ...draft.profile,
                        documentNumber: formatBrazilianDocument(
                          event.target.value,
                        ),
                      },
                    })
                  }
                  value={draft.profile.documentNumber ?? ""}
                />
              </FeatureField>
            </div>
          </FeatureFormSection>

          <FeatureFormSection
            className="settings-profile-section settings-profile-section--contact"
            description="Canais oficiais para clientes e notificações."
            title={
              <span className="settings-profile-section-title">
                <Phone aria-hidden="true" className="size-4" />
                Informações de contato
              </span>
            }
          >
            <div className="grid gap-4 md:grid-cols-3">
              <FeatureField
                className="settings-profile-field md:col-span-3"
                label="E-mail de contato"
              >
                <FeatureInput
                  className="settings-profile-input"
                  inputMode="email"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      profile: {
                        ...draft.profile,
                        contactEmail: event.target.value,
                      },
                    })
                  }
                  type="email"
                  value={draft.profile.contactEmail ?? ""}
                />
              </FeatureField>
              <FeatureField
                className="settings-profile-field md:col-span-3 xl:col-span-2"
                label="Telefone comercial"
              >
                <FeatureInput
                  className="settings-profile-input"
                  inputMode="tel"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      profile: {
                        ...draft.profile,
                        contactPhone: applyInputMask(
                          event.currentTarget,
                          formatBrazilianPhone,
                        ),
                      },
                    })
                  }
                  type="tel"
                  value={draft.profile.contactPhone ?? ""}
                />
              </FeatureField>
              <FeatureField
                className="settings-profile-field md:col-span-3 xl:col-span-1"
                label="WhatsApp da loja"
              >
                <FeatureInput
                  className="settings-profile-input"
                  inputMode="tel"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      profile: {
                        ...draft.profile,
                        whatsappPhone: applyInputMask(
                          event.currentTarget,
                          formatBrazilianWhatsappPhone,
                        ),
                      },
                    })
                  }
                  type="tel"
                  value={draft.profile.whatsappPhone ?? ""}
                />
              </FeatureField>
            </div>
          </FeatureFormSection>

          <FeatureFormSection
            className="settings-profile-section settings-profile-section--location"
            description="Endereço físico exibido nos canais da loja."
            title={
              <span className="settings-profile-section-title">
                <MapPin aria-hidden="true" className="size-4" />
                Localização e endereço
              </span>
            }
          >
            <div className="grid gap-4 md:grid-cols-4">
              <FeatureField
                className="settings-profile-field"
                error={zipLookup.kind === "error" ? zipLookup.message : null}
                hint={
                  zipLookup.kind === "error" ? null : zipLookupHelp(zipLookup)
                }
                label="CEP"
              >
                <FeatureInput
                  aria-busy={zipLookup.kind === "loading" || undefined}
                  className="settings-profile-input"
                  inputMode="numeric"
                  onBlur={() => void lookupZipCode()}
                  onChange={(event) => {
                    setZipLookup({ kind: "idle" });
                    setDraft({
                      ...draft,
                      profile: {
                        ...draft.profile,
                        addressZipCode: formatBrazilianZipCode(
                          event.target.value,
                        ),
                      },
                    });
                  }}
                  value={draft.profile.addressZipCode ?? ""}
                />
              </FeatureField>
              <SettingsStateCityFields
                city={draft.profile.addressCity ?? ""}
                onCityChange={(addressCity) =>
                  setDraft((current) => ({
                    ...current,
                    profile: { ...current.profile, addressCity },
                  }))
                }
                onStateChange={(addressState) =>
                  setDraft((current) => ({
                    ...current,
                    profile: { ...current.profile, addressState },
                  }))
                }
                state={draft.profile.addressState ?? ""}
              />
              <FeatureField
                className="settings-profile-field md:col-span-4"
                label="Logradouro / endereço"
              >
                <FeatureInput
                  className="settings-profile-input"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      profile: {
                        ...draft.profile,
                        addressLine1: event.target.value || null,
                      },
                    })
                  }
                  value={draft.profile.addressLine1 ?? ""}
                />
              </FeatureField>
            </div>
          </FeatureFormSection>

          <FeatureFormSection
            className="settings-profile-section settings-profile-section--hours"
            description="Dias e horários apresentados aos clientes."
            title={
              <span className="settings-profile-section-title">
                <Clock3 aria-hidden="true" className="size-4" />
                Atendimento
              </span>
            }
          >
            <FeatureField
              className="settings-profile-field"
              label="Horário de funcionamento"
            >
              <FeatureTextarea
                className="settings-profile-textarea"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    profile: {
                      ...draft.profile,
                      businessHours: textToBusinessHours(event.target.value),
                    },
                  })
                }
                placeholder={
                  "Segunda a sexta, 9h às 18h\nSábado, 9h às 14h\nDomingo, fechado"
                }
                value={businessHoursToText(draft.profile.businessHours)}
              />
            </FeatureField>
          </FeatureFormSection>
        </div>

        <footer className="settings-profile-save-bar">
          <p>Revise os dados antes de atualizar o perfil da loja.</p>
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

type ZipLookupState =
  | { kind: "error"; message: string }
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success" };

function zipLookupHelp(state: ZipLookupState) {
  if (state.kind === "loading") return "Buscando cidade e UF pelo CEP...";
  if (state.kind === "success") return "Cidade e UF preenchidas pelo CEP.";
  return "Ao sair do campo, cidade e UF serão preenchidas automaticamente.";
}
