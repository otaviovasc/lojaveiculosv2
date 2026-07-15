import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  type AgencySort,
  type AgencyStore,
  type AgencyStatusFilter,
  mapAgencyOverviewToStores,
} from "./AgencyDashboardPage.model";
import {
  AgencyDashboardHeader,
  AgencyStatsGrid,
  AgencyStoresCard,
} from "./AgencyDashboardControls";
import { AgencyStoresTable } from "./AgencyDashboardStoresTable";
import { createAgencyApi } from "../apiClient";
import { useAccountSession } from "../../account/accountSession";
import { persistCurrentStoreSlug } from "../../account/currentStore";
import {
  createRuntimeActorAuth,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../../account/runtimeAuth";

export function AgencyDashboardPage() {
  const [stores, setStores] = useState<AgencyStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<AgencySort>("recent");
  const [statusFilter, setStatusFilter] = useState<AgencyStatusFilter>("all");
  const [planEndDateFrom, setPlanEndDateFrom] = useState("");
  const [planEndDateTo, setPlanEndDateTo] = useState("");
  const session = useAccountSession();
  const agencyTenant = session.tenantMemberships.find(
    (membership) =>
      membership.role === "agency" && membership.status === "active",
  );
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    if (!agencyTenant) {
      setStores([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await readClerkToken();
      const api = createAgencyApi({
        auth: createRuntimeActorAuth(token),
        fetch: window.fetch.bind(window),
        ...readRuntimeApiBaseUrl(),
      });
      const overview = await api.getOverview(agencyTenant.tenantId);
      setStores(mapAgencyOverviewToStores(overview));
    } catch (error) {
      console.error("Error fetching agency stores:", error);
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [agencyTenant]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const manageStore = useCallback(
    (store: AgencyStore) => {
      persistCurrentStoreSlug(store.subdominio, session.user.clerkUserId);
      void navigate("/dashboard");
    },
    [navigate, session.user.clerkUserId],
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
        const endDate = new Date(store.plan_end_date);
        const now = new Date();
        const isExpired = endDate.getTime() <= now.getTime();
        const isActiveStatus =
          store.status_assinatura.toUpperCase() === "ATIVA";
        const daysLeft = Math.ceil(
          (endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );

        switch (statusFilter) {
          case "active":
            if (!isActiveStatus || isExpired || daysLeft <= 5) return false;
            break;
          case "expiring":
            if (!isActiveStatus || daysLeft <= 0 || daysLeft > 5) return false;
            break;
          case "expired":
            if (!isActiveStatus || !isExpired || daysLeft <= -7) return false;
            break;
          case "inactive":
            if (isActiveStatus && (!isExpired || daysLeft > -7)) return false;
            break;
        }
      }

      if (planEndDateFrom || planEndDateTo) {
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
            const endDate = new Date(store.plan_end_date);
            const now = new Date();
            const isExpired = endDate.getTime() <= now.getTime();
            const isActive = store.status_assinatura.toUpperCase() === "ATIVA";
            const daysLeft = Math.ceil(
              (endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
            );

            if (!isActive || (isExpired && daysLeft <= -7)) return 3;
            if (isExpired) return 2;
            if (daysLeft <= 5) return 1;
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
    <div className="content-frame animate-fade-in">
      <AgencyDashboardHeader
        onCreate={() => void navigate("/agency/admin/create-store")}
      />
      <AgencyStatsGrid stores={stores} />
      <AgencyStoresCard
        filteredCount={filteredAndSortedStores.length}
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
          loading={loading}
          navigate={navigate}
          onClearFilters={() => {
            setSearchTerm("");
            setStatusFilter("all");
            setPlanEndDateFrom("");
            setPlanEndDateTo("");
          }}
          onManageStore={manageStore}
          stores={filteredAndSortedStores}
        />
      </AgencyStoresCard>
    </div>
  );
}
