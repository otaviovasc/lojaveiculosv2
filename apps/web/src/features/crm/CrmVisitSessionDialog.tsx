import {
  Calendar,
  CalendarCheck,
  CarFront,
  Loader2,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CrmActionDialogShell } from "./CrmActionDialogFrame";
import { DatePickerField } from "../../components/ui/DatePickerField";
import {
  FeatureSelect,
  FeatureTextarea,
  TimePickerField,
} from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { CrmDateTimeShortcuts } from "./CrmDateTimeShortcuts";
import { formatCrmPhone } from "./crmPhoneFormat";
import { formatCycleName } from "./crmConversationModel";
import { createRuntimeCrmVisitsApi } from "./crmVisitsRuntimeApi";
import { createRuntimeProductCrmApi } from "./runtimeApi";
import type { CrmConversationCycle } from "./crmConversationTypes";
import type { CrmVehicleOption } from "./crmConversationExtraTypes";
import type { CrmLeadVisit } from "./crmVisitsApi";
import { formatApiErrorDisplay } from "../../lib/apiErrors";

export function CrmVisitSessionDialog({
  cycle,
  disabled,
  listVehicles,
  onClose,
  onSuccess,
}: {
  cycle: CrmConversationCycle;
  disabled?: boolean;
  listVehicles?: () => Promise<readonly CrmVehicleOption[]>;
  onClose: () => void;
  onSuccess?: (visit: CrmLeadVisit) => void;
}) {
  const [scheduledAt, setScheduledAt] = useState(() => {
    const target = new Date();
    target.setHours(14, 0, 0, 0);
    const offset = target.getTimezoneOffset();
    const adjusted = new Date(target.getTime() - offset * 60_000);
    return adjusted.toISOString().slice(0, 16);
  });
  const [selectedListingId, setSelectedListingId] = useState<string>(() =>
    String(cycle.vehicle?.id ?? ""),
  );
  const [notes, setNotes] = useState("");
  const [vehicleOptions, setVehicleOptions] = useState<
    readonly CrmVehicleOption[]
  >([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visitsApi = useMemo(() => createRuntimeCrmVisitsApi(), []);
  const productCrmApi = useMemo(() => createRuntimeProductCrmApi(), []);

  const customerName = formatCycleName(cycle);
  const customerPhone = cycle.customerPhone
    ? formatCrmPhone(cycle.customerPhone)
    : null;

  useEffect(() => {
    if (!listVehicles) return;
    let active = true;
    setIsLoadingVehicles(true);
    void listVehicles()
      .then((options) => {
        if (active) setVehicleOptions(options);
      })
      .catch(() => {
        if (active) setVehicleOptions([]);
      })
      .finally(() => {
        if (active) setIsLoadingVehicles(false);
      });
    return () => {
      active = false;
    };
  }, [listVehicles]);

  const parsedDate =
    scheduledAt && !Number.isNaN(new Date(scheduledAt).getTime())
      ? new Date(scheduledAt)
      : null;

  const timeString =
    scheduledAt && scheduledAt.includes("T")
      ? (scheduledAt.split("T")[1]?.slice(0, 5) ?? "14:00")
      : "14:00";

  const handleDateChange = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const time = timeString || "14:00";
    setScheduledAt(`${year}-${month}-${day}T${time}`);
  };

  const handleTimeChange = (newTime: string) => {
    const datePart =
      scheduledAt && scheduledAt.includes("T")
        ? scheduledAt.split("T")[0]
        : new Date().toISOString().slice(0, 10);
    setScheduledAt(`${datePart}T${newTime}`);
  };

  const applyQuickTime = useCallback(
    (dayOffset: number, hour: number, minute: number = 0) => {
      const target = new Date();
      target.setDate(target.getDate() + dayOffset);
      target.setHours(hour, minute, 0, 0);
      const offset = target.getTimezoneOffset();
      const adjusted = new Date(target.getTime() - offset * 60_000);
      setScheduledAt(adjusted.toISOString().slice(0, 16));
    },
    [],
  );

  const applyTimeOnly = useCallback(
    (hour: number, minute: number = 0) => {
      const base = scheduledAt ? new Date(scheduledAt) : new Date();
      if (Number.isNaN(base.getTime())) {
        base.setTime(Date.now());
      }
      base.setHours(hour, minute, 0, 0);
      const offset = base.getTimezoneOffset();
      const adjusted = new Date(base.getTime() - offset * 60_000);
      setScheduledAt(adjusted.toISOString().slice(0, 16));
    },
    [scheduledAt],
  );

  const addQuickTag = (tag: string) => {
    if (!notes) {
      setNotes(tag);
    } else if (!notes.includes(tag)) {
      setNotes(`${notes} • ${tag}`);
    }
  };

  const canSave =
    Boolean(scheduledAt && !Number.isNaN(new Date(scheduledAt).getTime())) &&
    !isSaving &&
    !disabled;

  const handleSave = async () => {
    if (!canSave) return;
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      setError("Escolha uma data e horário válidos.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      let leadId = cycle.leadId ?? null;
      if (!leadId) {
        // Create lead automatically for this conversation
        const createdLead = await productCrmApi.createLead({
          buyerName: customerName || "Cliente WhatsApp",
          buyerPhone: cycle.customerPhone ?? null,
          listingId: selectedListingId || null,
          source: "whatsapp",
        });
        leadId = createdLead.id;
      }

      const visit = await visitsApi.createVisit({
        ...(cycle.id ? { cycleId: String(cycle.id) } : {}),
        leadId,
        listingId: selectedListingId || null,
        notes: notes.trim() || null,
        scheduledAt: when.toISOString(),
      });

      onSuccess?.(visit);
      onClose();
    } catch (caught) {
      setError(
        formatApiErrorDisplay(caught, "Não foi possível agendar a visita."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CrmActionDialogShell
      onClose={onClose}
      panelClassName="crm-visit-dialog-panel"
      title="Agendar Visita & Test Drive"
    >
      <header>
        <span>
          <CalendarCheck />
        </span>
        <div>
          <h2>Agendar Visita & Test Drive</h2>
          <p>
            Agendamento presencial para <strong>{customerName}</strong>
            {customerPhone && customerPhone !== customerName
              ? ` (${customerPhone})`
              : ""}
          </p>
        </div>
        <button
          aria-label="Fechar"
          className="crm-icon-action"
          onClick={onClose}
          type="button"
        >
          <X />
        </button>
      </header>

      <div className="crm-action-fields">
        {/* Contact Info Strip */}
        <div className="crm-visit-session-lead-strip">
          <span className="crm-visit-lead-avatar">
            <UserRound className="size-4" />
          </span>
          <div className="crm-visit-lead-info">
            <strong>{customerName}</strong>
            <small>
              {customerPhone ?? "Telefone não informado"} •{" "}
              {cycle.vehicle?.title ?? "Interesse geral"}
            </small>
          </div>
        </div>

        {/* Date and Time Section */}
        <div className="crm-visit-section-card">
          <div className="crm-visit-section-header">
            <span className="crm-visit-section-icon">
              <Calendar aria-hidden="true" />
            </span>
            <div>
              <h3>Data e Horário</h3>
              <p>Escolha o momento da visita na loja</p>
            </div>
          </div>

          <div className="crm-visit-datetime-field-group">
            <div className="crm-visit-datepicker-block">
              <span className="crm-visit-field-label">Data da visita</span>
              <DatePickerField
                label="Data"
                onChange={handleDateChange}
                value={parsedDate}
              />
            </div>
            <div className="crm-visit-timepicker-block">
              <span className="crm-visit-field-label">Horário da visita</span>
              <TimePickerField
                label="Horário"
                onChange={handleTimeChange}
                value={timeString}
              />
            </div>
          </div>

          <CrmDateTimeShortcuts
            activeTime={timeString}
            onApplyPreset={applyQuickTime}
            onApplyTime={applyTimeOnly}
          />
        </div>

        {/* Vehicle and Purpose Section */}
        <div className="crm-visit-section-card">
          <div className="crm-visit-section-header">
            <span className="crm-visit-section-icon">
              <CarFront aria-hidden="true" />
            </span>
            <div>
              <h3>Veículo de Interesse</h3>
              <p>Vincule um carro do estoque ao agendamento</p>
            </div>
          </div>

          <FeatureField
            hint="Opcional. Deixe sem veículo para uma visita geral à loja."
            label="Veículo"
          >
            <FeatureSelect
              ariaLabel="Veículo de interesse"
              disabled={isLoadingVehicles || isSaving}
              onChange={setSelectedListingId}
              options={[
                { label: "Sem veículo específico", value: "" },
                ...vehicleOptions.map((vehicle) => ({
                  label: vehicle.title,
                  value: vehicle.listingId,
                })),
              ]}
              placeholder={
                isLoadingVehicles
                  ? "Carregando estoque..."
                  : "Sem veículo específico"
              }
              searchable
              searchPlaceholder="Buscar veículo no estoque..."
              value={selectedListingId}
            />
          </FeatureField>

          {/* Quick Context / Purpose Tags */}
          <div className="crm-visit-quick-group">
            <span className="crm-visit-quick-group-label">
              <Tag className="size-3 mr-1 inline" /> Finalidade rápida:
            </span>
            <div className="crm-visit-quick-tags">
              <button
                className="crm-visit-tag-btn"
                onClick={() => addQuickTag("Test drive agendado")}
                type="button"
              >
                🚗 Test Drive
              </button>
              <button
                className="crm-visit-tag-btn"
                onClick={() => addQuickTag("Avaliação na troca")}
                type="button"
              >
                🔄 Avaliação na Troca
              </button>
              <button
                className="crm-visit-tag-btn"
                onClick={() => addQuickTag("Simulação de financiamento")}
                type="button"
              >
                📋 Financiamento
              </button>
              <button
                className="crm-visit-tag-btn"
                onClick={() => addQuickTag("Apresentação de proposta")}
                type="button"
              >
                🤝 Proposta Comercial
              </button>
            </div>
          </div>

          <FeatureField
            hint="Orientações para a equipe de recepção ou vendas."
            label="Observações"
          >
            <FeatureTextarea
              aria-label="Observações da visita"
              disabled={isSaving}
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex.: Cliente virá acompanhado, test drive do modelo selecionado"
              value={notes}
            />
          </FeatureField>
        </div>

        {error ? <p className="crm-schedule-error">{error}</p> : null}
      </div>

      <footer>
        <button
          className="crm-action crm-action-muted"
          disabled={isSaving}
          onClick={onClose}
          type="button"
        >
          Cancelar
        </button>
        <button
          className="crm-action"
          disabled={!canSave}
          onClick={() => void handleSave()}
          type="button"
        >
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin mr-1.5" />
              Agendando...
            </>
          ) : (
            <>
              <CalendarCheck className="size-4 mr-1.5" />
              Agendar Visita
            </>
          )}
        </button>
      </footer>
    </CrmActionDialogShell>
  );
}
