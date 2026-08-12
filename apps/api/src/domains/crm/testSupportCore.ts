import { randomUUID } from "node:crypto";
import { CrmCoreRevisionConflictError } from "./core/errors.js";
import type {
  ContactIdentity,
  CrmCoreEntityByResource,
  CrmCoreResource,
} from "./core/models.js";
import type { CrmCoreRepository } from "./ports/crmCoreRepository.js";

type AnyEntity = CrmCoreEntityByResource[CrmCoreResource];
type EntityStores = {
  [R in CrmCoreResource]: Map<string, CrmCoreEntityByResource[R]>;
};

export function createMemoryCrmCoreRepository(): CrmCoreRepository {
  const stores: EntityStores = {
    connections: new Map(),
    consents: new Map(),
    "contact-identities": new Map(),
    contacts: new Map(),
    conversations: new Map(),
    "fact-proposals": new Map(),
    opportunities: new Map(),
  };

  return {
    async create(input) {
      const now = new Date();
      const entity = {
        ...input.data,
        ...input.scope,
        createdAt: now,
        id: randomUUID(),
        revision: 1,
        updatedAt: now,
      } as CrmCoreEntityByResource[typeof input.resource];
      storeFor(stores, input.resource).set(entity.id, entity);
      return entity;
    },
    async findIdentityByNormalizedValue(input) {
      return [...stores["contact-identities"].values()].filter(
        (identity) =>
          inScope(identity, input) &&
          identity.kind === input.kind &&
          identity.normalizedValue === input.normalizedValue,
      );
    },
    async get(input) {
      const entity = storeFor(stores, input.resource).get(input.id);
      return entity && inScope(entity, input) ? entity : null;
    },
    async list(input) {
      return [...storeFor(stores, input.resource).values()]
        .filter((entity) => inScope(entity, input))
        .sort(compareEntity)
        .filter(
          (entity) => !input.cursor || compareCursor(entity, input.cursor) > 0,
        )
        .slice(0, input.limit ?? 1_000);
    },
    async update(input) {
      const store = storeFor(stores, input.resource);
      const current = store.get(input.id);
      if (!current || !inScope(current, input)) return null;
      if (current.revision !== input.expectedRevision) {
        throw new CrmCoreRevisionConflictError(
          input.expectedRevision,
          current.revision,
        );
      }
      const updated = {
        ...current,
        ...input.patch,
        id: current.id,
        revision: current.revision + 1,
        storeId: current.storeId,
        tenantId: current.tenantId,
        updatedAt: new Date(),
      } as CrmCoreEntityByResource[typeof input.resource];
      store.set(current.id, updated);
      return updated;
    },
  };
}

function compareEntity(left: AnyEntity, right: AnyEntity): number {
  return (
    left.createdAt.getTime() - right.createdAt.getTime() ||
    left.id.localeCompare(right.id)
  );
}

function compareCursor(
  entity: AnyEntity,
  cursor: { createdAt: Date; id: string },
): number {
  return (
    entity.createdAt.getTime() - cursor.createdAt.getTime() ||
    entity.id.localeCompare(cursor.id)
  );
}

function inScope(
  entity: Pick<AnyEntity, "storeId" | "tenantId">,
  scope: { storeId: string; tenantId: string },
): boolean {
  return entity.storeId === scope.storeId && entity.tenantId === scope.tenantId;
}

function storeFor<R extends CrmCoreResource>(
  stores: EntityStores,
  resource: R,
): Map<string, CrmCoreEntityByResource[R]> {
  return stores[resource] as Map<string, CrmCoreEntityByResource[R]>;
}

export type { ContactIdentity };
