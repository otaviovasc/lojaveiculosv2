import { Building2, Loader2, RefreshCcw, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
} from "../../components/ui/FeatureForms";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { normalizePublicSlug } from "../../lib/utils";
import { createRuntimeAccountApi } from "./runtimeApi";

export function PlatformAdminPage() {
  const [tenantTradingName, setTenantTradingName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [firstUserEmail, setFirstUserEmail] = useState("");
  const [firstUserName, setFirstUserName] = useState("");
  const [status, setStatus] = useState<
    "idle" | "resending" | "saving" | "saved"
  >("idle");
  const [failedInvitation, setFailedInvitation] = useState<{
    id: string;
    tenantName: string;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isSaving = status === "saving";
  const isResending = status === "resending";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (firstUserName.trim() && !firstUserEmail.trim()) {
      setMessage("Informe o e-mail para identificar o primeiro operador.");
      return;
    }
    setStatus("saving");
    setFailedInvitation(null);
    setMessage(null);
    try {
      const api = await createRuntimeAccountApi();
      const agency = await api.createAgency({
        ...(firstUserEmail.trim()
          ? {
              firstUser: {
                email: firstUserEmail.trim(),
                ...(firstUserName.trim() ? { name: firstUserName.trim() } : {}),
              },
            }
          : {}),
        tenantSlug,
        tenantTradingName,
      });
      setStatus("saved");
      if (agency.invitationStatus === "send_failed" && agency.invitationId) {
        setFailedInvitation({
          id: agency.invitationId,
          tenantName: agency.tenantName,
        });
        setMessage(
          `Agência criada: ${agency.tenantName}. O convite inicial não foi enviado.`,
        );
      } else {
        setMessage(`Agência criada: ${agency.tenantName}`);
      }
      setTenantTradingName("");
      setTenantSlug("");
      setFirstUserEmail("");
      setFirstUserName("");
    } catch (err) {
      setStatus("idle");
      setMessage(
        formatApiErrorDisplay(err, "Não foi possível criar a agência."),
      );
    }
  };

  const resendFailedInvitation = async () => {
    if (!failedInvitation) return;
    setStatus("resending");
    try {
      const api = await createRuntimeAccountApi();
      await api.resendInvitation(failedInvitation.id);
      setStatus("saved");
      setMessage(`Convite reenviado para ${failedInvitation.tenantName}.`);
      setFailedInvitation(null);
    } catch (err) {
      setStatus("idle");
      setMessage(
        formatApiErrorDisplay(err, "Não foi possível reenviar o convite."),
      );
    }
  };

  return (
    <FeaturePageShell className="max-w-4xl" variant="plain">
      <FeaturePageHeader
        chip="Platform admin"
        description="Crie contas de agência e envie o primeiro convite pelo provedor de identidade."
        eyebrow="Operações internas"
        title="Admin de contas"
      />

      {message ? (
        <FeatureAlert
          action={
            failedInvitation ? (
              <FeatureActionButton
                disabled={isResending}
                icon={isResending ? Loader2 : RefreshCcw}
                isBusy={isResending}
                label={isResending ? "Reenviando" : "Reenviar convite"}
                onClick={() => void resendFailedInvitation()}
                variant="primary"
              />
            ) : null
          }
          className="feature-alert"
          tone={
            failedInvitation
              ? "warning"
              : status === "saved"
                ? "success"
                : "danger"
          }
        >
          {message}
        </FeatureAlert>
      ) : null}

      <FeatureSection
        className="grid gap-4"
        icon={<Building2 className="size-5 text-accent-strong" />}
        padding="compact"
        title="Criar agência"
      >
        <form onSubmit={(event) => void submit(event)} className="grid gap-4">
          <div className="flex items-center gap-2 text-sm font-black text-primary">
            <UserPlus className="size-4 text-accent" />
            Convite opcional para o primeiro operador
          </div>
          <FeatureField label="Nome da agência">
            <FeatureInput
              required
              value={tenantTradingName}
              onChange={(event) => {
                setTenantTradingName(event.target.value);
                if (!tenantSlug)
                  setTenantSlug(normalizePublicSlug(event.target.value));
              }}
            />
          </FeatureField>
          <FeatureField label="Slug da agência">
            <FeatureInput
              required
              value={tenantSlug}
              onChange={(event) =>
                setTenantSlug(normalizePublicSlug(event.target.value))
              }
            />
          </FeatureField>
          <FeatureFieldGroup>
            <FeatureField label="E-mail do primeiro operador">
              <FeatureInput
                type="email"
                value={firstUserEmail}
                onChange={(event) => setFirstUserEmail(event.target.value)}
              />
            </FeatureField>
            <FeatureField label="Nome do operador">
              <FeatureInput
                value={firstUserName}
                onChange={(event) => setFirstUserName(event.target.value)}
              />
            </FeatureField>
          </FeatureFieldGroup>
          <FeatureActionButton
            className="w-full justify-center"
            disabled={isSaving}
            icon={isSaving ? Loader2 : UserPlus}
            isBusy={isSaving}
            label={isSaving ? "Criando" : "Criar agência"}
            type="submit"
            variant="primary"
          />
        </form>
      </FeatureSection>
    </FeaturePageShell>
  );
}
