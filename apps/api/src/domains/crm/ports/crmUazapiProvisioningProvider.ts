/**
 * Server-provisioned UAZAPI instance lifecycle. Unlike Z-API (BYOK), uazapi
 * connections are created through the provider admin API and must be
 * compensation-deleted when the local connection cannot be persisted.
 */
export type CrmUazapiProvisioningProvider = {
  createInstance: (input: {
    adminField01?: string;
    adminField02?: string;
    name: string;
  }) => Promise<{
    baseUrl: string;
    instanceId: string;
    instanceToken: string;
  }>;
  deleteInstance: (input: {
    baseUrl: string;
    instanceId: string;
  }) => Promise<void>;
};
