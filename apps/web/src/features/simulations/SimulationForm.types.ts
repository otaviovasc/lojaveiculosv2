import type { SimulationSummarySidebarProps } from "./SimulationSummarySidebar";
import type {
  CredereFipeResolution,
  CredereRequiredFields,
  CredereSimulationDraft,
  CredereUsableBank,
} from "./types";

export type SimulationPrefill = {
  applicantName?: string | undefined;
  channel?: string | undefined;
  credereVehicleModelId?: string | undefined;
  cpfCnpj?: string | undefined;
  email?: string | undefined;
  fipeCode?: string | undefined;
  leadId?: string | undefined;
  listingId?: string | undefined;
  licensingCity?: string | undefined;
  licensingUf?: string | undefined;
  manufactureYear?: number | undefined;
  modelYear?: number | undefined;
  molicarCode?: string | undefined;
  phone?: string | undefined;
  unitId?: string | undefined;
  vehiclePlate?: string | undefined;
  vehiclePriceCents?: number | undefined;
  vehicleTitle?: string | undefined;
  vehicleValueCents?: number | undefined;
  zeroKm?: boolean | undefined;
};

export type SimulationSummaryData = SimulationSummarySidebarProps;

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
  onSummaryChange?: (summary: SimulationSummaryData) => void;
  onToast?: (message: string) => void;
  prefill?: SimulationPrefill | undefined;
  submitError: string | null;
};
