import { EmptyLeads } from "./CrmEmptyLeads";
import { sourceLabels, statusLabels } from "./crmPipelineConfig";
import {
  formatLeadContact,
  formatLeadName,
  formatRelativeDate,
} from "./crmPipelineModels";
import type { ProductCrmLead } from "./productCrmTypes";

export function LeadTableView({
  activeLeadId,
  leads,
  onSelectLead,
}: {
  activeLeadId: string | null;
  leads: ProductCrmLead[];
  onSelectLead: (leadId: string) => void;
}) {
  if (!leads.length) return <EmptyLeads />;

  return (
    <section className="crm-table-wrap">
      <table className="crm-table">
        <thead>
          <tr>
            <th>Lead</th>
            <th>Contato</th>
            <th>Fase</th>
            <th>Origem</th>
            <th>Última atividade</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              className={activeLeadId === lead.id ? "crm-table-active" : ""}
              key={lead.id}
              onClick={() => onSelectLead(lead.id)}
            >
              <td>{formatLeadName(lead)}</td>
              <td>{formatLeadContact(lead)}</td>
              <td>{statusLabels[lead.status]}</td>
              <td>{sourceLabels[lead.source]}</td>
              <td>
                {formatRelativeDate(lead.lastInteractionAt ?? lead.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
