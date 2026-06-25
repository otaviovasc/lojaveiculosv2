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
              onChange={(event) => onChange({ segmento: event.target.value })}
              value={state.segmento}
            >
              <option value="Regular">Regular</option>
              <option value="VIP">VIP</option>
              <option value="Bronze">Bronze</option>
              <option value="Prata">Prata</option>
              <option value="Ouro">Ouro</option>
            </CrmCreateSelect>
          </CrmCreateField>
          <CrmCreateField label="Origem do cliente">
            <CrmCreateSelect
              onChange={(event) =>
                onChange({ source: event.target.value as CrmLeadSource })
              }
              value={state.source}
            >
              <option value="manual">Manual</option>
              <option value="public_site">Site</option>
              <option value="crm">CRM</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="olx">OLX</option>
              <option value="external_api">API externa</option>
              <option value="other">Outro</option>
            </CrmCreateSelect>
          </CrmCreateField>
          <CrmCreateField label="Veiculo de interesse">
            <CrmCreateSelect
              onChange={(event) => onChange({ listingId: event.target.value })}
              value={state.listingId}
            >
              <option value="">Selecione um veiculo</option>
              {vehicleOptions.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.label} ({vehicle.detail})
                </option>
              ))}
            </CrmCreateSelect>
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
