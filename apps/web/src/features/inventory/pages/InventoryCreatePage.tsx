import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { ArrowLeft } from "lucide-react";
import { createInventoryApi, type InventoryApi } from "../api/apiClient";
import {
  createInitialInventoryForm,
  type InventoryFieldChangeHandler,
  type InventoryFormState,
  type InventoryEditableField,
} from "../model/formModel";
import { createInventoryApiOptions } from "../api/inventoryRuntimeApi";
import type { InventoryListingDetail } from "../model/types";
import type { CreateMediaDraft } from "../model/createMediaDrafts";
import type { InventoryRouteState } from "../model/inventoryRouteState";
import { useInventoryCreateSubmit } from "./useInventoryCreateSubmit";
import { InventoryCreateForm } from "../components/InventoryCreateForm";
import { InventoryCreateSidebar } from "../components/InventoryCreateSidebar";
import { InventoryCreateDraftPanel } from "../components/InventoryCreateDraftPanel";
import {
  clearInventoryCreateDraft,
  loadInventoryCreateDraft,
  saveInventoryCreateDraft,
  type InventoryCreateDraft,
} from "../model/inventoryCreateDraft";
import { useInventoryCreateStores } from "./useInventoryCreateStores";
import type {
  InventoryPlateLookupResponse,
  InventoryResaleAnalysisResponse,
} from "../model/enrichmentTypes";
import {
  createResaleAnalysisInput,
  hasEnoughDataForAnalysis,
} from "../model/inventoryEnrichment";
import type { Loadable } from "../components/InventoryCreateEnrichmentParts";

export function InventoryCreatePage({
  api,
  onBack,
}: {
  api?: InventoryApi | undefined;
  initialStep?: InventoryRouteState["createStep"];
  onBack?: (() => void) | undefined;
}) {
  const [form, setForm] = useState<InventoryFormState>(() => ({
    ...createInitialInventoryForm(),
  }));
  const [savedDraft, setSavedDraft] = useState<InventoryCreateDraft | null>(
    () => loadInventoryCreateDraft(),
  );
  const [media, setMedia] = useState<CreateMediaDraft[]>([]);
  const mediaRef = useRef<CreateMediaDraft[]>([]);
  const [runtimeApi, setRuntimeApi] = useState<InventoryApi | null>(
    api ?? null,
  );
  const [lookup, setLookup] = useState<InventoryPlateLookupResponse | null>(
    null,
  );
  const [analysisState, setAnalysisState] = useState<
    Loadable<InventoryResaleAnalysisResponse>
  >({ kind: "idle" });
  const [autoRunAnalysis, setAutoRunAnalysis] = useState(false);

  const stores = useInventoryCreateStores(setForm);

  useEffect(() => {
    if (api) {
      setRuntimeApi(api);
      return;
    }

    const selectedStore = stores.find((s) => s.id === form.storeId);
    const storeSlug = selectedStore?.slug || undefined;

    void createInventoryApiOptions().then((options) => {
      setRuntimeApi(
        createInventoryApi({
          ...options,
          auth: {
            ...options.auth,
            ...(storeSlug ? { storeSlug } : {}),
          },
        }),
      );
    });
  }, [api, form.storeId, stores]);

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => {
    if (savedDraft) return;
    saveInventoryCreateDraft({
      form,
      mediaFileNames: media.map((item) => item.file.name),
    });
  }, [form, media, savedDraft]);

  useEffect(() => {
    if (!autoRunAnalysis || !runtimeApi || !lookup) return;
    if (!hasEnoughDataForAnalysis(form, lookup)) return;
    setAutoRunAnalysis(false);
    setAnalysisState({ kind: "loading" });
    void runtimeApi
      .analyzeResale(createResaleAnalysisInput(form, lookup))
      .then((value) => {
        setAnalysisState({ kind: "success", value });
        setForm((current) =>
          current.description.trim()
            ? current
            : { ...current, description: value.suggestedDescription },
        );
      })
      .catch((error: unknown) => {
        setAnalysisState({
          kind: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
  }, [autoRunAnalysis, form, lookup, runtimeApi, setForm]);

  useEffect(
    () => () => {
      for (const item of mediaRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    },
    [],
  );

  const setField = useCallback(
    (field: InventoryEditableField) =>
      (
        value:
          | ChangeEvent<
              HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
            >
          | string,
      ) => {
        setForm((current) => ({
          ...current,
          [field]:
            typeof value === "object" && value !== null && "target" in value
              ? value.target.value
              : value,
        }));
      },
    [],
  ) as InventoryFieldChangeHandler;

  const handleCatalogChange = useCallback(
    (catalog: InventoryFormState["catalog"]) => {
      setForm((current) => ({
        ...current,
        catalog,
        modelYear: catalog?.modelYear ? String(catalog.modelYear) : "",
        title: catalog ? createCatalogTitle(catalog) : current.title,
        trimName: catalog?.modelName ?? current.trimName,
      }));
    },
    [],
  );

  const handleLookupComplete = useCallback(
    (result: InventoryPlateLookupResponse) => {
      setLookup(result);
      setAnalysisState({ kind: "idle" });
      if (hasEnoughDataForAnalysis(form, result)) {
        setAutoRunAnalysis(true);
      }
    },
    [form],
  );

  const handleGenerateAnalysis = useCallback(async () => {
    if (!runtimeApi) return;
    setAnalysisState({ kind: "loading" });
    try {
      const value = await runtimeApi.analyzeResale(
        createResaleAnalysisInput(form, lookup),
      );
      setAnalysisState({ kind: "success", value });
      setForm((current) =>
        current.description.trim()
          ? current
          : { ...current, description: value.suggestedDescription },
      );
    } catch (error) {
      setAnalysisState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [form, lookup, runtimeApi, setForm]);

  const handleCreated = useCallback((_detail: InventoryListingDetail) => {
    clearInventoryCreateDraft();
    setSavedDraft(null);
  }, []);

  const resolveInventoryApi = useCallback(async () => {
    if (runtimeApi) return runtimeApi;
    const selectedStore = stores.find((s) => s.id === form.storeId);
    const storeSlug = selectedStore?.slug || undefined;
    const options = await createInventoryApiOptions();
    return createInventoryApi({
      ...options,
      auth: {
        ...options.auth,
        ...(storeSlug ? { storeSlug } : {}),
      },
    });
  }, [runtimeApi, form.storeId, stores]);

  const { handleRetryMedia, handleSubmit, submitState } =
    useInventoryCreateSubmit({
      form,
      media,
      onCreated: handleCreated,
      resolveApi: resolveInventoryApi,
    });

  return (
    <main className="mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col px-4 pb-12 animate-fade-in text-app-text">
      <div className="flex flex-col gap-4 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-black tracking-wide uppercase lg:text-3xl">
            Cadastrar Veículo
          </h2>
        </div>
        {onBack ? (
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-accent-soft/20 bg-accent-soft px-4 text-sm font-black text-accent-strong shadow-sm"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span>Voltar ao estoque</span>
          </button>
        ) : null}
      </div>

      {savedDraft ? (
        <InventoryCreateDraftPanel
          draft={savedDraft}
          onClear={() => {
            clearInventoryCreateDraft();
            setSavedDraft(null);
          }}
          onContinue={() => {
            setForm(savedDraft.form);
            setSavedDraft(null);
          }}
        />
      ) : null}

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.6fr)]"
      >
        <InventoryCreateForm
          api={runtimeApi}
          form={form}
          media={media}
          stores={stores}
          onChange={setField}
          onCatalogChange={handleCatalogChange}
          onMediaChange={setMedia}
          onSetFormDirect={setForm}
          onLookupComplete={handleLookupComplete}
        />
        <InventoryCreateSidebar
          form={form}
          media={media}
          stores={stores}
          submitState={submitState}
          onRetryMedia={() => void handleRetryMedia()}
          isSubmitting={submitState.kind === "submitting"}
          analysisState={analysisState}
          canAnalyze={Boolean(
            runtimeApi && hasEnoughDataForAnalysis(form, lookup),
          )}
          onGenerateAnalysis={() => void handleGenerateAnalysis()}
        />
      </form>
    </main>
  );
}

function createCatalogTitle(catalog: InventoryFormState["catalog"]) {
  if (!catalog) return "";
  return [catalog.brandName, catalog.modelName, catalog.modelYear]
    .filter(Boolean)
    .join(" ");
}
