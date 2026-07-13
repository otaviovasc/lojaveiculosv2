import { Search } from "lucide-react";
import { CrmSelect } from "./CrmFormControls";
import type {
  CampaignAudienceSource,
  CampaignLeadFilters,
} from "./crmWhatsappCampaignSources";
import type { CrmWhatsappTag } from "./crmWhatsappTypes";

export function CampaignAudienceFilters({
  audienceSource,
  leadFilters,
  onAudienceSourceChange,
  onLeadFiltersChange,
  onQueryChange,
  onTagChange,
  query,
  selectedTagId,
  tags,
}: {
  audienceSource: CampaignAudienceSource;
  leadFilters: CampaignLeadFilters;
  onAudienceSourceChange: (value: CampaignAudienceSource) => void;
  onLeadFiltersChange: (value: CampaignLeadFilters) => void;
  onQueryChange: (value: string) => void;
  onTagChange: (value: string) => void;
  query: string;
  selectedTagId: string;
  tags: CrmWhatsappTag[];
}) {
  return (
    <>
      <div
        aria-label="Origem dos destinatarios"
        className="crm-whatsapp-campaign-source-tabs"
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
        <ConversationFilters
          onQueryChange={onQueryChange}
          onTagChange={onTagChange}
          query={query}
          selectedTagId={selectedTagId}
          tags={tags}
        />
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
  onTagChange,
  query,
  selectedTagId,
  tags,
}: {
  onQueryChange: (value: string) => void;
  onTagChange: (value: string) => void;
  query: string;
  selectedTagId: string;
  tags: CrmWhatsappTag[];
}) {
  return (
    <>
      <SearchField
        onChange={onQueryChange}
        placeholder="Buscar conversa ou telefone"
        value={query}
      />
      <CrmSelect
        ariaLabel="Filtrar por tag"
        onChange={onTagChange}
        options={[
          { label: "Todas as tags", value: "all" },
          ...tags.map((tag) => ({ label: tag.name, value: tag.id })),
        ]}
        value={selectedTagId}
      />
    </>
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
      <div className="crm-whatsapp-campaign-audience-filters">
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
    <div className="crm-whatsapp-campaign-search">
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
