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

export const maskCPF = (value: string) =>
  value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2");

export const maskCEP = (value: string) =>
  value
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");

export const maskPhone = (value: string) =>
  value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
