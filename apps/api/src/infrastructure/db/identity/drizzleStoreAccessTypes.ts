import type {
  EntitlementKey,
  PermissionKey,
  RoleKey,
  StoreId,
  TenantId,
  UserId,
} from "@lojaveiculosv2/shared";

export type AccessRow = {
  membershipId: string;
  role: RoleKey;
  storeId: StoreId;
  tenantId: TenantId;
  userId: UserId;
};

export type AgencyTenantAccessRow = Omit<AccessRow, "membershipId">;

export type OverrideRow = {
  allowed: boolean;
  permission: PermissionKey;
};

export type EntitlementRow = {
  endsAt: Date | null;
  entitlement: EntitlementKey;
  startsAt: Date | null;
};

type TenantBillingOwnerRow = { role: RoleKey };
type SelectLimitBuilder<Row> = {
  limit: (count: number) => Promise<readonly Row[]>;
};
type SelectWhereBuilder<Row> = {
  innerJoin: (table: unknown, condition: unknown) => SelectWhereBuilder<Row>;
  leftJoin: (table: unknown, condition: unknown) => SelectWhereBuilder<Row>;
  limit: (count: number) => Promise<readonly Row[]>;
  where: (condition: unknown) => SelectLimitBuilder<Row>;
};
type SelectFromBuilder<Row> = {
  from: (table: unknown) => SelectWhereBuilder<Row>;
};

export type DrizzleStoreAccessClient = {
  select: {
    (selection: {
      membershipId: unknown;
      role: unknown;
      storeId: unknown;
      tenantId: unknown;
      userId: unknown;
    }): SelectFromBuilder<AccessRow>;
    (selection: {
      role: unknown;
      storeId: unknown;
      tenantId: unknown;
      userId: unknown;
    }): SelectFromBuilder<AgencyTenantAccessRow>;
    (selection: {
      allowed: unknown;
      permission: unknown;
    }): SelectFromBuilder<OverrideRow>;
    (selection: {
      endsAt: unknown;
      entitlement: unknown;
      startsAt: unknown;
    }): SelectFromBuilder<EntitlementRow>;
    (selection: { role: unknown }): SelectFromBuilder<TenantBillingOwnerRow>;
  };
};
