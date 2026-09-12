import { Search } from "lucide-react";
import { CrmSelect } from "./CrmFormControls";
import type {
  CampaignAudienceSource,
  CampaignLeadFilters,
} from "./crmCampaignSources";

export function CampaignAudienceFilters({
  audienceSource,
  leadFilters,
  onAudienceSourceChange,
  onLeadFiltersChange,
  onQueryChange,
  query,
}: {
  audienceSource: CampaignAudienceSource;
  leadFilters: CampaignLeadFilters;
  onAudienceSourceChange: (value: CampaignAudienceSource) => void;
  onLeadFiltersChange: (value: CampaignLeadFilters) => void;
  onQueryChange: (value: string) => void;
  query: string;
}) {
  return (
    <>
      <div
        aria-label="Origem dos destinatarios"
        className="crm-campaign-source-tabs"
        role="tablist"
      >
        <SourceTab
          active={audienceSource === "conversations"}
          label="Conversas"
          onClick={() => onAudienceSourceChange("conversations")}
        />
        <SourceTab
          active={audienceSource === "leads"}
          label="Leads"
          onClick={() => onAudienceSourceChange("leads")}
        />
      </div>
      {audienceSource === "leads" ? (
        <LeadFilters filters={leadFilters} onChange={onLeadFiltersChange} />
      ) : (
        <ConversationFilters onQueryChange={onQueryChange} query={query} />
      )}
    </>
  );
}

function SourceTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button aria-selected={active} onClick={onClick} role="tab" type="button">
      {label}
    </button>
  );
}

function ConversationFilters({
  onQueryChange,
  query,
}: {
  onQueryChange: (value: string) => void;
  query: string;
}) {
  return (
    <SearchField
      onChange={onQueryChange}
      placeholder="Buscar conversa ou telefone"
      value={query}
    />
  );
}

function LeadFilters({
  filters,
  onChange,
}: {
  filters: CampaignLeadFilters;
  onChange: (value: CampaignLeadFilters) => void;
}) {
  return (
    <>
      <SearchField
        onChange={(query) => onChange({ ...filters, query })}
        placeholder="Buscar lead, telefone ou veiculo"
        value={filters.query}
      />
      <div className="crm-campaign-audience-filters">
        <CrmSelect
          ariaLabel="Filtrar leads por status"
          onChange={(status) =>
            onChange({
              ...filters,
              status: status as CampaignLeadFilters["status"],
            })
          }
          options={leadStatusOptions}
          value={filters.status}
        />
        <CrmSelect
          ariaLabel="Filtrar leads por origem"
          onChange={(source) =>
            onChange({
              ...filters,
              source: source as CampaignLeadFilters["source"],
            })
          }
          options={leadSourceOptions}
          value={filters.source}
        />
      </div>
    </>
  );
}

function SearchField({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="crm-campaign-search">
      <Search aria-hidden="true" />
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}

const leadStatusOptions = [
  { label: "Todos os status", value: "all" },
  { label: "Novo", value: "new" },
  { label: "Contatado", value: "contacted" },
  { label: "Qualificado", value: "qualified" },
  { label: "Negociando", value: "negotiating" },
  { label: "Ganho", value: "won" },
  { label: "Perdido", value: "lost" },
  { label: "Arquivado", value: "archived" },
];

const leadSourceOptions = [
  { label: "Todas as origens", value: "all" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Site publico", value: "public_site" },
  { label: "CRM", value: "crm" },
  { label: "Manual", value: "manual" },
  { label: "OLX", value: "olx" },
  { label: "API externa", value: "external_api" },
  { label: "Outra", value: "other" },
];
