import { vi } from "vitest";
import type { CrmUazapiProvisioningProvider } from "../../../domains/crm/ports/crmUazapiProvisioningProvider.js";

export function createUazapiProvisioningStub(): CrmUazapiProvisioningProvider & {
  createInstance: ReturnType<typeof vi.fn>;
  listInstances: ReturnType<typeof vi.fn>;
} {
  return {
    createInstance: vi.fn(async ({ name }: { name: string }) => ({
      baseUrl: "https://uazapi.test",
      instanceId: name,
      instanceToken: "instance-token-1",
    })),
    deleteInstance: vi.fn(async () => undefined),
    listInstances: vi.fn(async () => [
      {
        connectedPhone: "5511988880000",
        id: "inst-1",
        name: "Loja A",
        status: "connected",
        token: "server-token-1",
      },
    ]),
  } as CrmUazapiProvisioningProvider & {
    createInstance: ReturnType<typeof vi.fn>;
    listInstances: ReturnType<typeof vi.fn>;
  };
}
