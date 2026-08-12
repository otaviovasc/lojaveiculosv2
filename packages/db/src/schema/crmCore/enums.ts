import { pgEnum } from "drizzle-orm/pg-core";

export const messagingChannel = pgEnum("messaging_channel", [
  "whatsapp",
  "instagram",
  "olx_chat",
]);
export const transportProvider = pgEnum("transport_provider", [
  "meta_cloud",
  "zapi",
  "olx",
]);
export const credentialBroker = pgEnum("credential_broker", [
  "composio",
  "direct",
]);
export const integrationCapability = pgEnum("integration_capability", [
  "messaging",
  "lead_ingestion",
  "inventory_sync",
]);
export const acquisitionSource = pgEnum("acquisition_source", [
  "olx",
  "meta_ad",
  "mobiauto",
  "site",
  "manual",
]);
export const workflowProvider = pgEnum("workflow_provider", [
  "credere",
  "external_bot",
]);
export const contactIdentityState = pgEnum("contact_identity_state", [
  "observed",
  "candidate",
  "verified",
  "disputed",
  "superseded",
]);
export const contactIdentityKind = pgEnum("contact_identity_kind", [
  "phone",
  "email",
  "provider_subject",
  "chat_lid",
]);
export const authorizationState = pgEnum("external_authorization_state", [
  "pending",
  "authorized",
  "restricted",
  "revoked",
  "error",
]);
export const capabilityGrantState = pgEnum("capability_grant_state", [
  "pending",
  "granted",
  "partial",
  "denied",
  "revoked",
]);
export const scopeGrantState = pgEnum("scope_grant_state", [
  "pending",
  "granted",
  "partial",
  "denied",
  "revoked",
]);
export const providerConnectionState = pgEnum("provider_connection_state", [
  "sandbox",
  "active",
  "paused",
  "disconnected",
  "error",
  "archived",
]);
export const conversationThreadState = pgEnum("conversation_thread_state", [
  "open",
  "resolved",
  "archived",
]);
export const conversationCycleState = pgEnum("conversation_cycle_state", [
  "active",
  "completed",
  "expired",
]);
export const conversationAttendanceState = pgEnum(
  "conversation_attendance_state",
  [
    "bot_active",
    "handoff_requested",
    "human_claimed",
    "human_active",
    "handback_pending",
  ],
);
export const canonicalMessageDirection = pgEnum("canonical_message_direction", [
  "inbound",
  "outbound",
]);
export const canonicalMessageStatus = pgEnum("canonical_message_status", [
  "pending",
  "sent",
  "delivered",
  "read",
  "failed",
]);
export const canonicalMessageSender = pgEnum("canonical_message_sender", [
  "customer",
  "human",
  "bot",
  "system",
  "unknown",
]);
export const opportunityState = pgEnum("opportunity_state", [
  "open",
  "won",
  "lost",
  "cancelled",
]);
export const consentReceiptState = pgEnum("consent_receipt_state", [
  "granted",
  "withdrawn",
  "expired",
  "denied",
]);
export const factProposalState = pgEnum("fact_proposal_state", [
  "pending",
  "approved",
  "rejected",
  "superseded",
]);
export const botGrantState = pgEnum("bot_integration_grant_state", [
  "issued",
  "consumed",
  "revoked",
  "expired",
]);
export const integrationEventState = pgEnum("integration_event_state", [
  "received",
  "processing",
  "processed",
  "failed",
  "ignored",
]);
export const botActionCommandState = pgEnum("bot_action_command_state", [
  "accepted",
  "authorized",
  "claimed",
  "executing",
  "provider_succeeded",
  "completed",
  "retryable_failed",
  "indeterminate",
  "dead_letter",
  "cancelled",
]);
export const botAuthorizationClass = pgEnum("bot_authorization_class", [
  "automatic",
  "proposal_only",
  "human_approved",
]);
export const providerEffectState = pgEnum("provider_effect_state", [
  "accepted",
  "authorized",
  "claimed",
  "executing",
  "provider_succeeded",
  "completed",
  "retryable_failed",
  "indeterminate",
  "dead_letter",
  "cancelled",
]);
export const crmCoreMigrationFindingKind = pgEnum(
  "crm_core_migration_finding_kind",
  [
    "orphan",
    "collision",
    "ambiguous_identity",
    "message_without_thread",
    "cross_store",
    "provider_divergence",
    "summary",
  ],
);
