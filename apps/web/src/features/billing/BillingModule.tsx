import {
  BadgeCheck,
  Ban,
  CreditCard,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createBillingApi, type BillingApi } from "./apiClient";
import { createBillingApiOptions } from "./runtimeApi";
import type {
  BillingEntitlementStatus,
  BillingOverview,
  EntitlementKey,
} from "./types";

const featureLabels: Record<EntitlementKey, string> = {
  crm: "CRM",
  custom_domain: "Dominio proprio",
  external_api: "API externa",
  nfe: "NF-e",
  plate_lookup: "Consulta placa",
  subdomain: "Subdominio",
};

const allFeatures = Object.keys(featureLabels) as EntitlementKey[];

export function BillingModule({ api }: { api?: BillingApi }) {
  const billingApi = useMemo(() => api ?? createRuntimeBillingApi(), [api]);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [status, setStatus] = useState<BillingStatus>({ kind: "loading" });

  const refresh = async () => {
    setStatus({ kind: "loading" });
    try {
      setOverview(await billingApi.getOverview());
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
    setStatus({ kind: "saving" });
    try {
      setOverview(
        await billingApi.updateEntitlement(featureKey, {
          featureKey,
          metadata: { updatedFrom: "billing_module" },
          status: nextStatus,
        }),
      );
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
            Billing e acesso
          </span>
          <h2>Plano, cobranca e entitlements da loja</h2>
          <p>
            Billing decide quais features existem para a loja. Papeis decidem o
            que cada usuario pode fazer dentro das features liberadas.
          </p>
        </div>
        <button
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
          <BillingSummary overview={overview} />
          <EntitlementGrid
            overview={overview}
            saving={status.kind === "saving"}
            onUpdate={updateEntitlement}
          />
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

function BillingSummary({ overview }: { overview: BillingOverview }) {
  const subscription = overview.subscription;
  const activeEntitlements = overview.entitlements.filter((entitlement) =>
    ["active", "trialing"].includes(entitlement.status),
  ).length;

  return (
    <section className="billing-summary-grid">
      <SummaryCard
        icon={<BadgeCheck aria-hidden="true" className="size-5" />}
        label="Plano atual"
        value={subscription?.plan?.name ?? "Sem plano"}
      />
      <SummaryCard
        icon={<ShieldCheck aria-hidden="true" className="size-5" />}
        label="Status"
        value={subscription?.status ?? "sem assinatura"}
      />
      <SummaryCard
        icon={<LockKeyhole aria-hidden="true" className="size-5" />}
        label="Features ativas"
        value={`${activeEntitlements}/${allFeatures.length}`}
      />
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="billing-summary-card">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

function EntitlementGrid({
  onUpdate,
  overview,
  saving,
}: {
  onUpdate: (
    featureKey: EntitlementKey,
    status: BillingEntitlementStatus,
  ) => Promise<void>;
  overview: BillingOverview;
  saving: boolean;
}) {
  return (
    <section className="billing-entitlement-grid">
      {allFeatures.map((featureKey) => {
        const entitlement = overview.entitlements.find(
          (item) => item.featureKey === featureKey,
        );
        const status = entitlement?.status ?? "inactive";
        const isEnabled = status === "active" || status === "trialing";
        return (
          <article className="billing-entitlement" key={featureKey}>
            <div>
              <span className={isEnabled ? "is-enabled" : "is-disabled"}>
                {isEnabled ? (
                  <BadgeCheck aria-hidden="true" className="size-4" />
                ) : (
                  <Ban aria-hidden="true" className="size-4" />
                )}
                {status}
              </span>
              <h3>{featureLabels[featureKey]}</h3>
              <p>{entitlement?.source ?? "sem origem de billing"}</p>
            </div>
            <div className="billing-actions">
              <button
                disabled={saving || status === "active"}
                onClick={() => void onUpdate(featureKey, "active")}
                type="button"
              >
                Ativar
              </button>
              <button
                disabled={saving || status === "inactive"}
                onClick={() => void onUpdate(featureKey, "inactive")}
                type="button"
              >
                Pausar
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

type BillingStatus =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "saved" }
  | { kind: "saving" };

function createRuntimeBillingApi(): BillingApi {
  return {
    getOverview: async () =>
      createBillingApi(await createBillingApiOptions()).getOverview(),
    updateEntitlement: async (featureKey, input) =>
      createBillingApi(await createBillingApiOptions()).updateEntitlement(
        featureKey,
        input,
      ),
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
