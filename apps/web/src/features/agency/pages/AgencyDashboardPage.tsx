import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCcw } from "lucide-react";
import {
  FeatureActionButton,
  FeaturePageShell,
} from "../../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import {
  type AgencySort,
  type AgencyStore,
  type AgencyStatusFilter,
  getPlanStatus,
  mapAgencyOverviewToStores,
} from "./AgencyDashboardPage.model";
import {
  AgencyDashboardHeader,
  AgencyStatsGrid,
  AgencyStoresCard,
} from "./AgencyDashboardControls";
import {
  AgencyStoresTable,
  type AgencyStoreModuleAccess,
  type AgencyStoreModuleId,
} from "./AgencyDashboardStoresTable";
import { createAgencyApi } from "../apiClient";
import { useAccountSession } from "../../account/accountSession";
import { persistCurrentStoreSlug } from "../../account/currentStore";
import {
  AgencyTenantSelector,
  useAgencyTenantSelection,
} from "../useAgencyTenantSelection";
import {
  createRuntimeActorAuth,
  createRuntimeFetch,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../../account/runtimeAuth";

export function AgencyDashboardPage() {
  const requestGeneration = useRef(0);
  const [stores, setStores] = useState<AgencyStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<AgencySort>("recent");
  const [statusFilter, setStatusFilter] = useState<AgencyStatusFilter>("all");
  const [planEndDateFrom, setPlanEndDateFrom] = useState("");
  const [planEndDateTo, setPlanEndDateTo] = useState("");
  const session = useAccountSession();
  const { agencyTenant, agencyTenants, selectAgencyTenant } =
    useAgencyTenantSelection();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    const generation = ++requestGeneration.current;
    if (!agencyTenant) {
      setStores([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setStores([]);
    try {
      const token = await readClerkToken();
      const api = createAgencyApi({
        auth: createRuntimeActorAuth(token),
        fetch: createRuntimeFetch(),
        ...readRuntimeApiBaseUrl(),
      });
      const overview = await api.getOverview(agencyTenant.tenantId);
      if (generation !== requestGeneration.current) return;
      setStores(mapAgencyOverviewToStores(overview));
    } catch (error) {
      if (generation !== requestGeneration.current) return;
      setStores([]);
      setLoadError(
        formatApiErrorDisplay(
          error,
          "Não foi possível carregar as lojas da agência.",
        ),
      );
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [agencyTenant]);

  useEffect(() => {
    void fetchData();
    return () => {
      requestGeneration.current += 1;
    };
  }, [fetchData]);

  const findAgencyOwnedStore = useCallback(
    (store: AgencyStore) =>
      session.stores.find(
        (access) =>
          access.status === "active" &&
          access.role === "agency" &&
          access.tenantId === agencyTenant?.tenantId &&
          access.storeSlug === store.subdominio,
      ) ?? null,
    [agencyTenant?.tenantId, session.stores],
  );

  const readStoreModuleAccess = useCallback(
    (
      store: AgencyStore,
      moduleId: AgencyStoreModuleId,
    ): AgencyStoreModuleAccess => {
      const agencyStore = findAgencyOwnedStore(store);
      if (!agencyStore) {
        return {
          canOpen: false,
          reason: "Loja indisponível nesta agência.",
        };
      }
      const requirement = storeModuleRequirements[moduleId];
      if (
        agencyStore.entitlements &&
        !agencyStore.entitlements.includes(requirement)
      ) {
        return {
          canOpen: false,
          reason: "Módulo não contratado para esta loja.",
        };
      }
      return { canOpen: true, reason: null };
    },
    [findAgencyOwnedStore],
  );

  const manageStore = useCallback(
    (store: AgencyStore) => {
      if (!findAgencyOwnedStore(store)) return;
      persistCurrentStoreSlug(store.subdominio, session.user.clerkUserId);
      void navigate("/dashboard");
    },
    [findAgencyOwnedStore, navigate, session.user.clerkUserId],
  );

  const openStoreModule = useCallback(
    (store: AgencyStore, moduleId: AgencyStoreModuleId) => {
      if (!readStoreModuleAccess(store, moduleId).canOpen) return;
      persistCurrentStoreSlug(store.subdominio, session.user.clerkUserId);
      const moduleHash =
        moduleId === "crm" ? "/crm?surface=conversations" : `/${moduleId}`;
      void navigate(`/dashboard#${moduleHash}`);
    },
    [navigate, readStoreModuleAccess, session.user.clerkUserId],
  );

  const filteredAndSortedStores = stores
    .filter((store) => {
      const search = searchTerm.toLowerCase();
      const storeName = (
        store.settings?.profile_name || store.nome_da_loja
      ).toLowerCase();
      const subdomain = store.subdominio.toLowerCase();

      const matchesSearch =
        storeName.includes(search) || subdomain.includes(search);
      if (!matchesSearch) return false;

      if (statusFilter !== "all") {
        const now = new Date();
        const endDate = store.plan_end_date
          ? new Date(store.plan_end_date)
          : null;
        const isExpired = endDate ? endDate.getTime() <= now.getTime() : false;
        const isActiveStatus =
          store.status_assinatura.toUpperCase() === "ATIVA";
        const daysLeft = endDate
          ? Math.ceil(
              (endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
            )
          : null;

        switch (statusFilter) {
          case "active":
            if (
              !isActiveStatus ||
              (!store.is_permanent_plan &&
                (!endDate || isExpired || (daysLeft ?? 0) <= 5))
            )
              return false;
            break;
          case "expiring":
            if (
              !isActiveStatus ||
              store.is_permanent_plan ||
              daysLeft === null ||
              daysLeft <= 0 ||
              daysLeft > 5
            )
              return false;
            break;
          case "expired":
            if (
              !isActiveStatus ||
              store.is_permanent_plan ||
              !isExpired ||
              daysLeft === null ||
              daysLeft <= -7
            )
              return false;
            break;
          case "inactive":
            if (
              isActiveStatus &&
              (store.is_permanent_plan ||
                !isExpired ||
                (daysLeft !== null && daysLeft > -7))
            )
              return false;
            break;
        }
      }

      if (planEndDateFrom || planEndDateTo) {
        if (!store.plan_end_date) return false;
        const planDate = new Date(store.plan_end_date);
        if (planEndDateFrom && planDate < new Date(planEndDateFrom))
          return false;
        if (planEndDateTo && planDate > new Date(planEndDateTo)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "status": {
          const getStatusPriority = (store: AgencyStore) => {
            const label = getPlanStatus(store).label;
            if (label === "Inativo") return 3;
            if (label === "Expirou") return 2;
            if (label === "Vence em breve" || label === "Renovação a confirmar")
              return 1;
            return 0;
          };
          return getStatusPriority(a) - getStatusPriority(b);
        }
        case "alphabetical":
          return (a.settings?.profile_name || a.nome_da_loja).localeCompare(
            b.settings?.profile_name || b.nome_da_loja,
          );
        case "vehicles":
          return (b._count?.veiculos || 0) - (a._count?.veiculos || 0);
        case "oldest":
          return (
            new Date(a.data_criacao).getTime() -
            new Date(b.data_criacao).getTime()
          );
        case "recent":
        default:
          return (
            new Date(b.data_criacao).getTime() -
            new Date(a.data_criacao).getTime()
          );
      }
    });

  return (
    <FeaturePageShell
      className="agency-dashboard-shell relative animate-fade-in"
      variant="content"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-1/4 top-0 hidden h-[300px] w-[500px] rounded-full bg-accent-strong/15 blur-[120px] lg:block"
      />
      <div className="relative z-10 space-y-6">
        <AgencyDashboardHeader
          agencySelector={
            <AgencyTenantSelector
              agencyTenant={agencyTenant}
              agencyTenants={agencyTenants}
              onChange={selectAgencyTenant}
            />
          }
          storeCount={stores.length}
          onCreate={() => void navigate("/agency/admin/create-store")}
        />
        {loadError ? (
          <FeatureAlert
            action={
              <FeatureActionButton
                icon={RefreshCcw}
                label="Tentar novamente"
                onClick={() => void fetchData()}
              />
            }
            title="Rede de lojas indisponível"
            tone="danger"
          >
            {loadError}
          </FeatureAlert>
        ) : null}
        <AgencyStatsGrid loading={loading} stores={stores} />
        <AgencyStoresCard
          filteredCount={loading ? null : filteredAndSortedStores.length}
          onPlanEndDateFromChange={setPlanEndDateFrom}
          onPlanEndDateToChange={setPlanEndDateTo}
          onSearchTermChange={setSearchTerm}
          onSortByChange={setSortBy}
          onStatusFilterChange={setStatusFilter}
          planEndDateFrom={planEndDateFrom}
          planEndDateTo={planEndDateTo}
          searchTerm={searchTerm}
          sortBy={sortBy}
          statusFilter={statusFilter}
        >
          <AgencyStoresTable
            hasActiveFilters={
              searchTerm !== "" ||
              statusFilter !== "all" ||
              planEndDateFrom !== "" ||
              planEndDateTo !== ""
            }
            loading={loading}
            navigate={navigate}
            onClearFilters={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setPlanEndDateFrom("");
              setPlanEndDateTo("");
            }}
            onManageStore={manageStore}
            onOpenStoreModule={openStoreModule}
            readStoreModuleAccess={readStoreModuleAccess}
            stores={filteredAndSortedStores}
          />
        </AgencyStoresCard>
      </div>
    </FeaturePageShell>
  );
}

export const storeModuleRequirements: Record<
  AgencyStoreModuleId,
  "crm" | "external_api" | "financing" | "fiscal"
> = {
  crm: "crm",
  fiscal: "fiscal",
  "public-api": "external_api",
  simulations: "financing",
};
