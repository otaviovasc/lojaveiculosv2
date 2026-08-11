import type {
  CrmProviderWebhookEvent,
  CrmProviderWebhookEventProvider,
} from "../../../../domains/crm/ports/crmWebhookEventRepository.js";

export function matchesMemoryWebhookEventScope(
  event: CrmProviderWebhookEvent,
  input: { eventId: string; storeId: string; tenantId: string },
) {
  return (
    event.id === input.eventId &&
    event.storeId === input.storeId &&
    event.tenantId === input.tenantId
  );
}

export function matchesMemoryWebhookEventList(
  event: CrmProviderWebhookEvent,
  input: {
    connectionId?: string | null;
    eventType?: string;
    provider?: CrmProviderWebhookEventProvider;
    status?: string;
    storeId: string;
    tenantId: string;
  },
) {
  if (event.storeId !== input.storeId) return false;
  if (event.tenantId !== input.tenantId) return false;
  if (input.connectionId && event.connectionId !== input.connectionId)
    return false;
  if (input.eventType && event.eventType !== input.eventType) return false;
  if (input.provider && event.provider !== input.provider) return false;
  if (input.status && event.status !== input.status) return false;
  return true;
}
