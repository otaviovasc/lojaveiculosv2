import { Building2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import {
  FeatureField,
  FeatureFormSection,
} from "../../components/ui/FeatureForms";
import {
  FeatureInput,
  FeatureTextarea,
} from "../../components/ui/FeatureControls";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import {
  businessHoursToText,
  textToBusinessHours,
} from "./settingsBusinessHours";
import { fetchBrazilianZipCodeAddress } from "./settingsCep";
import {
  formatBrazilianDocument,
  formatBrazilianPhone,
  formatBrazilianZipCode,
} from "./settingsMasks";
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
  const [draft, setDraft] = useState(settings);
  const [zipLookup, setZipLookup] = useState<ZipLookupState>({
    kind: "idle",
  });

  useEffect(() => setDraft(settings), [settings]);

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

  return (
    <FeatureSection
      className="settings-profile-panel glass-panel-branded border border-line/45 shadow-[var(--shadow-panel)] hover:translate-y-0 hover:border-line/45 transition-none"
      icon={<Building2 className="size-5 text-accent-strong" />}
      padding="comfortable"
      title="Perfil da Loja"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSave(draft);
        }}
        className="settings-profile-form grid gap-6 mt-4"
      >
        <FeatureFormSection
          title="Identificação da Empresa"
          description="Nome e documentos fiscais oficiais da loja."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <FeatureField label="Nome fantasia">
                <FeatureInput
                  required
                  value={draft.identity.tradingName}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      identity: {
                        ...draft.identity,
                        tradingName: e.target.value,
                      },
                    })
                  }
                  className="bg-app/40 border-line/60 focus:border-accent/40 hover:border-line-strong transition-all duration-300"
                />
              </FeatureField>
            </div>
            <div className="md:col-span-1">
              <FeatureField label="Razão social">
                <FeatureInput
                  value={draft.identity.legalName ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      identity: {
                        ...draft.identity,
                        legalName: e.target.value,
                      },
                    })
                  }
                  className="bg-app/40 border-line/60 focus:border-accent/40 hover:border-line-strong transition-all duration-300"
                />
              </FeatureField>
            </div>
          </div>
          <FeatureField
            label="Documento fiscal (CNPJ/CPF)"
            hint="CPF ou CNPJ usado em documentos comerciais."
          >
            <FeatureInput
              inputMode="numeric"
              value={draft.profile.documentNumber ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  profile: {
                    ...draft.profile,
                    documentNumber: formatBrazilianDocument(e.target.value),
                  },
                })
              }
              className="bg-app/40 border-line/60 focus:border-accent/40 hover:border-line-strong transition-all duration-300"
            />
          </FeatureField>
        </FeatureFormSection>

        <FeatureFormSection
          title="Informações de Contato"
          description="Canais oficiais para atendimento ao cliente e notificações."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <FeatureField label="E-mail de Contato">
              <FeatureInput
                type="email"
                inputMode="email"
                value={draft.profile.contactEmail ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    profile: { ...draft.profile, contactEmail: e.target.value },
                  })
                }
                className="bg-app/40 border-line/60 focus:border-accent/40 hover:border-line-strong transition-all duration-300"
              />
            </FeatureField>
            <FeatureField label="Telefone Comercial">
              <FeatureInput
                type="tel"
                inputMode="tel"
                value={draft.profile.contactPhone ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    profile: {
                      ...draft.profile,
                      contactPhone: formatBrazilianPhone(e.target.value),
                    },
                  })
                }
                className="bg-app/40 border-line/60 focus:border-accent/40 hover:border-line-strong transition-all duration-300"
              />
            </FeatureField>
            <FeatureField label="WhatsApp da Loja">
              <FeatureInput
                type="tel"
                inputMode="tel"
                value={draft.profile.whatsappPhone ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    profile: {
                      ...draft.profile,
                      whatsappPhone: formatBrazilianPhone(e.target.value),
                    },
                  })
                }
                className="bg-app/40 border-line/60 focus:border-accent/40 hover:border-line-strong transition-all duration-300"
              />
            </FeatureField>
          </div>
        </FeatureFormSection>

        <FeatureFormSection
          title="Localização e Endereço"
          description="Endereço da loja física para exibição na vitrine."
        >
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-1">
              <FeatureField label="CEP" hint={zipLookupHelp(zipLookup)}>
                <FeatureInput
                  inputMode="numeric"
                  onBlur={() => void lookupZipCode()}
                  value={draft.profile.addressZipCode ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      profile: {
                        ...draft.profile,
                        addressZipCode: formatBrazilianZipCode(e.target.value),
                      },
                    })
                  }
                  className="bg-app/40 border-line/60 focus:border-accent/40 hover:border-line-strong transition-all duration-300"
                />
              </FeatureField>
            </div>
            <div className="md:col-span-1">
              <FeatureField label="UF">
                <FeatureInput
                  maxLength={2}
                  value={draft.profile.addressState ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      profile: {
                        ...draft.profile,
                        addressState: e.target.value.toUpperCase().slice(0, 2),
                      },
                    })
                  }
                  className="bg-app/40 border-line/60 focus:border-accent/40 hover:border-line-strong transition-all duration-300"
                />
              </FeatureField>
            </div>
            <div className="md:col-span-2">
              <FeatureField label="Cidade">
                <FeatureInput
                  value={draft.profile.addressCity ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      profile: {
                        ...draft.profile,
                        addressCity: e.target.value,
                      },
                    })
                  }
                  className="bg-app/40 border-line/60 focus:border-accent/40 hover:border-line-strong transition-all duration-300"
                />
              </FeatureField>
            </div>
          </div>
          <FeatureField label="Logradouro / Endereço">
            <FeatureInput
              value={draft.profile.addressLine1 ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  profile: {
                    ...draft.profile,
                    addressLine1: e.target.value || null,
                  },
                })
              }
              className="bg-app/40 border-line/60 focus:border-accent/40 hover:border-line-strong transition-all duration-300"
            />
          </FeatureField>
        </FeatureFormSection>

        <FeatureFormSection
          title="Atendimento"
          description="Dias e horários de funcionamento exibidos aos clientes."
        >
          <FeatureField label="Horário de funcionamento">
            <FeatureTextarea
              placeholder="Segunda a Sexta, 9h as 18h&#10;Sabado, 9h as 14h&#10;Domingo, Fechado"
              value={businessHoursToText(draft.profile.businessHours)}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  profile: {
                    ...draft.profile,
                    businessHours: textToBusinessHours(e.target.value),
                  },
                })
              }
              className="bg-app/40 border-line/60 focus:border-accent/40 hover:border-line-strong transition-all duration-300 min-h-24"
            />
          </FeatureField>
        </FeatureFormSection>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-line/45">
          <button
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-6 text-sm font-black text-accent-foreground disabled:opacity-70 transition-all hover:bg-accent-strong hover:text-accent-strong-foreground active:scale-98 shadow-md cursor-pointer"
            disabled={isSaving}
            type="submit"
          >
            <Save aria-hidden="true" className="size-4" />
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
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
  if (state.kind === "error") return state.message;
  if (state.kind === "success") return "Cidade e UF preenchidas pelo CEP.";
  return "Ao sair do campo, cidade e UF serão preenchidas automaticamente.";
}
