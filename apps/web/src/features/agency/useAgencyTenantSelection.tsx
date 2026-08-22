import { Building2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import type { TenantAccessSummary } from "../account/apiClient";
import { useAccountSession } from "../account/accountSession";

const agencyTenantKeyPrefix = "lojaveiculosv2:agency-tenant:v1:";

export function useAgencyTenantSelection() {
  const session = useAccountSession();
  const agencyTenants = useMemo(
    () =>
      session.tenantMemberships.filter(
        (membership) =>
          membership.role === "agency" && membership.status === "active",
      ),
    [session.tenantMemberships],
  );
  const storageKey = `${agencyTenantKeyPrefix}${encodeURIComponent(session.user.clerkUserId)}`;
  const [storedTenantId, setStoredTenantId] = useState<string | null>(() =>
    readStoredTenantId(storageKey),
  );
  const agencyTenant =
    agencyTenants.find((tenant) => tenant.tenantId === storedTenantId) ??
    agencyTenants[0] ??
    null;

  useEffect(() => {
    if (!agencyTenant || agencyTenant.tenantId === storedTenantId) return;
    setStoredTenantId(agencyTenant.tenantId);
    persistTenantId(storageKey, agencyTenant.tenantId);
  }, [agencyTenant, storageKey, storedTenantId]);

  const selectAgencyTenant = useCallback(
    (tenantId: string) => {
      if (!agencyTenants.some((tenant) => tenant.tenantId === tenantId)) return;
      setStoredTenantId(tenantId);
      persistTenantId(storageKey, tenantId);
    },
    [agencyTenants, storageKey],
  );

  return { agencyTenant, agencyTenants, selectAgencyTenant };
}

export function AgencyTenantSelector({
  agencyTenant,
  agencyTenants,
  onChange,
}: {
  agencyTenant: TenantAccessSummary | null;
  agencyTenants: readonly TenantAccessSummary[];
  onChange: (tenantId: string) => void;
}) {
  if (agencyTenants.length < 2) return null;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Building2 aria-hidden="true" className="size-4 shrink-0 text-muted" />
      <FeatureSelect
        ariaLabel="Conta de agência ativa"
        className="min-w-48 max-w-64"
        density="compact"
        onChange={onChange}
        options={agencyTenants.map((tenant) => ({
          label: tenant.tenantName,
          value: tenant.tenantId,
        }))}
        value={agencyTenant?.tenantId ?? ""}
      />
    </div>
  );
}

function readStoredTenantId(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function persistTenantId(storageKey: string, tenantId: string) {
  try {
    window.localStorage.setItem(storageKey, tenantId);
  } catch {}
}
