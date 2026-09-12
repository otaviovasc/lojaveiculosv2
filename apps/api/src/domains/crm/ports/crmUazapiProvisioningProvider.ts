/**
 * UAZAPI instance lifecycle driven by the store's own admin token (BYOK).
 * The admin token arrives with each request and is sealed per connection in
 * the credential vault; there is no server-wide admin token. Instances can be
 * created through the admin API or attached from the store's existing account.
 * Created instances must be compensation-deleted when the local connection
 * cannot be persisted; attached instances are never deleted by the API.
 */
export type CrmUazapiInstanceSummary = {
  connectedPhone: string | null;
  id: string;
  name: string;
  status: string;
  /** Server-side instance token. Never exposed through HTTP DTOs. */
  token: string;
};

export type CrmUazapiProvisioningProvider = {
  createInstance: (input: {
    adminField01?: string;
    adminField02?: string;
    adminToken: string;
    baseUrl?: string;
    name: string;
  }) => Promise<{
    baseUrl: string;
    instanceId: string;
    instanceToken: string;
  }>;
  deleteInstance: (input: {
    adminToken: string;
    baseUrl?: string;
    instanceId: string;
  }) => Promise<void>;
  listInstances: (input: {
    adminToken: string;
    baseUrl?: string;
  }) => Promise<readonly CrmUazapiInstanceSummary[]>;
};
