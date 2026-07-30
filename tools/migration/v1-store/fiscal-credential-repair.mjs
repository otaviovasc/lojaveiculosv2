import {
  decryptSpedyCredential,
  encryptSpedyCredential,
} from "./spedy-fiscal-client.mjs";

export function prepareFiscalCredentialRepair(
  currentCiphertext,
  oldEncodedKey,
  targetEncodedKey,
) {
  try {
    decryptSpedyCredential(currentCiphertext, targetEncodedKey);
    return {
      alreadyUsesTargetKey: true,
      credentialCiphertext: currentCiphertext,
    };
  } catch {
    const plaintext = decryptSpedyCredential(currentCiphertext, oldEncodedKey);
    const credentialCiphertext = encryptSpedyCredential(
      plaintext,
      targetEncodedKey,
    );
    if (
      decryptSpedyCredential(credentialCiphertext, targetEncodedKey) !==
      plaintext
    ) {
      throw new Error("Fiscal credential repair verification failed.");
    }
    return { alreadyUsesTargetKey: false, credentialCiphertext };
  }
}

export function assertFiscalCredentialRepairSafety(config) {
  const target = new URL(config.targetUrl);
  const local = ["127.0.0.1", "localhost", "::1"].includes(target.hostname);
  if (!local && !config.allowRemoteTarget) {
    throw new Error(
      "Remote target blocked. Pass --allow-remote-target deliberately.",
    );
  }
  if (config.apply && config.confirmStoreId !== config.storeId) {
    throw new Error(
      "--confirm-store-id must exactly match --store-id when --apply is used.",
    );
  }
}
