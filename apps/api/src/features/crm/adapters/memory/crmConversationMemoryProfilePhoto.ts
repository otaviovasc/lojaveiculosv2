import type { UpsertCrmConversationCycleContextInput } from "../../../../domains/crm/ports/crmConversationRepository.js";

export function memoryProfilePhotoMetadata(
  input: UpsertCrmConversationCycleContextInput,
) {
  return input.profilePhotoStorageKey
    ? { profilePhoto: { storageKey: input.profilePhotoStorageKey } }
    : {};
}
