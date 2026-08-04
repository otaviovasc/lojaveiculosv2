import { useState, useEffect, useRef, type FormEvent } from "react";
import { CheckCircle2, Copy } from "lucide-react";
import {
  FeatureInput,
  FeatureSelect,
} from "../../../components/ui/FeatureControls";
import { FeatureField } from "../../../components/ui/FeatureForms";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../../components/ui/FeatureOverlay";
import { FeatureAlert } from "../../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type { IdentityInvitationView, InviteStoreMemberInput } from "../types";
import { copyInvitationAcceptUrl } from "./invitationClipboard";

export function InviteMemberModal({
  isOpen,
  onClose,
  onInvite,
  onResendInvitation,
  availableRoles,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (input: InviteStoreMemberInput) => Promise<IdentityInvitationView>;
  onResendInvitation: (invitationId: string) => Promise<IdentityInvitationView>;
  availableRoles: { label: string; role: InviteStoreMemberInput["role"] }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<InviteStoreMemberInput["role"]>("salesman");
  const [status, setStatus] = useState<"idle" | "saving" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [failedInvitationId, setFailedInvitationId] = useState<string | null>(
    null,
  );
  const [successInvitation, setSuccessInvitation] =
    useState<IdentityInvitationView | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setName("");
      setRole("salesman");
      setStatus("idle");
      setError(null);
      setFailedInvitationId(null);
      setSuccessInvitation(null);
      setLinkCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (status !== "success" || successInvitation?.acceptUrl) return;
    const timeout = window.setTimeout(onClose, 2500);
    return () => window.clearTimeout(timeout);
  }, [onClose, status, successInvitation?.acceptUrl]);

  if (!isOpen) return null;

  const isSaving = status === "saving";
  const handleClose = () => {
    if (!isSaving) onClose();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;
    setStatus("saving");
    setError(null);
    setFailedInvitationId(null);
    setSuccessInvitation(null);
    setLinkCopied(false);
    try {
      const invitation = await onInvite({
        email,
        ...(name.trim() ? { name: name.trim() } : {}),
        role,
      });
      if (invitation.status === "send_failed") {
        setFailedInvitationId(invitation.id);
        setError("Convite criado, mas o envio pelo Clerk falhou.");
        setStatus("idle");
        return;
      }
      setSuccessInvitation(invitation);
      setStatus("success");
    } catch (err) {
      setError(formatApiErrorDisplay(err, "Não foi possível criar o convite."));
      setStatus("idle");
    }
  };

  const handleResend = async () => {
    if (!failedInvitationId) return;
    setStatus("saving");
    setError(null);
    try {
      const invitation = await onResendInvitation(failedInvitationId);
      if (invitation.status !== "sent") {
        setFailedInvitationId(invitation.id);
        setError("Convite reenviado, mas ainda não foi marcado como enviado.");
        setStatus("idle");
        return;
      }
      setSuccessInvitation(invitation);
      setStatus("success");
    } catch (err) {
      setError(
        formatApiErrorDisplay(err, "Não foi possível reenviar o convite."),
      );
      setStatus("idle");
    }
  };

  const handleCopyAcceptUrl = async () => {
    const acceptUrl = successInvitation?.acceptUrl;
    if (!acceptUrl) return;
    setError(null);
    try {
      await copyInvitationAcceptUrl(acceptUrl);
      setLinkCopied(true);
    } catch {
      setError(
        "Não foi possível copiar o link. Tente novamente em um navegador com acesso à área de transferência.",
      );
    }
  };

  return (
    <FeatureDialog
      footer={
        status === "success" && successInvitation?.acceptUrl ? (
          <FeatureDialogActions
            cancelLabel="Fechar"
            confirmIcon={<Copy className="size-4" />}
            confirmLabel={linkCopied ? "Link copiado" : "Copiar link de acesso"}
            onCancel={handleClose}
            onConfirm={() => void handleCopyAcceptUrl()}
          />
        ) : status === "success" ? null : (
          <FeatureDialogActions
            cancelDisabled={isSaving}
            confirmDisabled={!failedInvitationId && availableRoles.length === 0}
            confirmLabel={
              failedInvitationId ? "Reenviar convite" : "Enviar convite"
            }
            isLoading={isSaving}
            loadingLabel={failedInvitationId ? "Reenviando" : "Enviando"}
            onCancel={handleClose}
            onConfirm={() =>
              failedInvitationId
                ? void handleResend()
                : formRef.current?.requestSubmit()
            }
          />
        )
      }
      isOpen={isOpen}
      onClose={handleClose}
      title={status === "success" ? "Convite criado" : "Convidar novo membro"}
    >
      {status === "success" ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle2 className="size-12 text-emerald-500" />
          <p className="mt-3 max-w-xs text-sm font-bold text-muted">
            O Clerk aceitou a solicitação de envio para{" "}
            <strong className="text-app-text">{email}</strong>.
          </p>
          <p className="mt-2 max-w-sm text-xs font-semibold text-muted">
            Isso não confirma a entrega na caixa de entrada. Se o e-mail não
            chegar, copie o link de acesso e envie somente ao destinatário; ele
            concede acesso ao cadastro convidado.
          </p>
          {error ? <FeatureAlert className="mt-3">{error}</FeatureAlert> : null}
        </div>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(event) => void handleSubmit(event)}
          ref={formRef}
        >
          <p className="text-sm font-bold text-muted">
            Envie um convite por e-mail para cadastrar um integrante na equipe
            da loja. A permissão só é concedida depois do aceite pelo Clerk.
          </p>
          <FeatureField label="E-mail do membro">
            <FeatureInput
              disabled={isSaving}
              onChange={(event) => {
                setFailedInvitationId(null);
                setEmail(event.target.value);
              }}
              placeholder="exemplo@email.com"
              required
              type="email"
              value={email}
            />
          </FeatureField>
          <FeatureField label="Nome completo">
            <FeatureInput
              disabled={isSaving}
              onChange={(event) => {
                setFailedInvitationId(null);
                setName(event.target.value);
              }}
              placeholder="Ex: João da Silva"
              type="text"
              value={name}
            />
          </FeatureField>
          <FeatureField label="Cargo padrão">
            <FeatureSelect<InviteStoreMemberInput["role"]>
              disabled={isSaving || availableRoles.length === 0}
              onChange={(value) => {
                setFailedInvitationId(null);
                setRole(value);
              }}
              options={availableRoles.map((item) => ({
                label: item.label,
                value: item.role,
              }))}
              value={role}
            />
          </FeatureField>
          {error ? <FeatureAlert>{error}</FeatureAlert> : null}
        </form>
      )}
    </FeatureDialog>
  );
}
