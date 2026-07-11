import type { LeadCreateFullState } from "./CrmLeadCreateTypes";
import {
  CrmCreateField,
  CrmCreateInput,
  CrmCreateSection,
  CrmCreateSelect,
  CrmCreateTextarea,
  CrmCreateToggle,
} from "./CrmLeadCreateParts";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { CrmLeadSource } from "./productCrmTypes";

type SidebarSectionProps = {
  onChange: (updates: Partial<LeadCreateFullState>) => void;
  state: LeadCreateFullState;
  vehicleOptions: LeadVehicleOption[];
};

const segmentOptions = [
  { label: "Regular", value: "Regular" },
  { label: "VIP", value: "VIP" },
  { label: "Bronze", value: "Bronze" },
  { label: "Prata", value: "Prata" },
  { label: "Ouro", value: "Ouro" },
];
const sourceOptions: Array<{ label: string; value: CrmLeadSource }> = [
  { label: "Manual", value: "manual" },
  { label: "Site", value: "public_site" },
  { label: "CRM", value: "crm" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "OLX", value: "olx" },
  { label: "API externa", value: "external_api" },
  { label: "Outro", value: "other" },
];

export function CrmLeadCreateSidebarSection({
  onChange,
  state,
  vehicleOptions,
}: SidebarSectionProps) {
  return (
    <div className="crm-client-column">
      <CrmCreateSection title="Contatos">
        <div className="crm-client-column">
          <CrmCreateField label="E-mail">
            <CrmCreateInput
              onChange={(event) => onChange({ buyerEmail: event.target.value })}
              placeholder="email@exemplo.com"
              type="email"
              value={state.buyerEmail}
            />
          </CrmCreateField>
          <CrmCreateField label="Telefone fixo">
            <CrmCreateInput
              onChange={(event) =>
                onChange({ telefoneFixo: event.target.value })
              }
              placeholder="Digite o telefone"
              type="text"
              value={state.telefoneFixo}
            />
          </CrmCreateField>
          <CrmCreateField label="Celular">
            <CrmCreateInput
              onChange={(event) => onChange({ buyerPhone: event.target.value })}
              placeholder="Digite o celular"
              type="text"
              value={state.buyerPhone}
            />
          </CrmCreateField>
          <CrmCreateField label="WhatsApp">
            <CrmCreateInput
              onChange={(event) => onChange({ whatsapp: event.target.value })}
              placeholder="Digite o WhatsApp"
              type="text"
              value={state.whatsapp}
            />
          </CrmCreateField>
        </div>
      </CrmCreateSection>

      <CrmCreateSection title="Informacoes comerciais">
        <div className="crm-client-column">
          <CrmCreateField label="Segmento do cliente">
            <CrmCreateSelect
              onChange={(segmento) => onChange({ segmento })}
              options={segmentOptions}
              value={state.segmento}
            />
          </CrmCreateField>
          <CrmCreateField label="Origem do cliente">
            <CrmCreateSelect
              onChange={(source) =>
                onChange({ source: source as CrmLeadSource })
              }
              options={sourceOptions}
              value={state.source}
            />
          </CrmCreateField>
          <CrmCreateField label="Veiculo de interesse">
            <CrmCreateSelect
              onChange={(listingId) => onChange({ listingId })}
              options={[
                { label: "Selecione um veículo", value: "" },
                ...vehicleOptions.map((vehicle) => ({
                  label: `${vehicle.label} (${vehicle.detail})`,
                  value: vehicle.id,
                })),
              ]}
              value={state.listingId}
            />
          </CrmCreateField>
          <CrmCreateField label="Limite de credito">
            <CrmCreateInput
              onChange={(event) =>
                onChange({ limiteCredito: event.target.value })
              }
              placeholder="R$ 0,00"
              type="text"
              value={state.limiteCredito}
            />
          </CrmCreateField>
          <CrmCreateToggle
            checked={state.isActiveLead}
            label="Cliente ativo"
            onChange={(isActiveLead) => onChange({ isActiveLead })}
          />
          <CrmCreateToggle
            checked={state.isVerified}
            label="Verificado"
            onChange={(isVerified) => onChange({ isVerified })}
          />
          <CrmCreateField label="Observacoes internas">
            <CrmCreateTextarea
              onChange={(event) => onChange({ obs: event.target.value })}
              placeholder="Informacoes adicionais sobre o cliente"
              value={state.obs}
            />
          </CrmCreateField>
        </div>
      </CrmCreateSection>
    </div>
  );
}
