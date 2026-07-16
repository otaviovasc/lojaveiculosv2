import type { LeadCreateFullState } from "./CrmLeadCreateTypes";
import { formatBrazilianZipCode } from "../../lib/masks";
import {
  CrmCreateField,
  CrmCreateInput,
  CrmCreateSection,
} from "./CrmLeadCreateParts";

type AddressSectionProps = {
  onChange: (updates: Partial<LeadCreateFullState>) => void;
  state: LeadCreateFullState;
};

export function CrmLeadCreateAddressSection({
  onChange,
  state,
}: AddressSectionProps) {
  return (
    <CrmCreateSection title="Endereco">
      <div className="crm-client-form-grid">
        <div className="crm-client-pair">
          <CrmCreateField label="CEP">
            <CrmCreateInput
              inputMode="numeric"
              onChange={(event) =>
                onChange({ cep: formatBrazilianZipCode(event.target.value) })
              }
              placeholder="00000-000"
              type="text"
              value={state.cep}
            />
          </CrmCreateField>
          <CrmCreateField label="Pais">
            <CrmCreateInput
              onChange={(event) => onChange({ pais: event.target.value })}
              value={state.pais}
            />
          </CrmCreateField>
        </div>
        <div className="crm-client-pair crm-client-wide">
          <CrmCreateField label="Logradouro">
            <CrmCreateInput
              onChange={(event) => onChange({ logradouro: event.target.value })}
              placeholder="Rua, avenida, etc."
              type="text"
              value={state.logradouro}
            />
          </CrmCreateField>
          <CrmCreateField label="Numero">
            <CrmCreateInput
              onChange={(event) => onChange({ numero: event.target.value })}
              placeholder="123"
              type="text"
              value={state.numero}
            />
          </CrmCreateField>
        </div>
        <CrmCreateField label="Complemento">
          <CrmCreateInput
            onChange={(event) => onChange({ complemento: event.target.value })}
            placeholder="Apto, sala, etc."
            type="text"
            value={state.complemento}
          />
        </CrmCreateField>
        <CrmCreateField label="Bairro">
          <CrmCreateInput
            onChange={(event) => onChange({ bairro: event.target.value })}
            type="text"
            value={state.bairro}
          />
        </CrmCreateField>
        <div className="crm-client-pair crm-client-wide">
          <CrmCreateField label="Cidade">
            <CrmCreateInput
              onChange={(event) => onChange({ cidade: event.target.value })}
              type="text"
              value={state.cidade}
            />
          </CrmCreateField>
          <CrmCreateField label="Estado">
            <CrmCreateInput
              onChange={(event) => onChange({ estado: event.target.value })}
              placeholder="SP"
              type="text"
              value={state.estado}
            />
          </CrmCreateField>
        </div>
      </div>
    </CrmCreateSection>
  );
}
