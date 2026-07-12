export type VehicleStoreBranding = {
  address: string | null;
  contactLine: string | null;
  document: string | null;
  email: string | null;
  name: string;
  phone: string | null;
};

export type VehicleStoreBrandingReader = {
  findByStore: (input: {
    storeId: string;
    tenantId: string;
  }) => Promise<VehicleStoreBranding | null>;
};
