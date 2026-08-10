import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { createCrmConnectionCredentialVault } from "./crmConnectionCredentialVault.js";

const scope = {
  purpose: "zapi.instance-token",
  storeId: "store_1" as StoreId,
  tenantId: "tenant_1" as TenantId,
};

describe("createCrmConnectionCredentialVault", () => {
  it("seals credentials with scoped AES-256-GCM encryption", async () => {
    const vault = createCrmConnectionCredentialVault({
      CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY: "test-only-key",
    });

    const sealed = await vault.seal({
      ...scope,
      plaintext: "instance-secret",
    });

    expect(sealed).toMatch(/^crm:v1\./u);
    expect(sealed).not.toContain("instance-secret");
    await expect(vault.open({ ...scope, sealed })).resolves.toBe(
      "instance-secret",
    );
  });

  it("rejects ciphertext moved to another store or purpose", async () => {
    const vault = createCrmConnectionCredentialVault({
      CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY: "test-only-key",
    });
    const sealed = await vault.seal({
      ...scope,
      plaintext: "instance-secret",
    });

    await expect(
      vault.open({
        ...scope,
        purpose: "another-purpose",
        sealed,
      }),
    ).rejects.toMatchObject({ code: "configuration_error" });
    await expect(
      vault.open({
        ...scope,
        sealed,
        storeId: "store_2" as StoreId,
      }),
    ).rejects.toThrow("could not be decrypted");
  });

  it("fails closed when the encryption key is absent", () => {
    expect(() => createCrmConnectionCredentialVault({})).toThrow(
      "credential encryption is not configured",
    );
  });
});
