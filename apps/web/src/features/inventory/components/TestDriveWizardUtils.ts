import type { DriverData } from "./TestDriveWizardTypes";

export function createEmptyDriver(): DriverData {
  return {
    name: "",
    email: "",
    phone: "",
    cpf: "",
    rg: "",
    cep: "",
    address: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    driverLicense: "",
  };
}

export function getCurrentDepartureTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
