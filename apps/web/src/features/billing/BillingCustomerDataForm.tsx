import { LoaderCircle, MapPin, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFormSection,
} from "../../components/ui/FeatureForms";
import {
  FeatureActionButton,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import {
  formatBrazilianDocument,
  formatBrazilianZipCode,
} from "../../lib/masks";
import { createSettingsApi, type SettingsApi } from "../settings/apiClient";
import { createSettingsApiOptions } from "../settings/runtimeApi";
import type { UpdateStoreSettingsInput } from "../settings/types";

export type BillingCustomerMissingField =
  "email" | "cpfCnpj" | "address" | "addressNumber" | "province" | "postalCode";

type BillingCustomerDraft = Record<BillingCustomerMissingField, string>;

const EMPTY_DRAFT: BillingCustomerDraft = {
  address: "",
  addressNumber: "",
  cpfCnpj: "",
  email: "",
  postalCode: "",
  province: "",
};

export function readBillingCustomerMissingFields(
  details: unknown,
): BillingCustomerMissingField[] {
  if (!details || typeof details !== "object" || Array.isArray(details))
    return [];
  const { missingFields } = details as { missingFields?: unknown };
  if (!Array.isArray(missingFields)) return [];
  return missingFields.filter(
    (field): field is BillingCustomerMissingField => field in EMPTY_DRAFT,
  );
}

export function BillingCustomerDataForm({
  api,
  missingFields,
  onSaved,
}: {
  api?: SettingsApi;
  missingFields: readonly BillingCustomerMissingField[];
  onSaved: () => void;
}) {
  const settingsApi = useMemo(() => api ?? createRuntimeSettingsApi(), [api]);
  const [draft, setDraft] = useState<BillingCustomerDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setError(null);
    settingsApi
      .getStoreSettings()
      .then((settings) => {
        if (!active) return;
        setDraft({
          address: settings.profile.addressLine1 ?? "",
          addressNumber: settings.profile.addressNumber ?? "",
          cpfCnpj: settings.profile.documentNumber ?? "",
          email: settings.profile.contactEmail ?? "",
          postalCode: settings.profile.addressZipCode ?? "",
          province: settings.profile.addressDistrict ?? "",
        });
      })
      .catch((cause) => {
        if (active)
          setError(
            formatApiErrorDisplay(
              cause,
              "Não foi possível carregar os dados da loja.",
            ),
          );
      });
    return () => {
      active = false;
    };
  }, [settingsApi]);

  const update =
    (field: BillingCustomerMissingField) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setDraft((current) =>
        current ? { ...current, [field]: event.target.value } : current,
      );
    };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || saving) return;
    setSaving(true);
    setError(null);
    try {
      await settingsApi.updateStoreSettings({
        profile: buildProfilePatch(missingFields, draft),
      });
      onSaved();
    } catch (cause) {
      setError(
        formatApiErrorDisplay(
          cause,
          "Não foi possível salvar os dados de cobrança.",
        ),
      );
      setSaving(false);
    }
  };

  return (
    <FeatureSection
      className="billing-customer-data-form"
      padding="comfortable"
      radius="xl"
    >
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <FeatureFormSection
          description="Estes dados são exigidos pelo provedor de pagamento para criar o checkout da assinatura."
          title={
            <span className="settings-profile-section-title">
              <MapPin aria-hidden="true" className="size-4" />
              Dados de cobrança da loja
            </span>
          }
        >
          {error ? (
            <FeatureAlert className="billing-alert">{error}</FeatureAlert>
          ) : null}
          {!draft && !error ? (
            <FeatureLoadingState title="Carregando dados da loja" />
          ) : null}
          {draft ? (
            <div className="grid items-start gap-4 md:grid-cols-2">
              {missingFields.includes("email") ? (
                <FeatureField label="E-mail de cobrança">
                  <FeatureInput
                    inputMode="email"
                    onChange={update("email")}
                    required
                    type="email"
                    value={draft.email}
                  />
                </FeatureField>
              ) : null}
              {missingFields.includes("cpfCnpj") ? (
                <FeatureField label="Documento fiscal (CNPJ/CPF)">
                  <FeatureInput
                    inputMode="numeric"
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        cpfCnpj: formatBrazilianDocument(event.target.value),
                      })
                    }
                    required
                    value={draft.cpfCnpj}
                  />
                </FeatureField>
              ) : null}
              {missingFields.includes("postalCode") ? (
                <FeatureField label="CEP">
                  <FeatureInput
                    inputMode="numeric"
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        postalCode: formatBrazilianZipCode(event.target.value),
                      })
                    }
                    required
                    value={draft.postalCode}
                  />
                </FeatureField>
              ) : null}
              {missingFields.includes("address") ? (
                <FeatureField label="Logradouro / endereço">
                  <FeatureInput
                    onChange={update("address")}
                    required
                    value={draft.address}
                  />
                </FeatureField>
              ) : null}
              {missingFields.includes("addressNumber") ? (
                <FeatureField label="Número">
                  <FeatureInput
                    onChange={update("addressNumber")}
                    required
                    value={draft.addressNumber}
                  />
                </FeatureField>
              ) : null}
              {missingFields.includes("province") ? (
                <FeatureField label="Bairro">
                  <FeatureInput
                    onChange={update("province")}
                    required
                    value={draft.province}
                  />
                </FeatureField>
              ) : null}
            </div>
          ) : null}
        </FeatureFormSection>
        {draft ? (
          <footer className="settings-profile-save-bar">
            <p>A contratação será retomada automaticamente após salvar.</p>
            <FeatureActionButton
              icon={saving ? LoaderCircle : Save}
              isBusy={saving}
              label={saving ? "Salvando dados" : "Salvar e continuar"}
              type="submit"
              variant="primary"
            />
          </footer>
        ) : null}
      </form>
    </FeatureSection>
  );
}

function buildProfilePatch(
  missingFields: readonly BillingCustomerMissingField[],
  draft: BillingCustomerDraft,
): NonNullable<UpdateStoreSettingsInput["profile"]> {
  const profile: NonNullable<UpdateStoreSettingsInput["profile"]> = {};
  for (const field of missingFields) {
    const value = draft[field].trim() || null;
    if (field === "email") profile.contactEmail = value;
    else if (field === "cpfCnpj") profile.documentNumber = value;
    else if (field === "address") profile.addressLine1 = value;
    else if (field === "addressNumber") profile.addressNumber = value;
    else if (field === "province") profile.addressDistrict = value;
    else if (field === "postalCode") profile.addressZipCode = value;
  }
  return profile;
}

function createRuntimeSettingsApi(): SettingsApi {
  const invoke = async () =>
    createSettingsApi(await createSettingsApiOptions());
  return {
    getStoreMemberOptions: async () => (await invoke()).getStoreMemberOptions(),
    getStoreSettings: async () => (await invoke()).getStoreSettings(),
    updateStoreSettings: async (input) =>
      (await invoke()).updateStoreSettings(input),
    getRoleManagement: async () => (await invoke()).getRoleManagement(),
    updateMembershipAccess: async (membershipId, input) =>
      (await invoke()).updateMembershipAccess(membershipId, input),
    inviteStoreMember: async (input) =>
      (await invoke()).inviteStoreMember(input),
    resendInvitation: async (invitationId) =>
      (await invoke()).resendInvitation(invitationId),
  };
}
