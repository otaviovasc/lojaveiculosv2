export type FinancingFipeVehicleCandidate = {
  available: boolean;
  brand: string | null;
  fipeCode: string | null;
  fuelType: string | null;
  id: string;
  molicarCode: string | null;
  name: string | null;
  version: string | null;
  yearEnd: number | null;
  yearStart: number | null;
};

export type FinancingFipeVehicleLookupInput = {
  fipeCode: string;
  modelYear: number;
};
