import type { CrmLeadSource } from "./productCrmTypes";
import type { LeadCreateDraft } from "./crmPipelineModels";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";

export type LeadCreateFullState = {
  personType: "PF" | "PJ";
  buyerName: string;
  displayName: string;
  loja: string;
  cpf: string;
  rg: string;
  passaporte: string;
  dataNascimento: string;
  genero: string;
  estadoCivil: string;
  nacionalidade: string;
  profissao: string;
  cep: string;
  pais: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  banco: string;
  agencia: string;
  conta: string;
  pixCategory: string;
  pixKey: string;
  buyerEmail: string;
  telefoneFixo: string;
  buyerPhone: string;
  whatsapp: string;
  segmento: string;
  source: CrmLeadSource;
  listingId: string;
  limiteCredito: string;
  isActiveLead: boolean;
  isVerified: boolean;
  obs: string;
};

export type CrmLeadCreateFullPageProps = {
  onCreateLead: (input: LeadCreateDraft) => Promise<void>;
  onCancel: () => void;
  vehicleOptions: LeadVehicleOption[];
};
