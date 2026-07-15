import type {
  AuditActorKind,
  AuditCategory,
  AuditFieldChange,
  AuditOutcome,
} from "@lojaveiculosv2/audit";

export type VehicleAuditEvent = {
  action: string;
  actorId: string;
  actorKind: AuditActorKind;
  category: AuditCategory | null;
  changes: readonly AuditFieldChange[];
  id: string;
  occurredAt: Date;
  outcome: AuditOutcome;
  providerName: string | null;
  summary: string | null;
};

export type VehicleAuditRepository = {
  listByEntityIds: (input: {
    entityIds: readonly string[];
    limit: number;
    storeId: string;
    tenantId: string;
  }) => Promise<readonly VehicleAuditEvent[]>;
};
