import type {
  ContactIdentity,
  CrmCoreEntityByResource,
  CrmCoreResource,
  CrmCoreScope,
  CreateCrmCoreEntity,
} from "../core/models.js";

export type CrmCoreRepository = {
  create<R extends CrmCoreResource>(input: {
    data: CreateCrmCoreEntity<R>;
    resource: R;
    scope: CrmCoreScope;
  }): Promise<CrmCoreEntityByResource[R]>;
  findIdentityByNormalizedValue(
    input: CrmCoreScope & {
      kind: ContactIdentity["kind"];
      normalizedValue: string;
    },
  ): Promise<readonly ContactIdentity[]>;
  get<R extends CrmCoreResource>(
    input: CrmCoreScope & {
      id: string;
      resource: R;
    },
  ): Promise<CrmCoreEntityByResource[R] | null>;
  list<R extends CrmCoreResource>(
    input: CrmCoreScope & {
      cursor?: { createdAt: Date; id: string };
      limit?: number;
      resource: R;
    },
  ): Promise<readonly CrmCoreEntityByResource[R][]>;
  update<R extends CrmCoreResource>(
    input: CrmCoreScope & {
      expectedRevision: number;
      id: string;
      patch: Partial<CreateCrmCoreEntity<R>>;
      resource: R;
    },
  ): Promise<CrmCoreEntityByResource[R] | null>;
};
