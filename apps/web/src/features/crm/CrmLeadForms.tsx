import {
  CalendarClock,
  Mail,
  MessageCircle,
  Phone,
  Save,
  UserRound,
} from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import { sourceLabels, sourceOptions } from "./crmPipelineConfig";
import type { LeadCreateDraft } from "./crmPipelineModels";
import type { CrmLeadSource } from "./productCrmTypes";

type LeadCreatePanelProps = {
  onCreateLead: (input: LeadCreateDraft) => Promise<void>;
};

export function LeadCreatePanel({ onCreateLead }: LeadCreatePanelProps) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [initialNote, setInitialNote] = useState("");
  const [source, setSource] = useState<CrmLeadSource>("manual");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!buyerName.trim() && !buyerPhone.trim() && !buyerEmail.trim()) return;
    setIsSaving(true);
    try {
      await onCreateLead({
        buyerEmail: buyerEmail.trim() || null,
        buyerName: buyerName.trim() || null,
        buyerPhone: buyerPhone.trim() || null,
        ...(initialNote.trim() ? { initialNote: initialNote.trim() } : {}),
        source,
        taskDueAt: taskDueAt || null,
        taskTitle: taskDueAt ? "Retornar contato" : null,
      });
      setBuyerName("");
      setBuyerPhone("");
      setBuyerEmail("");
      setInitialNote("");
      setTaskDueAt("");
      setSource("manual");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="crm-panel">
      <div className="crm-panel-title">
        <UserRound aria-hidden="true" className="size-5" />
        <h3>Novo lead manual</h3>
      </div>
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
            onChange={(event) => setBuyerPhone(event.target.value)}
            placeholder="(00) 00000-0000"
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
          <select
            className="crm-input"
            onChange={(event) => setSource(event.target.value as CrmLeadSource)}
            value={source}
          >
            {sourceOptions
              .filter((option) => option !== "all")
              .map((option) => (
                <option key={option} value={option}>
                  {sourceLabels[option]}
                </option>
              ))}
          </select>
        </CrmField>
        <CrmField icon={<CalendarClock />} label="Follow-up">
          <input
            className="crm-input"
            onChange={(event) => setTaskDueAt(event.target.value)}
            type="datetime-local"
            value={taskDueAt}
          />
        </CrmField>
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
    </section>
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
