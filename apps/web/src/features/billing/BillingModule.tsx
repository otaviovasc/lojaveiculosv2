import { CreditCard, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createBillingApi, type BillingApi } from "./apiClient";
import {
  BillingAllocationTable,
  BillingEntitlementMatrix,
  BillingEventList,
  BillingKpiGrid,
} from "./BillingPanels";
import { BillingProviderPanel } from "./BillingProviderPanel";
import { createBillingApiOptions } from "./runtimeApi";
import type {
  BillingEntitlementStatus,
  BillingOverview,
  BillingProviderStatus,
  EntitlementKey,
} from "./types";

export function BillingModule({ api }: { api?: BillingApi }) {
  const billingApi = useMemo(() => api ?? createRuntimeBillingApi(), [api]);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [providerStatus, setProviderStatus] =
    useState<BillingProviderStatus | null>(null);
  const [status, setStatus] = useState<BillingStatus>({ kind: "loading" });
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const refresh = async () => {
    setStatus({ kind: "loading" });
    try {
      const [nextOverview, nextProviderStatus] = await Promise.all([
        billingApi.getOverview(),
        billingApi.getProviderStatus(),
      ]);
      setOverview(nextOverview);
      setProviderStatus(nextProviderStatus);
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const updateEntitlement = async (
    featureKey: EntitlementKey,
    nextStatus: BillingEntitlementStatus,
  ) => {
    setStatus({ kind: "saving", featureKey });
    try {
      const reason = reasons[featureKey]?.trim() || defaultReason(nextStatus);
      setOverview(
        await billingApi.updateEntitlement(featureKey, {
          featureKey,
          metadata: { updatedFrom: "billing_admin_console" },
          reason,
          status: nextStatus,
        }),
      );
      setReasons((current) => ({ ...current, [featureKey]: "" }));
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  return (
    <main className="billing-shell">
      <section className="billing-hero">
        <div>
          <span className="billing-badge">
            <CreditCard aria-hidden="true" className="size-4" />
            Agency billing
          </span>
          <h2>Console de billing e entitlements</h2>
          <p>
            Controle planos, alocacao por loja, add-ons e acesso efetivo por
            feature com historico auditavel.
          </p>
        </div>
        <button
          aria-label="Atualizar billing"
          className="billing-icon-action"
          onClick={() => void refresh()}
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="size-5" />
        </button>
      </section>

      {status.kind === "error" ? (
        <p className="billing-alert">{status.message}</p>
      ) : null}

      {overview ? (
        <>
          {providerStatus ? (
            <BillingProviderPanel status={providerStatus} />
          ) : null}
          <BillingKpiGrid overview={overview} />
          <BillingAllocationTable allocations={overview.allocations} />
          <BillingEntitlementMatrix
            matrix={overview.entitlementMatrix}
            reasons={reasons}
            savingFeatureKey={
              status.kind === "saving" ? status.featureKey : null
            }
            onReasonChange={(featureKey, reason) =>
              setReasons((current) => ({ ...current, [featureKey]: reason }))
            }
            onUpdate={updateEntitlement}
          />
          <BillingEventList events={overview.entitlementEvents} />
        </>
      ) : (
        <section className="billing-empty">
          <Sparkles aria-hidden="true" className="size-5" />
          <strong>Carregando billing</strong>
        </section>
      )}
    </main>
  );
}

type BillingStatus =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "saved" }
  | { featureKey: EntitlementKey; kind: "saving" };

function createRuntimeBillingApi(): BillingApi {
  return {
    getOverview: async () =>
      createBillingApi(await createBillingApiOptions()).getOverview(),
    getProviderStatus: async () =>
      createBillingApi(await createBillingApiOptions()).getProviderStatus(),
    updateEntitlement: async (featureKey, input) =>
      createBillingApi(await createBillingApiOptions()).updateEntitlement(
        featureKey,
        input,
      ),
  };
}

function defaultReason(status: BillingEntitlementStatus) {
  return status === "active"
    ? "Entitlement enabled from agency billing console."
    : "Entitlement changed from agency billing console.";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
