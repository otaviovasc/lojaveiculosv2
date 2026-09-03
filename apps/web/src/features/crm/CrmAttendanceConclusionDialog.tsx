import {
  CalendarClock,
  CheckCheck,
  ChevronDown,
  ExternalLink,
  UserRound,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { CrmSelect } from "./CrmFormControls";
import { CrmActionDialogShell } from "./CrmActionDialogFrame";
import { DatePickerField } from "../../components/ui/DatePickerField";
import { TimePickerField } from "../../components/ui/TimePickerField";
import { readCrmChannelLabel } from "./crmConnectionStatus";
import { formatCycleName } from "./crmConversationModel";
import type {
  CrmConclusionInput,
  CrmLossReason,
  CrmConversationCycle,
} from "./crmConversationTypes";
export type { CrmConclusionInput } from "./crmConversationTypes";

type Outcome = "follow_up" | "lost";
type ReminderPreset = "custom" | "none" | "tomorrow" | "three_days" | "week";

const lostReasons: Array<{ label: string; value: CrmLossReason }> = [
  { label: "Sem resposta", value: "no_response" },
  { label: "Preço", value: "price" },
  { label: "Financiamento não aprovado", value: "financing_not_approved" },
  { label: "Avaliação do usado", value: "trade_in_valuation" },
  { label: "Veículo indisponível", value: "vehicle_unavailable" },
  { label: "Comprou em outro lugar", value: "bought_elsewhere" },
  { label: "Não tem mais interesse", value: "no_longer_interested" },
  { label: "Contato inválido", value: "invalid_contact" },
  { label: "Outro", value: "other" },
];
const reminderOptions: Array<{ label: string; value: ReminderPreset }> = [
  { label: "Sem lembrete", value: "none" },
  { label: "Amanhã", value: "tomorrow" },
  { label: "Em 3 dias", value: "three_days" },
  { label: "Em 1 semana", value: "week" },
  { label: "Personalizado", value: "custom" },
];

export function CrmAttendanceConclusionDialog({
  assignableMembers,
  disabled = false,
  onClose,
  onConclude,
  onStartSale,
  cycle,
}: {
  assignableMembers: Array<{ id: number; name: string }>;
  disabled?: boolean;
  onClose: () => void;
  onConclude: (input: CrmConclusionInput) => Promise<boolean>;
  onStartSale?: ((cycle: CrmConversationCycle) => void) | undefined;
  cycle: CrmConversationCycle;
}) {
  const [outcome, setOutcome] = useState<Outcome>("follow_up");
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderPreset, setReminderPreset] = useState<ReminderPreset>("none");
  const [customDueAt, setCustomDueAt] = useState("");
  const [lostReason, setLostReason] = useState<CrmLossReason | "">("");
  const [note, setNote] = useState("");
  const [attempted, setAttempted] = useState(false);
  const commandIdRef = useRef<string | null>(null);

  const parsedDate =
    customDueAt && !Number.isNaN(new Date(customDueAt).getTime())
      ? new Date(customDueAt)
      : null;

  const timeString =
    customDueAt && customDueAt.includes("T")
      ? (customDueAt.split("T")[1]?.slice(0, 5) ?? "09:00")
      : "09:00";

  const handleDateChange = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const time = timeString || "09:00";
    setCustomDueAt(`${year}-${month}-${day}T${time}`);
    setAttempted(false);
    commandIdRef.current = null;
  };

  const handleTimeChange = (newTime: string) => {
    const datePart =
      customDueAt && customDueAt.includes("T")
        ? customDueAt.split("T")[0]
        : new Date().toISOString().slice(0, 10);
    setCustomDueAt(`${datePart}T${newTime}`);
    setAttempted(false);
    commandIdRef.current = null;
  };
  const owner =
    cycle.assignedMember?.name ??
    assignableMembers.find(
      (member) => String(member.id) === String(cycle.assignedUserId),
    )?.name ??
    "Sem responsável";
  const metadata = cycle.metadata ?? {};
  const stage = readMetadataString(metadata, "pipelineStageName", "stageName");
  const listingTitle =
    cycle.vehicle?.title ?? readMetadataString(metadata, "listingTitle");
  const validationError =
    outcome === "lost" && !lostReason
      ? "Selecione o motivo da perda."
      : outcome === "lost" && lostReason === "other" && !note.trim()
        ? "Descreva o outro motivo."
        : outcome === "follow_up" && reminderPreset === "custom" && !customDueAt
          ? "Informe quando deseja ser lembrado."
          : null;

  const changeOutcome = (next: Outcome) => {
    setOutcome(next);
    setAttempted(false);
    commandIdRef.current = null;
  };

  const submit = async () => {
    setAttempted(true);
    if (validationError) return;
    commandIdRef.current ??= createCommandId();
    const accepted = await onConclude(
      outcome === "follow_up"
        ? {
            commandId: commandIdRef.current,
            outcome,
            ...(readReminderDueAt(reminderPreset, customDueAt)
              ? {
                  reminder: {
                    dueAt: readReminderDueAt(reminderPreset, customDueAt)!,
                  },
                }
              : {}),
          }
        : {
            commandId: commandIdRef.current,
            outcome,
            ...(note.trim() ? { note: note.trim() } : {}),
            reason: lostReason as CrmLossReason,
          },
    );
    if (accepted) onClose();
  };

  return (
    <CrmActionDialogShell
      onClose={onClose}
      panelClassName="crm-conclusion-panel"
      title="Concluir atendimento"
    >
      <header>
        <span>
          <CheckCheck aria-hidden="true" />
        </span>
        <div>
          <h2>Concluir atendimento</h2>
          <p>Registre o próximo passo desta oportunidade.</p>
        </div>
        <button
          aria-label="Fechar"
          className="crm-icon-action"
          disabled={disabled}
          onClick={onClose}
          type="button"
        >
          <X />
        </button>
      </header>

      <div className="crm-action-fields">
        <dl className="crm-conclusion-context">
          <ContextItem label="Lead / cliente" value={formatCycleName(cycle)} />
          <ContextItem label="Responsável" value={owner} />
          <ContextItem label="Etapa" value={stage ?? "Não informada"} />
          <ContextItem
            label="Canal"
            value={readCrmChannelLabel(cycle.channel)}
          />
          <ContextItem
            label="Veículo"
            value={listingTitle ?? "Não vinculado"}
          />
        </dl>

        <div
          aria-label="Desfecho do atendimento"
          className="crm-conclusion-options"
          role="radiogroup"
        >
          <OutcomeButton
            active={outcome === "follow_up"}
            description="Finaliza a conversa e mantém a oportunidade em acompanhamento."
            disabled={disabled}
            label="Continuar acompanhamento"
            onClick={() => changeOutcome("follow_up")}
          />
          <OutcomeButton
            active={outcome === "lost"}
            description="Finaliza a conversa e registra por que a oportunidade foi perdida."
            disabled={disabled}
            label="Perdido"
            onClick={() => changeOutcome("lost")}
          />
        </div>

        {outcome === "follow_up" ? (
          <section className="crm-conclusion-reminder">
            <button
              aria-expanded={reminderOpen}
              className="crm-conclusion-expand"
              disabled={disabled}
              onClick={() => setReminderOpen((open) => !open)}
              type="button"
            >
              <CalendarClock aria-hidden="true" />
              Agendar lembrete (opcional)
              <ChevronDown aria-hidden="true" />
            </button>
            {reminderOpen ? (
              <div className="crm-conclusion-reminder-fields">
                <label>
                  Quando lembrar
                  <CrmSelect
                    ariaLabel="Quando lembrar"
                    className="crm-select"
                    disabled={disabled}
                    onChange={(value) => {
                      setReminderPreset(value);
                      setAttempted(false);
                      commandIdRef.current = null;
                    }}
                    options={reminderOptions}
                    value={reminderPreset}
                  />
                </label>
                {reminderPreset === "custom" ? (
                  <div className="crm-visit-datetime-field-group">
                    <div className="crm-visit-datepicker-block">
                      <span className="crm-visit-field-label">
                        Data do lembrete
                      </span>
                      <DatePickerField
                        isDisabled={disabled}
                        label="Data"
                        minDate={new Date()}
                        onChange={handleDateChange}
                        value={parsedDate}
                      />
                    </div>
                    <div className="crm-visit-timepicker-block">
                      <span className="crm-visit-field-label">Horário</span>
                      <TimePickerField
                        isDisabled={disabled}
                        label="Horário"
                        onChange={handleTimeChange}
                        value={timeString}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : (
          <div className="crm-conclusion-lost-fields">
            <label>
              Motivo da perda
              <CrmSelect<CrmLossReason | "">
                ariaLabel="Motivo da perda"
                className="crm-select"
                disabled={disabled}
                onChange={(value) => {
                  setLostReason(value);
                  setAttempted(false);
                  commandIdRef.current = null;
                }}
                options={[
                  { label: "Selecione um motivo", value: "" },
                  ...lostReasons,
                ]}
                value={lostReason}
              />
            </label>
            {lostReason === "other" ? (
              <label>
                Detalhes do motivo
                <textarea
                  aria-invalid={attempted && !note.trim()}
                  disabled={disabled}
                  onChange={(event) => {
                    setNote(event.target.value);
                    setAttempted(false);
                    commandIdRef.current = null;
                  }}
                  placeholder="Explique brevemente o motivo"
                  rows={3}
                  value={note}
                />
              </label>
            ) : null}
          </div>
        )}
        {attempted && validationError ? (
          <p className="crm-conclusion-error" role="alert">
            {validationError}
          </p>
        ) : null}
      </div>

      <footer className="crm-conclusion-footer">
        <button
          className="crm-action crm-action-muted cursor-pointer"
          disabled={disabled}
          onClick={() => {
            if (onStartSale) {
              onStartSale(cycle);
              onClose();
            } else {
              navigateToSale(cycle);
            }
          }}
          type="button"
        >
          <UserRound aria-hidden="true" className="size-4" />
          Iniciar venda
          <ExternalLink aria-hidden="true" className="size-4" />
        </button>
        <span className="crm-conclusion-footer-actions">
          <button
            className="crm-action crm-action-muted"
            disabled={disabled}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="crm-action"
            disabled={disabled}
            onClick={() => void submit()}
            type="button"
          >
            {disabled ? "Concluindo..." : "Concluir atendimento"}
          </button>
        </span>
      </footer>
    </CrmActionDialogShell>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function OutcomeButton({
  active,
  description,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      role="radio"
      type="button"
    >
      <span aria-hidden="true" />
      <strong>{label}</strong>
      <small>{description}</small>
    </button>
  );
}

function navigateToSale(cycle: CrmConversationCycle) {
  const params = new URLSearchParams();
  const metadata = cycle.metadata ?? {};
  if (cycle.leadId) params.set("leadId", cycle.leadId);
  if (cycle.customerDisplayName)
    params.set("customerDisplayName", cycle.customerDisplayName);
  if (cycle.customerPhone) params.set("customerPhone", cycle.customerPhone);
  const salespersonId = cycle.assignedUserId;
  if (salespersonId) params.set("sellerUserId", salespersonId);
  const listingId = readMetadataString(metadata, "listingId");
  if (listingId) params.set("listingId", listingId);
  const unitId = readMetadataString(metadata, "unitId");
  if (unitId) params.set("unitId", unitId);
  const listingTitle =
    cycle.vehicle?.title ?? readMetadataString(metadata, "listingTitle");
  if (listingTitle) params.set("listingTitle", listingTitle);
  window.location.hash = `/sales${params.size ? `?${params.toString()}` : ""}`;
}

function readMetadataString(
  metadata: Record<string, unknown>,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function readReminderDueAt(preset: ReminderPreset, customDueAt: string) {
  if (preset === "none") return null;
  if (preset === "custom") {
    const value = new Date(customDueAt);
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const value = new Date();
  value.setDate(
    value.getDate() +
      (preset === "tomorrow" ? 1 : preset === "three_days" ? 3 : 7),
  );
  value.setHours(9, 0, 0, 0);
  return value.toISOString();
}

function toLocalDateTimeValue(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function createCommandId() {
  return crypto.randomUUID();
}
