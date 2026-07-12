import type { AccountApi } from "../../account/apiClient";

export type AgencyCreateStorePageProps = {
  apiFactory?: () => Promise<AccountApi>;
};

export type TenantLoadStatus =
  { kind: "error"; message: string } | { kind: "loading" } | { kind: "ready" };
