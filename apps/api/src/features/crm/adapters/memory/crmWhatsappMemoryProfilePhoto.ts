import type { UpsertCrmWhatsappSessionContextInput } from "../../../../domains/crm/ports/crmWhatsappRepository.js";

export function memoryProfilePhotoMetadata(
  input: UpsertCrmWhatsappSessionContextInput,
) {
  return input.profilePhotoStorageKey
    ? { profilePhoto: { storageKey: input.profilePhotoStorageKey } }
    : {};
}
