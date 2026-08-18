import { MessageSquarePlus, Plus, X } from "lucide-react";
import { useState } from "react";
import { formatBrazilianPhone } from "../../lib/masks";
import { ActionDialog } from "./CrmActionDialogFrame";
import {
  CrmFieldError,
  CrmFormError,
  formatCrmSubmitError,
} from "./CrmFormFeedback";
import { isValidCrmPhone } from "./crmFormValidation";
import type { CrmProvider } from "@lojaveiculosv2/shared";

export type StartConversationDraft =
  | {
      buyerName?: string;
      phone: string;
      template?: never;
      text: string;
    }
  | {
      buyerName?: string;
      phone: string;
      template: {
        components?: Array<{
          parameters: Array<{ text: string; type: "text" }>;
          type: "body";
        }>;
        languageCode: string;
        name: string;
      };
      text?: never;
    };

export function CrmNewConversationDialog({
  disabled,
  onClose,
  onStart,
  provider = "zapi",
}: {
  disabled?: boolean;
  onClose: () => void;
  onStart: (input: StartConversationDraft) => Promise<boolean>;
  provider?: Extract<CrmProvider, "meta_cloud" | "zapi">;
}) {
  const [buyerName, setBuyerName] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("pt_BR");
  const [templateParameters, setTemplateParameters] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [textTouched, setTextTouched] = useState(false);
  const [templateTouched, setTemplateTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const usesTemplate = provider === "meta_cloud";
  const phoneIsValid = isValidCrmPhone(phone);
  const messageIsValid = text.trim().length > 0;
  const templateIsValid =
    /^[a-z0-9_]+$/u.test(templateName.trim()) &&
    templateLanguage.trim().length >= 2 &&
    templateParameters.every((parameter) => parameter.trim().length > 0);
  const canSubmit =
    phoneIsValid && (usesTemplate ? templateIsValid : messageIsValid);
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
          const common = {
            ...(buyerName.trim() ? { buyerName: buyerName.trim() } : {}),
            phone: phone.trim(),
          };
          const accepted = await onStart(
            usesTemplate
              ? {
                  ...common,
                  template: {
                    ...(templateParameters.length
                      ? {
                          components: [
                            {
                              parameters: templateParameters.map(
                                (parameter) => ({
                                  text: parameter.trim(),
                                  type: "text" as const,
                                }),
                              ),
                              type: "body" as const,
                            },
                          ],
                        }
                      : {}),
                    languageCode: templateLanguage.trim(),
                    name: templateName.trim(),
                  },
                }
              : { ...common, text: text.trim() },
          );
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
      <div className="crm-new-conversation-intro">
        <strong>Inicie o atendimento pelo número do cliente.</strong>
        {usesTemplate ? (
          <p>
            A API oficial exige um template previamente aprovado pela Meta para
            a primeira mensagem.
          </p>
        ) : (
          <p>
            A conversa será criada na conexão ativa e a primeira mensagem será
            enviada pelo WhatsApp da loja.
          </p>
        )}
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
      {usesTemplate ? (
        <>
          <label>
            Template aprovado
            <input
              aria-describedby={
                !templateIsValid && templateTouched
                  ? "crm-new-conversation-template-error"
                  : undefined
              }
              aria-invalid={!templateIsValid && templateTouched}
              autoComplete="off"
              disabled={disabled || isSaving}
              onBlur={() => setTemplateTouched(true)}
              onChange={(event) => {
                setTemplateName(event.target.value.toLowerCase());
                setSubmitError(null);
              }}
              placeholder="primeiro_contato"
              value={templateName}
            />
          </label>
          <label>
            Idioma do template
            <input
              autoComplete="off"
              disabled={disabled || isSaving}
              onChange={(event) => {
                setTemplateLanguage(event.target.value);
                setSubmitError(null);
              }}
              placeholder="pt_BR"
              value={templateLanguage}
            />
          </label>
          <div className="crm-template-parameters">
            <div>
              <span>Parâmetros do corpo</span>
              <button
                aria-label="Adicionar parâmetro do template"
                disabled={disabled || isSaving}
                onClick={() =>
                  setTemplateParameters((current) => [...current, ""])
                }
                title="Adicionar parâmetro"
                type="button"
              >
                <Plus aria-hidden="true" />
              </button>
            </div>
            <p>
              Adicione os valores na mesma ordem dos marcadores do template
              aprovado.
            </p>
            {templateParameters.map((parameter, index) => (
              <div className="crm-template-parameter-row" key={index}>
                <label>
                  Parâmetro {index + 1}
                  <input
                    autoComplete="off"
                    disabled={disabled || isSaving}
                    onChange={(event) =>
                      setTemplateParameters((current) =>
                        current.map((value, itemIndex) =>
                          itemIndex === index ? event.target.value : value,
                        ),
                      )
                    }
                    value={parameter}
                  />
                </label>
                <button
                  aria-label={`Remover parâmetro ${index + 1}`}
                  disabled={disabled || isSaving}
                  onClick={() =>
                    setTemplateParameters((current) =>
                      current.filter(
                        (_value, itemIndex) => itemIndex !== index,
                      ),
                    )
                  }
                  title={`Remover parâmetro ${index + 1}`}
                  type="button"
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          {!templateIsValid && templateTouched ? (
            <CrmFieldError id="crm-new-conversation-template-error">
              Use o nome exato aprovado, com letras minúsculas, números e
              sublinhado.
            </CrmFieldError>
          ) : null}
        </>
      ) : (
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
      )}
      {submitError ? <CrmFormError>{submitError}</CrmFormError> : null}
    </ActionDialog>
  );
}
