import {
  CheckCircle2,
  MessageCircle,
  Phone,
  Plus,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { applyInputMask, formatBrazilianPhone } from "../../lib/masks";
import { pipelineStatuses, statusLabels } from "./crmPipelineConfig";
import type {
  CreateProductCrmLeadInput,
  CrmLeadStatus,
  ProductCrmLead,
} from "./productCrmTypes";

export function LeadCreatePanel({
  onCreateLead,
}: {
  onCreateLead: (input: CreateProductCrmLeadInput) => Promise<void>;
}) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!buyerName.trim() && !buyerPhone.trim()) return;
    setIsSaving(true);
    try {
      await onCreateLead({
        buyerEmail: buyerEmail.trim() || null,
        buyerName: buyerName.trim() || null,
        buyerPhone: buyerPhone.trim() || null,
        source: "manual",
      });
      setBuyerName("");
      setBuyerPhone("");
      setBuyerEmail("");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="crm-panel">
      <div className="crm-panel-title">
        <Plus aria-hidden="true" className="size-5" />
        <h3>Novo lead</h3>
      </div>
      <div className="grid gap-3">
        <input
          className="crm-input"
          onChange={(event) => setBuyerName(event.target.value)}
          placeholder="Nome"
          value={buyerName}
        />
        <input
          className="crm-input"
          inputMode="tel"
          onChange={(event) =>
            setBuyerPhone(
              applyInputMask(event.currentTarget, formatBrazilianPhone),
            )
          }
          placeholder="WhatsApp"
          type="tel"
          value={buyerPhone}
        />
        <input
          className="crm-input"
          onChange={(event) => setBuyerEmail(event.target.value)}
          placeholder="Email"
          value={buyerEmail}
        />
        <button
          className="crm-action"
          disabled={isSaving}
          onClick={() => void submit()}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          {isSaving ? "Criando" : "Criar lead"}
        </button>
      </div>
    </section>
  );
}

export function PipelineBoard({
  activeLeadId,
  leads,
  onSelectLead,
}: {
  activeLeadId: string | null;
  leads: ProductCrmLead[];
  onSelectLead: (leadId: string) => void;
}) {
  return (
    <section className="crm-pipeline-board">
      {pipelineStatuses.map((status) => (
        <div className="crm-stage" key={status}>
          <div className="crm-stage-title">
            <span>{statusLabels[status]}</span>
            <strong>
              {leads.filter((lead) => lead.status === status).length}
            </strong>
          </div>
          <div className="grid gap-2">
            {leads
              .filter((lead) => lead.status === status)
              .map((lead) => (
                <button
                  className={`crm-lead-card ${
                    lead.id === activeLeadId ? "crm-lead-card-active" : ""
                  }`}
                  key={lead.id}
                  onClick={() => onSelectLead(lead.id)}
                  type="button"
                >
                  <strong>{lead.buyerName ?? "Lead sem nome"}</strong>
                  <span>
                    {lead.vehicleTitle ?? lead.buyerPhone ?? lead.source}
                  </span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function LeadDetailPanel({
  lead,
  onUpdateStatus,
}: {
  lead: ProductCrmLead | null;
  onUpdateStatus: (leadId: string, status: CrmLeadStatus) => Promise<void>;
}) {
  if (!lead) return <EmptyPanel title="Selecione um lead" />;

  return (
    <section className="crm-panel">
      <div className="crm-panel-title">
        <UserRound aria-hidden="true" className="size-5" />
        <h3>Lead</h3>
      </div>
      <div className="crm-lead-detail-grid">
        <InfoRow
          icon={<UserRound className="size-4" />}
          label="Cliente"
          value={lead.buyerName ?? "-"}
        />
        <InfoRow
          icon={<Phone className="size-4" />}
          label="WhatsApp"
          value={lead.buyerPhone ?? "-"}
        />
        <InfoRow
          icon={<MessageCircle className="size-4" />}
          label="Origem"
          value={lead.source}
        />
        <InfoRow
          icon={<CheckCircle2 className="size-4" />}
          label="Status"
          value={statusLabels[lead.status]}
        />
      </div>
      <div className="crm-status-actions">
        {pipelineStatuses.map((status) => (
          <button
            className={
              status === lead.status ? "crm-chip crm-chip-active" : "crm-chip"
            }
            key={status}
            onClick={() => void onUpdateStatus(lead.id, status)}
            type="button"
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="crm-info-row">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyPanel({ title }: { title: string }) {
  return (
    <section className="crm-panel crm-empty-panel">
      <MessageCircle aria-hidden="true" className="size-5" />
      <strong>{title}</strong>
    </section>
  );
}
