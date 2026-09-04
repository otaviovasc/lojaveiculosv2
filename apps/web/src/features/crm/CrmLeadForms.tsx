import {
  CalendarClock,
  CarFront,
  Mail,
  MessageCircle,
  Phone,
  Save,
  UserRound,
} from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import { CustomSelect } from "../../components/ui/CustomSelect";
import { DatePickerField } from "../../components/ui/DatePickerField";
import { TimePickerField } from "../../components/ui/TimePickerField";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { applyInputMask, formatBrazilianPhone } from "../../lib/masks";
import { sourceLabels, sourceOptions } from "./crmPipelineConfig";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { LeadCreateDraft } from "./crmPipelineModels";
import type { CrmLeadSource } from "./productCrmTypes";

type LeadCreatePanelProps = {
  onCreateLead: (input: LeadCreateDraft) => Promise<void>;
  vehicleOptions: LeadVehicleOption[];
};

export function LeadCreatePanel({
  onCreateLead,
  vehicleOptions,
}: LeadCreatePanelProps) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [initialNote, setInitialNote] = useState("");
  const [listingId, setListingId] = useState("");
  const [source, setSource] = useState<CrmLeadSource>("manual");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const parsedDate =
    taskDueAt && !Number.isNaN(new Date(taskDueAt).getTime())
      ? new Date(taskDueAt)
      : null;

  const timeString =
    taskDueAt && taskDueAt.includes("T")
      ? (taskDueAt.split("T")[1]?.slice(0, 5) ?? "09:00")
      : "09:00";

  const handleDateChange = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const time = timeString || "09:00";
    setTaskDueAt(`${year}-${month}-${day}T${time}`);
  };

  const handleTimeChange = (newTime: string) => {
    const datePart =
      taskDueAt && taskDueAt.includes("T")
        ? taskDueAt.split("T")[0]
        : new Date().toISOString().slice(0, 10);
    setTaskDueAt(`${datePart}T${newTime}`);
  };

  const submit = async () => {
    if (!buyerName.trim() && !buyerPhone.trim() && !buyerEmail.trim()) return;
    setIsSaving(true);
    try {
      await onCreateLead({
        buyerEmail: buyerEmail.trim() || null,
        buyerName: buyerName.trim() || null,
        buyerPhone: buyerPhone.trim() || null,
        ...(initialNote.trim() ? { initialNote: initialNote.trim() } : {}),
        ...(listingId.trim() ? { listingId: listingId.trim() } : {}),
        source,
        taskDueAt: taskDueAt || null,
        taskTitle: taskDueAt ? "Retornar contato" : null,
      });
      setBuyerName("");
      setBuyerPhone("");
      setBuyerEmail("");
      setInitialNote("");
      setListingId("");
      setTaskDueAt("");
      setSource("manual");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FeatureSection
      className="crm-panel"
      headerClassName="crm-panel-title"
      icon={<UserRound aria-hidden="true" className="size-5" />}
      title="Novo lead manual"
    >
      <div className="crm-form-grid">
        <CrmField icon={<UserRound />} label="Nome">
          <input
            className="crm-input"
            onChange={(event) => setBuyerName(event.target.value)}
            placeholder="Nome completo"
            value={buyerName}
          />
        </CrmField>
        <CrmField icon={<Phone />} label="WhatsApp">
          <input
            className="crm-input"
            inputMode="tel"
            onChange={(event) =>
              setBuyerPhone(
                applyInputMask(event.currentTarget, formatBrazilianPhone),
              )
            }
            placeholder="(00) 00000-0000"
            type="tel"
            value={buyerPhone}
          />
        </CrmField>
        <CrmField icon={<Mail />} label="Email">
          <input
            className="crm-input"
            onChange={(event) => setBuyerEmail(event.target.value)}
            placeholder="cliente@email.com"
            type="email"
            value={buyerEmail}
          />
        </CrmField>
        <CrmField icon={<MessageCircle />} label="Origem">
          <CustomSelect
            className="crm-input"
            onChange={setSource}
            options={sourceOptions
              .filter((option) => option !== "all")
              .map((option) => ({
                label: sourceLabels[option],
                value: option,
              }))}
            value={source}
          />
        </CrmField>
        <CrmField icon={<CarFront />} label="Veiculo">
          <CustomSelect
            className="crm-input"
            onChange={setListingId}
            options={[
              { label: "Sem vinculo", value: "" },
              ...vehicleOptions.map((vehicle) => ({
                label: `${vehicle.label} - ${vehicle.detail}`,
                value: vehicle.id,
              })),
            ]}
            value={listingId}
          />
        </CrmField>
        <div className="crm-visit-datetime-field-group">
          <div className="crm-visit-datepicker-block">
            <span className="crm-visit-field-label">Data de Follow-up</span>
            <DatePickerField
              label="Data"
              minDate={new Date()}
              onChange={handleDateChange}
              value={parsedDate}
            />
          </div>
          <div className="crm-visit-timepicker-block">
            <span className="crm-visit-field-label">Horário</span>
            <TimePickerField
              label="Horário"
              onChange={handleTimeChange}
              value={timeString}
            />
          </div>
        </div>
        <input
          aria-label="Follow-up"
          className="sr-only"
          onChange={(event) => setTaskDueAt(event.target.value)}
          tabIndex={-1}
          type="datetime-local"
          value={taskDueAt}
        />
        <textarea
          className="crm-input crm-textarea"
          onChange={(event) => setInitialNote(event.target.value)}
          placeholder="Mensagem inicial ou observacao"
          value={initialNote}
        />
        <button
          className="crm-action"
          disabled={isSaving}
          onClick={() => void submit()}
          type="button"
        >
          <Save aria-hidden="true" className="size-4" />
          {isSaving ? "Criando" : "Criar lead"}
        </button>
      </div>
    </FeatureSection>
  );
}

function CrmField({
  children,
  icon,
  label,
}: {
  children: ReactNode;
  icon: ReactElement;
  label: string;
}) {
  return (
    <label className="crm-field">
      <span>
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
