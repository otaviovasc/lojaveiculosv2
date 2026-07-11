import { Upload } from "lucide-react";
import type { LeadCreateFullState } from "./CrmLeadCreateTypes";
import {
  CrmCreateField,
  CrmCreateInput,
  CrmCreateSection,
  CrmCreateSelect,
} from "./CrmLeadCreateParts";

type FinanceSectionProps = {
  onChange: (updates: Partial<LeadCreateFullState>) => void;
  state: LeadCreateFullState;
};

const pixCategoryOptions = [
  { label: "Nenhuma", value: "Nenhuma" },
  { label: "CPF", value: "CPF" },
  { label: "CNPJ", value: "CNPJ" },
  { label: "E-mail", value: "Email" },
  { label: "Celular", value: "Celular" },
  { label: "Chave aleatoria", value: "Aleatoria" },
];

export function CrmLeadCreateFinanceSection({
  onChange,
  state,
}: FinanceSectionProps) {
  return (
    <div className="crm-client-column">
      <CrmCreateSection title="Dados financeiros">
        <div className="crm-client-form-grid">
          <CrmCreateField label="Banco">
            <CrmCreateInput
              onChange={(event) => onChange({ banco: event.target.value })}
              placeholder="Ex: Banco do Brasil"
              type="text"
              value={state.banco}
            />
          </CrmCreateField>
          <CrmCreateField label="Agencia">
            <CrmCreateInput
              onChange={(event) => onChange({ agencia: event.target.value })}
              placeholder="0001"
              type="text"
              value={state.agencia}
            />
          </CrmCreateField>
          <CrmCreateField label="Conta">
            <CrmCreateInput
              onChange={(event) => onChange({ conta: event.target.value })}
              placeholder="00000-0"
              type="text"
              value={state.conta}
            />
          </CrmCreateField>
          <CrmCreateField label="Categoria PIX">
            <CrmCreateSelect
              onChange={(pixCategory) => onChange({ pixCategory })}
              options={pixCategoryOptions}
              value={state.pixCategory}
            />
          </CrmCreateField>
          <CrmCreateField className="crm-client-wide" label="Chave PIX">
            <CrmCreateInput
              onChange={(event) => onChange({ pixKey: event.target.value })}
              placeholder="Digite a chave PIX"
              type="text"
              value={state.pixKey}
            />
          </CrmCreateField>
        </div>
      </CrmCreateSection>

      <CrmCreateSection title="Anexos">
        <div className="crm-client-upload">
          <Upload aria-hidden="true" className="size-8 text-muted" />
          <p className="crm-client-upload-help">
            Documentos do cliente ainda nao foram vinculados.
          </p>
        </div>
        <p className="crm-client-upload-empty">Nenhum anexo adicionado</p>
      </CrmCreateSection>
    </div>
  );
}
