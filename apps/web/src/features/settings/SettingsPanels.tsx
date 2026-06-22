import {
  Building2,
  Clock3,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  SettingsInput,
  SettingsSection,
  SettingsTextarea,
} from "./SettingsPanelParts";
import {
  businessHoursToText,
  textToBusinessHours,
} from "./settingsBusinessHours";
import {
  formatBrazilianDocument,
  formatBrazilianPhone,
  formatBrazilianZipCode,
  normalizePublicSlug,
} from "./settingsMasks";
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
          help="CPF ou CNPJ usado em documentos comerciais."
          inputMode="numeric"
          label="Documento fiscal"
          onChange={(value) =>
            setDraft({
              ...draft,
              profile: {
                ...draft.profile,
                documentNumber: formatBrazilianDocument(value),
              },
            })
          }
          value={draft.profile.documentNumber ?? ""}
        />
        <SettingsInput
          icon={<Mail className="size-4" />}
          inputMode="email"
          label="Email"
          onChange={(value) =>
            setDraft({
              ...draft,
              profile: { ...draft.profile, contactEmail: value },
            })
          }
          type="email"
          value={draft.profile.contactEmail ?? ""}
        />
        <SettingsInput
          icon={<Phone className="size-4" />}
          inputMode="tel"
          label="Telefone"
          onChange={(value) =>
            setDraft({
              ...draft,
              profile: {
                ...draft.profile,
                contactPhone: formatBrazilianPhone(value),
              },
            })
          }
          value={draft.profile.contactPhone ?? ""}
        />
        <SettingsInput
          icon={<Phone className="size-4" />}
          inputMode="tel"
          label="WhatsApp"
          onChange={(value) =>
            setDraft({
              ...draft,
              profile: {
                ...draft.profile,
                whatsappPhone: formatBrazilianPhone(value),
              },
            })
          }
          value={draft.profile.whatsappPhone ?? ""}
        />
        <SettingsInput
          icon={<MapPin className="size-4" />}
          label="Endereco"
          onChange={(value) =>
            setDraft({
              ...draft,
              profile: { ...draft.profile, addressLine1: value || null },
            })
          }
          value={draft.profile.addressLine1 ?? ""}
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
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingsInput
            label="UF"
            maxLength={2}
            onChange={(value) =>
              setDraft({
                ...draft,
                profile: {
                  ...draft.profile,
                  addressState: value.toUpperCase().slice(0, 2),
                },
              })
            }
            value={draft.profile.addressState ?? ""}
          />
          <SettingsInput
            inputMode="numeric"
            label="CEP"
            onChange={(value) =>
              setDraft({
                ...draft,
                profile: {
                  ...draft.profile,
                  addressZipCode: formatBrazilianZipCode(value),
                },
              })
            }
            value={draft.profile.addressZipCode ?? ""}
          />
        </div>
        <SettingsTextarea
          icon={<Clock3 className="size-4" />}
          label="Horario de funcionamento"
          onChange={(value) =>
            setDraft({
              ...draft,
              profile: {
                ...draft.profile,
                businessHours: textToBusinessHours(value),
              },
            })
          }
          placeholder={
            "Segunda a Sexta, 9h as 18h\nSabado, 9h as 14h\nDomingo, Fechado"
          }
          value={businessHoursToText(draft.profile.businessHours)}
        />
      </SettingsSection>

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
