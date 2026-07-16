import { MessageCircle, Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { applyInputMask, formatBrazilianPhone } from "../../lib/masks";
import { sourceLabels, statusLabels } from "./crmPipelineConfig";
import type { LeadContactPatch } from "./crmPipelineModels";
import {
  buildLeadContactPatch,
  formatLeadContact,
  formatLeadName,
} from "./crmPipelineModels";
import type { CrmLeadStatus, ProductCrmLead } from "./productCrmTypes";

type LeadDetailPanelProps = {
  lead: ProductCrmLead | null;
  onUpdateLead: (leadId: string, input: LeadContactPatch) => Promise<void>;
  onUpdateStatus: (leadId: string, status: CrmLeadStatus) => Promise<void>;
};

export function LeadDetailPanel({
  lead,
  onUpdateLead,
  onUpdateStatus,
}: LeadDetailPanelProps) {
  const [draft, setDraft] = useState<LeadContactPatch>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft({
      buyerEmail: lead?.buyerEmail ?? null,
      buyerName: lead?.buyerName ?? null,
      buyerPhone: lead?.buyerPhone
        ? formatBrazilianPhone(lead.buyerPhone)
        : null,
    });
  }, [lead]);

  if (!lead) return <EmptyLeadPanel />;

  const save = async () => {
    setIsSaving(true);
    try {
      await onUpdateLead(lead.id, buildLeadContactPatch(lead, draft));
    } finally {
      setIsSaving(false);
    }
  };

  const startSale = () => {
    const params = new URLSearchParams();
    params.set("leadId", lead.id);
    if (lead.buyerName) params.set("buyerName", lead.buyerName);
    if (lead.buyerPhone) params.set("buyerPhone", lead.buyerPhone);
    if (lead.buyerEmail) params.set("buyerEmail", lead.buyerEmail);
    if (lead.listingId) params.set("listingId", lead.listingId);
    if (lead.vehicleTitle) params.set("listingTitle", lead.vehicleTitle);
    window.location.hash = `/sales?${params.toString()}`;
  };

  return (
    <FeatureSection
      actions={<strong>{statusLabels[lead.status]}</strong>}
      className="crm-panel"
      headerClassName="crm-panel-title crm-panel-title-between"
      icon={<UserRound aria-hidden="true" className="size-5" />}
      title={formatLeadName(lead)}
    >
      <div className="crm-form-grid">
        <input
          className="crm-input"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              buyerName: event.target.value,
            }))
          }
          value={draft.buyerName ?? ""}
        />
        <input
          className="crm-input"
          onChange={(event) => {
            const buyerPhone = applyInputMask(
              event.currentTarget,
              formatBrazilianPhone,
            );
            setDraft((current) => ({ ...current, buyerPhone }));
          }}
          inputMode="tel"
          type="tel"
          value={draft.buyerPhone ?? ""}
        />
        <input
          className="crm-input"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              buyerEmail: event.target.value,
            }))
          }
          type="email"
          value={draft.buyerEmail ?? ""}
        />
        <button
          className="crm-action"
          disabled={isSaving}
          onClick={() => void save()}
          type="button"
        >
          <Save aria-hidden="true" className="size-4" />
          {isSaving ? "Salvando" : "Salvar contato"}
        </button>
        <button className="crm-action" onClick={startSale} type="button">
          <UserRound aria-hidden="true" className="size-4" />
          Iniciar venda
        </button>
      </div>
      <div className="crm-lead-summary">
        <span>{formatLeadContact(lead)}</span>
        <span>{sourceLabels[lead.source]}</span>
        <span>{lead.vehicleTitle ?? "Sem veículo vinculado"}</span>
      </div>
      <div className="crm-status-actions">
        {Object.entries(statusLabels).map(([status, label]) => (
          <button
            className={
              status === lead.status ? "crm-chip crm-chip-active" : "crm-chip"
            }
            key={status}
            onClick={() =>
              void onUpdateStatus(lead.id, status as CrmLeadStatus)
            }
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </FeatureSection>
  );
}

function EmptyLeadPanel() {
  return (
    <section className="crm-panel crm-empty-panel">
      <MessageCircle aria-hidden="true" className="size-5" />
      <strong>Selecione um lead</strong>
    </section>
  );
}
