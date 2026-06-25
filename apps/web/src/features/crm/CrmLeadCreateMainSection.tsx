import type { LeadCreateFullState } from "./CrmLeadCreateTypes";
import {
  CrmCreateField,
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
            onChange={(event) => onChange({ loja: event.target.value })}
            value={state.loja}
          >
            <option value="">Nenhuma loja</option>
            <option value="principal">Loja principal</option>
          </CrmCreateSelect>
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
            <CrmCreateInput
              onChange={(event) =>
                onChange({ dataNascimento: event.target.value })
              }
              type="date"
              value={state.dataNascimento}
            />
          </CrmCreateField>
        </div>
        <div className="crm-client-pair">
          <CrmCreateField label="Genero">
            <CrmCreateSelect
              onChange={(event) => onChange({ genero: event.target.value })}
              value={state.genero}
            >
              <option value="">Selecione</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </CrmCreateSelect>
          </CrmCreateField>
          <CrmCreateField label="Estado civil">
            <CrmCreateSelect
              onChange={(event) =>
                onChange({ estadoCivil: event.target.value })
              }
              value={state.estadoCivil}
            >
              <option value="">Selecione</option>
              <option value="solteiro">Solteiro(a)</option>
              <option value="casado">Casado(a)</option>
            </CrmCreateSelect>
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
