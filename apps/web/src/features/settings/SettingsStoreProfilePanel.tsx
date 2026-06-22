import { Building2, Clock3, Mail, MapPin, Phone } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import {
  SettingsInput,
  SettingsSection,
  SettingsTextarea,
} from "./SettingsPanelParts";
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
  draft,
  setDraft,
}: {
  draft: StoreSettingsSnapshot;
  setDraft: Dispatch<SetStateAction<StoreSettingsSnapshot>>;
}) {
  const [zipLookup, setZipLookup] = useState<ZipLookupState>({
    kind: "idle",
  });

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
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
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
          help={zipLookupHelp(zipLookup)}
          inputMode="numeric"
          label="CEP"
          onBlur={() => void lookupZipCode()}
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
  return "Ao sair do campo, cidade e UF serao preenchidas automaticamente.";
}
