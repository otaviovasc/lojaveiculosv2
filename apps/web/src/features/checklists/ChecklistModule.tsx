import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ClipboardCheck, Download, RefreshCcw } from "lucide-react";
import {
  FeatureSearchField,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
  FeatureToolbar,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { useOptionalAccountSession } from "../account/accountSession";
import {
  createInventoryApi,
  type InventoryApi,
} from "../inventory/api/apiClient";
import { createInventoryApiOptions } from "../inventory/api/inventoryRuntimeApi";
import type {
  InventoryChecklistOverview,
  InventoryChecklistOverviewFilter,
  InventoryChecklistOverviewInput,
  InventoryChecklistOverviewItem,
  InventoryChecklistOverviewScope,
} from "../inventory/model/checklistOverviewTypes";
import { ChecklistOverviewDrawer } from "./ChecklistOverviewDrawer";
import { ChecklistOverviewTable } from "./ChecklistOverviewTable";
import { ChecklistMetrics } from "./ChecklistMetrics";
import {
  checklistScopeOptions,
  checklistStatusOptions,
} from "./checklistModuleModel";
import {
  readChecklistCapabilities,
  resolveChecklistCapabilities,
} from "./checklistPermissions";
import AnimatedContent from "../../components/ui/AnimatedContent";

export function ChecklistModule({
  api,
  grantedPermissions,
}: {
  api?: InventoryApi;
  grantedPermissions?: readonly string[];
}) {
  const accountSession = useOptionalAccountSession();
  const capabilities = useMemo(
    () =>
      grantedPermissions === undefined
        ? readChecklistCapabilities(accountSession)
        : resolveChecklistCapabilities(grantedPermissions),
    [accountSession, grantedPermissions],
  );
  const [runtimeApi, setRuntimeApi] = useState<InventoryApi | null>(
    api ?? null,
  );
  const [overview, setOverview] = useState<InventoryChecklistOverview | null>(
    null,
  );
  const [scope, setScope] = useState<InventoryChecklistOverviewScope>("active");
  const [status, setStatus] = useState<InventoryChecklistOverviewFilter>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    | "veiculo"
    | "estoque"
    | "situacao"
    | "progresso"
    | "pendencias"
    | "atualizado"
  >("atualizado");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const refreshSequence = useRef(0);

  const sortedItems = useMemo(() => {
    if (!overview?.items) return [];
    const items = [...overview.items];

    return items.sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      if (sortBy === "veiculo") {
        const titleA = a.listing.title || "";
        const titleB = b.listing.title || "";
        return sortDir === "asc"
          ? titleA.localeCompare(titleB, "pt-BR")
          : titleB.localeCompare(titleA, "pt-BR");
      } else if (sortBy === "estoque") {
        valA = a.unit.status || "";
        valB = b.unit.status || "";
      } else if (sortBy === "situacao") {
        valA = a.status || "";
        valB = b.status || "";
      } else if (sortBy === "progresso") {
        valA = a.metrics.progressPercent || 0;
        valB = b.metrics.progressPercent || 0;
      } else if (sortBy === "pendencias") {
        valA = a.metrics.failedItemCount + a.metrics.pendingItemCount;
        valB = b.metrics.failedItemCount + b.metrics.pendingItemCount;
      } else if (sortBy === "atualizado") {
        valA = new Date(a.updatedAt).getTime();
        valB = new Date(b.updatedAt).getTime();
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [overview?.items, sortBy, sortDir]);

  const handleSort = useCallback(
    (
      key:
        | "veiculo"
        | "estoque"
        | "situacao"
        | "progresso"
        | "pendencias"
        | "atualizado",
    ) => {
      setSortDir((prevDir) => {
        if (sortBy === key) {
          return prevDir === "asc" ? "desc" : "asc";
        }
        return "asc";
      });
      setSortBy(key);
    },
    [sortBy],
  );

  useEffect(() => {
    if (api) {
      setRuntimeApi(api);
      return;
    }
    let active = true;
    void createInventoryApiOptions()
      .then((options) => {
        if (active) setRuntimeApi(createInventoryApi(options));
      })
      .catch((caught) => {
        if (active)
          setError(
            formatApiErrorDisplay(
              caught,
              "Não foi possível iniciar o módulo de checklists.",
            ),
          );
      });
    return () => {
      active = false;
    };
  }, [api]);

  const query = useMemo<InventoryChecklistOverviewInput>(
    () => ({
      scope,
      status,
      ...(deferredSearch.trim() ? { search: deferredSearch.trim() } : {}),
    }),
    [deferredSearch, scope, status],
  );

  const refresh = useCallback(async () => {
    if (!runtimeApi) return;
    const requestId = ++refreshSequence.current;
    setLoading(true);
    setError(null);
    try {
      const next = await runtimeApi.listChecklistOverview(query);
      if (requestId !== refreshSequence.current) return;
      setOverview(next);
    } catch (caught) {
      if (requestId !== refreshSequence.current) return;
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível carregar os checklists do estoque.",
        ),
      );
    } finally {
      if (requestId === refreshSequence.current) setLoading(false);
    }
  }, [query, runtimeApi]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedItem =
    overview?.items.find((item) => item.unit.id === selectedUnitId) ?? null;

  async function downloadReport(item?: InventoryChecklistOverviewItem) {
    if (!runtimeApi) return;
    setDownloading(item?.unit.id ?? "general");
    setError(null);
    try {
      const report = await runtimeApi.downloadChecklistReport({
        ...query,
        ...(item ? { unitId: item.unit.id } : {}),
      });
      saveBlob(report.blob, report.fileName);
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível gerar o PDF de checklists.",
        ),
      );
    } finally {
      setDownloading(null);
    }
  }

  function openInventory(item: InventoryChecklistOverviewItem) {
    window.location.hash = `#/inventory?listing=${encodeURIComponent(item.listing.id)}&unit=${encodeURIComponent(item.unit.id)}`;
  }

  return (
    <FeaturePageShell mainClassName="feature-shell">
      <AnimatedContent trigger="mount" delay={0.05} distance={15}>
        <FeaturePageHeader
          actions={
            <>
              <FeatureActionButton
                icon={RefreshCcw}
                isBusy={loading}
                label="Atualizar"
                onClick={() => void refresh()}
              />
              <FeatureActionButton
                icon={Download}
                isBusy={downloading === "general"}
                label="Gerar PDF"
                onClick={() => void downloadReport()}
                variant="primary"
              />
            </>
          }
          description="Acompanhe cada unidade, resolva pendências e gere relatórios com o mesmo recorte exibido na tela."
          eyebrow="Operação do estoque"
          subtitle="Visão geral"
          title="Checklists de veículos"
        />
      </AnimatedContent>

      {overview ? (
        <AnimatedContent trigger="mount" delay={0.12} distance={15}>
          <ChecklistMetrics
            overview={overview}
            onFilter={setStatus}
            status={status}
          />
        </AnimatedContent>
      ) : null}

      <AnimatedContent trigger="mount" delay={0.18} distance={15}>
        <FeatureToolbar>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <FeatureSearchField
              label="Buscar veículos nos checklists"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por veículo, placa, chassi ou estoque"
              value={search}
            />
            <FeatureSelect
              ariaLabel="Escopo dos veículos"
              onChange={setScope}
              options={checklistScopeOptions}
              value={scope}
            />
            <FeatureSelect
              ariaLabel="Situação dos checklists"
              onChange={setStatus}
              options={checklistStatusOptions}
              value={status}
            />
          </div>
        </FeatureToolbar>
      </AnimatedContent>

      {error ? <FeatureAlert>{error}</FeatureAlert> : null}

      <AnimatedContent trigger="mount" delay={0.24} distance={15}>
        {!overview && loading ? (
          <FeatureLoadingState>
            Carregando checklists do estoque
          </FeatureLoadingState>
        ) : overview?.items.length ? (
          <ChecklistOverviewTable
            busyUnitId={downloading}
            items={sortedItems}
            onDownload={(item) => void downloadReport(item)}
            onEdit={(item) => setSelectedUnitId(item.unit.id)}
            onOpenInventory={openInventory}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
          />
        ) : (
          <FeatureEmptyState
            body="Nenhum veículo corresponde ao escopo e aos filtros atuais."
            icon={ClipboardCheck}
            title="Nenhum checklist neste recorte"
          />
        )}
      </AnimatedContent>

      {runtimeApi ? (
        <ChecklistOverviewDrawer
          api={runtimeApi}
          canUpdate={capabilities.canUpdate}
          item={selectedItem}
          onClose={() => setSelectedUnitId(null)}
          onDownload={(item) => void downloadReport(item)}
          onOpenInventory={openInventory}
          onUpdated={refresh}
        />
      ) : null}
    </FeaturePageShell>
  );
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
