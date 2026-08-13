import type {
  CredereFipeResolution,
  CredereRequiredFields,
  CredereSimulationDraft,
  CredereUsableBank,
} from "./types";

export type SimulationPrefill = {
  applicantName?: string;
  channel?: string;
  credereVehicleModelId?: string;
  cpfCnpj?: string;
  email?: string;
  fipeCode?: string;
  leadId?: string;
  listingId?: string;
  licensingCity?: string;
  licensingUf?: string;
  manufactureYear?: number;
  modelYear?: number;
  molicarCode?: string;
  phone?: string;
  unitId?: string;
  vehicleValueCents?: number;
  zeroKm?: boolean;
};

export type SimulationFormProps = {
  banks: readonly CredereUsableBank[];
  isSubmitting: boolean;
  onGetRequiredFields: (input: {
    bankCodes?: readonly string[] | undefined;
    cpfCnpj: string;
  }) => Promise<CredereRequiredFields>;
  onResolveFipe: (input: {
    fipeCode: string;
    modelYear: number;
    selectedModelId?: string;
    selectedMolicarCode?: string;
  }) => Promise<CredereFipeResolution>;
  onSubmit: (draft: CredereSimulationDraft) => void | Promise<void>;
  prefill?: SimulationPrefill | undefined;
  submitError: string | null;
};
