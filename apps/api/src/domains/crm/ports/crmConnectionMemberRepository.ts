import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";

export type CrmConnectionMember = {
  createdAt: Date;
  grantedBy: string | null;
  userId: UserId;
};

export type CrmConnectionMemberRepository = {
  grantMember: (input: {
    connectionId: string;
    grantedBy: string | null;
    storeId: StoreId;
    tenantId: TenantId;
    userId: UserId;
  }) => Promise<void>;
  listConnectionIdsForUser: (input: {
    storeId: StoreId;
    tenantId: TenantId;
    userId: UserId;
  }) => Promise<readonly string[]>;
  listMemberUserIdsByConnectionIds: (input: {
    connectionIds: readonly string[];
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<Record<string, readonly string[]>>;
  listMembers: (input: {
    connectionId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<readonly CrmConnectionMember[]>;
  revokeMember: (input: {
    connectionId: string;
    storeId: StoreId;
    tenantId: TenantId;
    userId: UserId;
  }) => Promise<{ revoked: boolean }>;
};
