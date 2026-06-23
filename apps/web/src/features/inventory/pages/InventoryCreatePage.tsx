import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createInventoryApi, type InventoryApi } from "../api/apiClient";
import {
  createInitialInventoryForm,
  type InventoryFieldChangeHandler,
  type InventoryFormState,
} from "../model/formModel";
import { InventoryEditPanel } from "../components/InventoryEditPanel";
import { InventoryBadge } from "../components/InventoryFormParts";
import { InventoryCreateFlow } from "../components/InventoryCreateFlow";
import { InventoryStockTable } from "../components/InventoryStockTable";
import { createInventoryApiOptions } from "../api/inventoryRuntimeApi";
import type { InventoryListingDetail } from "../model/types";
import type { CreateMediaDraft } from "../model/createMediaDrafts";
import type { InventoryRouteState } from "../model/inventoryRouteState";
import { useInventoryCreateSubmit } from "./useInventoryCreateSubmit";

type SelectionState =
  | { kind: "idle" }
  | { kind: "loading"; listingId: string }
  | { detail: InventoryListingDetail; kind: "ready" }
  | { kind: "error"; message: string };

export function InventoryCreatePage({
  api,
  initialStep = "mode",
}: {
  api?: InventoryApi | undefined;
  initialStep?: InventoryRouteState["createStep"];
}) {
  const [form, setForm] = useState<InventoryFormState>(() => ({
    ...createInitialInventoryForm(),
    status: "available" as const,
  }));
  const [media, setMedia] = useState<CreateMediaDraft[]>([]);
  const mediaRef = useRef<CreateMediaDraft[]>([]);
  const [runtimeApi, setRuntimeApi] = useState<InventoryApi | null>(
    api ?? null,
  );
  const [refreshToken, setRefreshToken] = useState(0);
  const [selection, setSelection] = useState<SelectionState>({ kind: "idle" });

  useEffect(() => {
    if (api) {
      setRuntimeApi(api);
      return;
    }

    void createInventoryApiOptions().then((options) => {
      setRuntimeApi(createInventoryApi(options));
    });
  }, [api]);

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(
    () => () => {
      for (const item of mediaRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    },
    [],
  );

  const setField: InventoryFieldChangeHandler =
    (field: keyof InventoryFormState) => (value) => {
      setForm((current) => ({
        ...current,
        [field]: typeof value === "string" ? value : value.target.value,
      }));
    };

  const handleCatalogChange = useCallback(
    (catalog: InventoryFormState["catalog"]) => {
      setForm((current) => ({
        ...current,
        catalog,
        modelYear: catalog?.modelYear ? String(catalog.modelYear) : "",
        title: current.title || createCatalogTitle(catalog),
        trimName: catalog?.modelName ?? "",
      }));
    },
    [],
  );

  const handleCreated = useCallback((detail: InventoryListingDetail) => {
    setRefreshToken((current) => current + 1);
    setSelection({ detail, kind: "ready" });
  }, []);

  const resolveInventoryApi = useCallback(async () => {
    return runtimeApi ?? createInventoryApi(await createInventoryApiOptions());
  }, [runtimeApi]);

  const { handleRetryMedia, handleSubmit, submitState } =
    useInventoryCreateSubmit({
      form,
      media,
      onCreated: handleCreated,
      resolveApi: resolveInventoryApi,
    });

  const selectListing = async (listingId: string) => {
    if (!runtimeApi) return;

    setSelection({ kind: "loading", listingId });

    try {
      const detail = await runtimeApi.getListing(listingId);
      setSelection({ detail, kind: "ready" });
    } catch (error) {
      setSelection({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleUpdated = (detail: InventoryListingDetail) => {
    setSelection({ detail, kind: "ready" });
    setRefreshToken((current) => current + 1);
  };

  return (
    <main className="mx-auto flex max-w-[var(--layout-content-max)] flex-col gap-5 p-4 lg:p-6">
      <section className="rounded-lg border border-line bg-panel p-5 shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <InventoryBadge>Inventario</InventoryBadge>
              <InventoryBadge tone="blue">Fotos e videos</InventoryBadge>
            </div>
            <h2 className="text-2xl font-black text-app-text lg:text-4xl">
              Criar veiculo no estoque
            </h2>
            <p className="max-w-3xl text-sm font-bold text-muted">
              Cadastre o anuncio, vincule a unidade operacional e envie uma
              midia opcional para a galeria do veiculo.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm font-black text-accent-strong">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Sequencia transacional guiada
          </div>
        </div>
      </section>

      <InventoryCreateFlow
        api={runtimeApi}
        form={form}
        initialStep={initialStep}
        media={media}
        onCatalogChange={handleCatalogChange}
        onChange={setField}
        onMediaChange={setMedia}
        onModeChange={(mode) => {
          if (mode === "draft") {
            setForm((current) => ({ ...current, status: "draft" }));
          }
        }}
        onRetryMedia={() => void handleRetryMedia()}
        onSubmit={(event) => void handleSubmit(event)}
        state={submitState}
      />

      {runtimeApi ? (
        <InventoryStockTable
          api={runtimeApi}
          onSelect={(listingId) => void selectListing(listingId)}
          refreshToken={refreshToken}
        />
      ) : null}

      {runtimeApi && selection.kind === "ready" ? (
        <InventoryEditPanel
          api={runtimeApi}
          detail={selection.detail}
          onUpdated={handleUpdated}
        />
      ) : null}

      {selection.kind === "loading" ? (
        <p className="rounded-lg border border-line bg-panel p-3 text-sm font-black text-muted">
          Carregando {selection.listingId}.
        </p>
      ) : null}

      {selection.kind === "error" ? (
        <p className="rounded-lg border border-line bg-panel p-3 text-sm font-black text-danger">
          {selection.message}
        </p>
      ) : null}
    </main>
  );
}

function createCatalogTitle(catalog: InventoryFormState["catalog"]) {
  if (!catalog) return "";
  return [catalog.brandName, catalog.modelName, catalog.modelYear]
    .filter(Boolean)
    .join(" ");
}
