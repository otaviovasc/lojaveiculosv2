import { X } from "lucide-react";
import { useState } from "react";
import { CrmLeadCreateAddressSection } from "./CrmLeadCreateAddressSection";
import { CrmLeadCreateFinanceSection } from "./CrmLeadCreateFinanceSection";
import { CrmLeadCreateMainSection } from "./CrmLeadCreateMainSection";
import { CrmLeadCreateSidebarSection } from "./CrmLeadCreateSidebarSection";
import type {
  CrmLeadCreateFullPageProps,
  LeadCreateFullState,
} from "./CrmLeadCreateTypes";
import type { LeadCreateDraft } from "./crmPipelineModels";

export function CrmLeadCreateFullPage({
  onCancel,
  onCreateLead,
  vehicleOptions,
}: CrmLeadCreateFullPageProps) {
  const [state, setState] = useState<LeadCreateFullState>({
    agencia: "",
    bairro: "",
    banco: "",
    buyerEmail: "",
    buyerName: "",
    buyerPhone: "",
    cep: "",
    cidade: "",
    complemento: "",
    conta: "",
    cpf: "",
    dataNascimento: "",
    displayName: "",
    estado: "SP",
    estadoCivil: "",
    genero: "",
    isActiveLead: true,
    isVerified: false,
    limiteCredito: "",
    listingId: "",
    loja: "",
    logradouro: "",
    nacionalidade: "",
    numero: "",
    obs: "",
    pais: "Brasil",
    passaporte: "",
    personType: "PF",
    pixCategory: "Nenhuma",
    pixKey: "",
    profissao: "",
    rg: "",
    segmento: "Regular",
    source: "manual",
    telefoneFixo: "",
    whatsapp: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateState = (updates: Partial<LeadCreateFullState>) => {
    setState((current) => ({ ...current, ...updates }));
  };

  const handleCreate = async () => {
    if (!state.buyerName.trim()) {
      window.alert("Nome completo e obrigatorio.");
      return;
    }

    setIsSaving(true);
    try {
      const draft: LeadCreateDraft = {
        buyerEmail: state.buyerEmail.trim() || null,
        buyerName: state.buyerName.trim(),
        buyerPhone:
          (state.buyerPhone || state.whatsapp || state.telefoneFixo).trim() ||
          null,
        listingId: state.listingId || null,
        source: state.source,
      };
      const initialNote = state.obs.trim();
      if (initialNote) draft.initialNote = initialNote;
      await onCreateLead(draft);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="crm-client-page">
      <header className="crm-client-header">
        <div className="crm-client-breadcrumb">
          <span>Cadastros</span>
          <span>/</span>
          <span>Clientes</span>
          <span>/</span>
          <strong>Novo</strong>
        </div>
        <div className="crm-client-header-row">
          <h2>Novo cliente</h2>
          <div className="crm-client-actions">
            <button
              className="crm-action crm-action-secondary"
              onClick={onCancel}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
              Cancelar
            </button>
            <button
              className="crm-action"
              disabled={isSaving}
              onClick={() => void handleCreate()}
              type="button"
            >
              {isSaving ? "Salvando" : "Cadastrar"}
            </button>
          </div>
        </div>
      </header>

      <div className="crm-client-grid">
        <div className="crm-client-column">
          <CrmLeadCreateMainSection
            onChange={handleUpdateState}
            state={state}
          />
          <CrmLeadCreateAddressSection
            onChange={handleUpdateState}
            state={state}
          />
          <CrmLeadCreateFinanceSection
            onChange={handleUpdateState}
            state={state}
          />
        </div>
        <CrmLeadCreateSidebarSection
          onChange={handleUpdateState}
          state={state}
          vehicleOptions={vehicleOptions}
        />
      </div>
    </div>
  );
}
