export interface Lead {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface DriverData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  rg: string;
  cep: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  driverLicense: string;
}

export type TestDriveStep = "lead" | "details" | "success";
