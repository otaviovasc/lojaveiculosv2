export type AuditActorKind = "user" | "system" | "public" | "integration";

export type AuditActorReference = {
  displayName?: string;
  externalId?: string;
  id: string;
  kind: AuditActorKind;
};

export type AuditActor = AuditActorReference & {
  impersonatedBy?: AuditActorReference;
};

export type AuditCategory =
  | "authentication"
  | "authorization"
  | "data_access"
  | "data_change"
  | "integration"
  | "system";

export type AuditCriticality = "low" | "medium" | "high" | "critical";

export type AuditDataClassification =
  "public" | "internal" | "confidential" | "restricted";

export type AuditOutcome = "attempted" | "succeeded" | "failed" | "denied";

export type AuditSeverity = "debug" | "info" | "warning" | "error" | "critical";

export type AuditProviderReference = {
  deliveryId?: string;
  eventId?: string;
  name: string;
  requestId?: string;
};

export type AuditSource = {
  component?: string;
  environment?: string;
  region?: string;
  service: string;
  version?: string;
};

export type AuditEntityReference = {
  displayName?: string;
  id: string;
  type: string;
};

export type SafeAuditMetadataValue =
  | boolean
  | null
  | number
  | string
  | readonly SafeAuditMetadataValue[]
  | { readonly [key: string]: SafeAuditMetadataValue };

export type SafeAuditMetadata = {
  readonly [key: string]: SafeAuditMetadataValue;
};

export type AuditRequestContext = {
  causationId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  ipAddress?: string;
  method?: string;
  path?: string;
  requestId: string;
  userAgent?: string;
};

export type AuditFieldChange = {
  after?: SafeAuditMetadataValue;
  before?: SafeAuditMetadataValue;
  path: string;
};

export type AuditFailureTier = "best_effort" | "important" | "required";

export type AuditEvent = {
  action: string;
  actor: AuditActor;
  category?: AuditCategory;
  changes?: readonly AuditFieldChange[];
  correlationId?: string;
  criticality?: AuditCriticality;
  dataClassification?: AuditDataClassification;
  entityId: string;
  entityType: string;
  failureTier?: AuditFailureTier;
  metadata?: SafeAuditMetadata;
  occurredAt?: Date | string;
  outcome?: AuditOutcome;
  provider?: AuditProviderReference;
  relatedEntities?: readonly AuditEntityReference[];
  request?: AuditRequestContext;
  requestId: string;
  schemaVersion?: 1;
  severity?: AuditSeverity;
  source?: AuditSource;
  storeId: string | null;
  summary?: string;
  tags?: readonly string[];
  target?: AuditEntityReference;
  tenantId: string | null;
};

export type AuditSink = {
  record: (event: AuditEvent) => Promise<void>;
};
