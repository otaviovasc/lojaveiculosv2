export type StoreData = {
  nome?: string | undefined;
  cnpj?: string | undefined;
  endereco?: string | undefined;
  cidade?: string | undefined;
  estado?: string | undefined;
  telefone?: string | undefined;
  logoUrl?: string | null | undefined;
};

export type InventoryStoreSettings = {
  identity?: {
    primaryDomain?: string | null;
    tradingName?: string | null;
  } | null;
  profile?: {
    addressCity?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    addressState?: string | null;
    contactPhone?: string | null;
    documentNumber?: string | null;
    logoImageUrl?: string | null;
    whatsappPhone?: string | null;
  } | null;
  publicSite?: {
    customDomain?: string | null;
    theme?: {
      primaryColor?: string | null;
    } | null;
  } | null;
} | null;

export function storeDataFromSettings(
  storeSettings: InventoryStoreSettings,
): StoreData {
  return {
    nome: storeSettings?.identity?.tradingName ?? undefined,
    cnpj: storeSettings?.profile?.documentNumber ?? undefined,
    endereco: [
      storeSettings?.profile?.addressLine1,
      storeSettings?.profile?.addressLine2,
    ]
      .filter(Boolean)
      .join(", "),
    cidade: storeSettings?.profile?.addressCity ?? undefined,
    estado: storeSettings?.profile?.addressState ?? undefined,
    telefone:
      storeSettings?.profile?.whatsappPhone ??
      storeSettings?.profile?.contactPhone ??
      undefined,
    logoUrl: storeSettings?.profile?.logoImageUrl ?? undefined,
  };
}

export type VehicleData = {
  title: string;
  brand: string;
  model: string;
  version?: string | undefined;
  yearModel?: string | number | undefined;
  yearFabrication?: string | number | undefined;
  plate?: string | null | undefined;
  km?: number | string | undefined;
  color?: string | undefined;
  chassi?: string | undefined;
  renavam?: string | undefined;
};

export type DriverData = {
  name: string;
  cpf: string;
  rg?: string | undefined;
  phone: string;
  address?: string | undefined;
  number?: string | undefined;
  neighborhood?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  driverLicense?: string | undefined;
  email?: string | undefined;
};
