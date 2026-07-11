import type { LeadCreateFullState } from "./CrmLeadCreateTypes";
import {
  CrmCreateField,
  CrmCreateDateField,
  CrmCreateInput,
  CrmCreateSection,
  CrmCreateSelect,
} from "./CrmLeadCreateParts";

type MainSectionProps = {
  onChange: (updates: Partial<LeadCreateFullState>) => void;
  state: LeadCreateFullState;
};

const personTypes = [
  { label: "Pessoa Fisica", value: "PF" },
  { label: "Pessoa Juridica", value: "PJ" },
] as const;
const storeOptions = [
  { label: "Nenhuma loja", value: "" },
  { label: "Loja principal", value: "principal" },
];
const genderOptions = [
  { label: "Selecione", value: "" },
  { label: "Masculino", value: "M" },
  { label: "Feminino", value: "F" },
];
const maritalStatusOptions = [
  { label: "Selecione", value: "" },
  { label: "Solteiro(a)", value: "solteiro" },
  { label: "Casado(a)", value: "casado" },
];

export function CrmLeadCreateMainSection({
  onChange,
  state,
}: MainSectionProps) {
  return (
    <CrmCreateSection title="Dados principais">
      <div className="flex gap-2">
        {personTypes.map((option) => (
          <button
            className={
              state.personType === option.value
                ? "crm-chip crm-chip-active"
                : "crm-chip"
            }
            key={option.value}
            onClick={() => onChange({ personType: option.value })}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="crm-client-form-grid">
        <CrmCreateField label="Nome completo *">
          <CrmCreateInput
            onChange={(event) => onChange({ buyerName: event.target.value })}
            placeholder="Ex: Joao da Silva"
            type="text"
            value={state.buyerName}
          />
        </CrmCreateField>
        <CrmCreateField label="Nome de exibicao">
          <CrmCreateInput
            onChange={(event) => onChange({ displayName: event.target.value })}
            placeholder="Como prefere ser chamado"
            type="text"
            value={state.displayName}
          />
        </CrmCreateField>
        <CrmCreateField label="Loja">
          <CrmCreateSelect
            onChange={(loja) => onChange({ loja })}
            options={storeOptions}
            value={state.loja}
          />
        </CrmCreateField>
        <div className="crm-client-pair">
          <CrmCreateField label="CPF *">
            <CrmCreateInput
              onChange={(event) => onChange({ cpf: event.target.value })}
              placeholder="000.000.000-00"
              type="text"
              value={state.cpf}
            />
          </CrmCreateField>
          <CrmCreateField label="RG">
            <CrmCreateInput
              onChange={(event) => onChange({ rg: event.target.value })}
              placeholder="Ex: 00.000.000-0"
              type="text"
              value={state.rg}
            />
          </CrmCreateField>
        </div>
        <div className="crm-client-pair">
          <CrmCreateField label="Passaporte">
            <CrmCreateInput
              onChange={(event) => onChange({ passaporte: event.target.value })}
              placeholder="BR000000"
              type="text"
              value={state.passaporte}
            />
          </CrmCreateField>
          <CrmCreateField label="Data de nascimento">
            <CrmCreateDateField
              label="Nascimento"
              onChange={(dataNascimento) => onChange({ dataNascimento })}
              value={state.dataNascimento}
            />
          </CrmCreateField>
        </div>
        <div className="crm-client-pair">
          <CrmCreateField label="Genero">
            <CrmCreateSelect
              onChange={(genero) => onChange({ genero })}
              options={genderOptions}
              value={state.genero}
            />
          </CrmCreateField>
          <CrmCreateField label="Estado civil">
            <CrmCreateSelect
              onChange={(estadoCivil) => onChange({ estadoCivil })}
              options={maritalStatusOptions}
              value={state.estadoCivil}
            />
          </CrmCreateField>
        </div>
        <CrmCreateField label="Nacionalidade">
          <CrmCreateInput
            onChange={(event) =>
              onChange({ nacionalidade: event.target.value })
            }
            placeholder="Brasil"
            type="text"
            value={state.nacionalidade}
          />
        </CrmCreateField>
        <CrmCreateField label="Profissao">
          <CrmCreateInput
            onChange={(event) => onChange({ profissao: event.target.value })}
            placeholder="Ex: Engenheiro(a)"
            type="text"
            value={state.profissao}
          />
        </CrmCreateField>
      </div>
    </CrmCreateSection>
  );
}
