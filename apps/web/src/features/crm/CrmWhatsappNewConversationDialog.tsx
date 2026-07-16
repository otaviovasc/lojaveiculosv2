import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { formatBrazilianPhone } from "../../lib/masks";
import { ActionDialog } from "./CrmWhatsappActionDialogFrame";
import {
  CrmFieldError,
  CrmFormError,
  formatCrmSubmitError,
} from "./CrmFormFeedback";
import { isValidCrmPhone } from "./crmFormValidation";

export type StartConversationDraft = {
  buyerName?: string;
  phone: string;
  text: string;
};

export function CrmWhatsappNewConversationDialog({
  disabled,
  onClose,
  onStart,
}: {
  disabled?: boolean;
  onClose: () => void;
  onStart: (input: StartConversationDraft) => Promise<boolean>;
}) {
  const [buyerName, setBuyerName] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [textTouched, setTextTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const phoneIsValid = isValidCrmPhone(phone);
  const messageIsValid = text.trim().length > 0;
  const canSubmit = phoneIsValid && messageIsValid;
  return (
    <ActionDialog
      disabled={disabled || isSaving || !canSubmit}
      icon={<MessageSquarePlus />}
      onClose={onClose}
      onSubmit={async () => {
        if (!canSubmit) return;
        setSubmitError(null);
        setIsSaving(true);
        try {
          const accepted = await onStart({
            ...(buyerName.trim() ? { buyerName: buyerName.trim() } : {}),
            phone: phone.trim(),
            text: text.trim(),
          });
          if (accepted) {
            onClose();
          } else {
            setSubmitError(
              "Não foi possível iniciar a conversa. Tente novamente.",
            );
          }
        } catch (caught) {
          setSubmitError(
            formatCrmSubmitError(
              caught,
              "Não foi possível iniciar a conversa. Tente novamente.",
            ),
          );
        } finally {
          setIsSaving(false);
        }
      }}
      submitLabel={isSaving ? "Iniciando..." : "Iniciar conversa"}
      title="Nova conversa"
    >
      <div className="crm-whatsapp-new-conversation-intro">
        <strong>Inicie o atendimento pelo número do cliente.</strong>
        <p>
          A conversa será criada na conexão ativa e a primeira mensagem será
          enviada pelo WhatsApp da loja.
        </p>
      </div>
      <label>
        Nome
        <input
          disabled={disabled || isSaving}
          onChange={(event) => {
            setBuyerName(event.target.value);
            setSubmitError(null);
          }}
          placeholder="Nome do cliente"
          value={buyerName}
        />
      </label>
      <label>
        WhatsApp
        <input
          aria-describedby={
            !phoneIsValid && phoneTouched
              ? "crm-new-conversation-phone-error"
              : undefined
          }
          aria-invalid={!phoneIsValid && phoneTouched}
          disabled={disabled || isSaving}
          inputMode="tel"
          onBlur={() => setPhoneTouched(true)}
          onChange={(event) => {
            setPhone(formatBrazilianPhone(event.target.value));
            setSubmitError(null);
          }}
          placeholder="(11) 99999-9999"
          value={phone}
        />
        {!phoneIsValid && phoneTouched ? (
          <CrmFieldError id="crm-new-conversation-phone-error">
            Informe um WhatsApp válido com DDD.
          </CrmFieldError>
        ) : null}
      </label>
      <label>
        Mensagem
        <textarea
          aria-describedby={
            !messageIsValid && textTouched
              ? "crm-new-conversation-message-error"
              : undefined
          }
          aria-invalid={!messageIsValid && textTouched}
          disabled={disabled || isSaving}
          onBlur={() => setTextTouched(true)}
          onChange={(event) => {
            setText(event.target.value);
            setSubmitError(null);
          }}
          placeholder="Digite a primeira mensagem"
          rows={4}
          value={text}
        />
        {!messageIsValid && textTouched ? (
          <CrmFieldError id="crm-new-conversation-message-error">
            Digite a primeira mensagem.
          </CrmFieldError>
        ) : null}
      </label>
      {submitError ? <CrmFormError>{submitError}</CrmFormError> : null}
    </ActionDialog>
  );
}
