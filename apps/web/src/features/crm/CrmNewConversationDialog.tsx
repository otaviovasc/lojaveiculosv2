import { MessageSquarePlus, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { formatBrazilianPhone } from "../../lib/masks";
import { ActionDialog } from "./CrmActionDialogFrame";
import {
  CrmConnectionSelect,
  readConnectionPhone,
} from "./CrmConnectionSelect";
import {
  CrmFieldError,
  CrmFormError,
  formatCrmSubmitError,
} from "./CrmFormFeedback";
import { isValidCrmPhone } from "./crmFormValidation";
import {
  listConversationStartConnections,
  readConversationStartCapability,
  resolveConversationStartConnection,
} from "./crmConnectionSelection";
import type { CrmProviderConnection } from "./crmConversationTypes";
import { readCrmProviderLabel } from "./crmConnectionStatus";
import type { CrmProvider } from "@lojaveiculosv2/shared";

type StartConversationDraftBase = {
  buyerName?: string;
  connectionId?: string;
  phone: string;
};

export type StartConversationDraft =
  | (StartConversationDraftBase & {
      template?: never;
      text: string;
    })
  | (StartConversationDraftBase & {
      template: {
        components?: Array<{
          parameters: Array<{ text: string; type: "text" }>;
          type: "body";
        }>;
        languageCode: string;
        name: string;
      };
      text?: never;
    });

export function CrmNewConversationDialog({
  connections,
  defaultConnectionId = null,
  disabled,
  initialBuyerName = "",
  initialPhone = "",
  onClose,
  onStart,
  provider = "zapi",
}: {
  connections?: readonly CrmProviderConnection[];
  defaultConnectionId?: string | null;
  disabled?: boolean;
  initialBuyerName?: string;
  initialPhone?: string;
  onClose: () => void;
  onStart: (input: StartConversationDraft) => Promise<boolean>;
  provider?: Extract<CrmProvider, "meta_cloud" | "zapi">;
}) {
  const startConnections = useMemo(
    () => listConversationStartConnections(connections ?? []),
    [connections],
  );
  const fallbackConnection = useMemo(
    () =>
      resolveConversationStartConnection({
        connections: connections ?? [],
        preferredConnectionId: defaultConnectionId,
      }),
    [connections, defaultConnectionId],
  );
  const [pickedConnectionId, setPickedConnectionId] = useState<string | null>(
    null,
  );
  const selectedConnection =
    startConnections.length > 1
      ? (startConnections.find(
          (connection) => String(connection.id) === pickedConnectionId,
        ) ?? fallbackConnection)
      : (startConnections[0] ?? null);
  const selectedCapability = selectedConnection
    ? readConversationStartCapability(selectedConnection)
    : null;
  const [buyerName, setBuyerName] = useState(initialBuyerName);
  const [phone, setPhone] = useState(() => formatBrazilianPhone(initialPhone));
  const [text, setText] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateParameters, setTemplateParameters] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [textTouched, setTextTouched] = useState(false);
  const [templateTouched, setTemplateTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const usesTemplate = selectedCapability
    ? selectedCapability.mode === "template"
    : provider === "meta_cloud";
  const phoneIsValid = isValidCrmPhone(phone);
  const messageIsValid = text.trim().length > 0;
  const templateIsValid =
    /^[a-z0-9_]+$/u.test(templateName.trim()) &&
    templateParameters.every((parameter) => parameter.trim().length > 0);
  const canSubmit =
    phoneIsValid && (usesTemplate ? templateIsValid : messageIsValid);
  return (
    <ActionDialog
      disabled={disabled || isSaving || !canSubmit}
      description="Envie a primeira mensagem e abra um novo atendimento."
      icon={<MessageSquarePlus />}
      onClose={onClose}
      onSubmit={async () => {
        if (!canSubmit) return;
        setSubmitError(null);
        setIsSaving(true);
        try {
          const common = {
            ...(buyerName.trim() ? { buyerName: buyerName.trim() } : {}),
            ...(selectedConnection
              ? { connectionId: String(selectedConnection.id) }
              : {}),
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
                    languageCode: "pt_BR",
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
      panelClassName="crm-new-conversation-panel"
      submitLabel={isSaving ? "Iniciando..." : "Iniciar conversa"}
      title="Nova conversa"
    >
      <div className="crm-new-conversation-intro">
        <strong>Inicie o atendimento pelo número do cliente.</strong>
        {usesTemplate ? (
          <p>
            A API oficial exige um template previamente aprovado pela Meta para
            a primeira mensagem. A conversa será criada na conexão ativa.
          </p>
        ) : (
          <p>
            A conversa será criada na conexão ativa e a primeira mensagem será
            enviada pelo WhatsApp da loja.
          </p>
        )}
        <div className="crm-new-conversation-meta" aria-hidden="true">
          <span data-variant="channel">
            <i /> {usesTemplate ? "WhatsApp Oficial" : "WhatsApp"}
          </span>
          <span data-variant="hint">
            {selectedConnection
              ? `${readCrmProviderLabel(selectedConnection.provider)} · ${
                  readConnectionPhone(selectedConnection) ??
                  selectedConnection.displayName
                } · envio imediato`
              : "Conexão ativa · envio imediato"}
          </span>
        </div>
      </div>
      {startConnections.length > 1 && selectedConnection ? (
        <CrmConnectionSelect
          connections={startConnections}
          disabled={disabled || isSaving}
          label="Conexão de envio"
          onChange={(connectionId) => {
            setPickedConnectionId(connectionId);
            setText("");
            setTextTouched(false);
            setTemplateName("");
            setTemplateParameters([]);
            setTemplateTouched(false);
            setSubmitError(null);
          }}
          value={String(selectedConnection.id)}
        />
      ) : null}
      <div className="crm-action-grid">
        <label>
          Nome
          <input
            autoComplete="name"
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
            autoComplete="tel"
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
      </div>
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
