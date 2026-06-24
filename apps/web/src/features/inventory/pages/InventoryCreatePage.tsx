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
      (value: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string) => {
        setForm((current) => ({
          ...current,
          [field]: typeof value === "string" ? value : value.target.value,
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
    <main className="mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col gap-6 px-4 py-6 animate-fade-in text-app-text">
      <div className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="text-2xl font-black tracking-wide uppercase lg:text-3xl">
            Cadastrar Veículo
          </h2>
          <p className="max-w-3xl text-xs font-bold text-muted">
            Busque pela placa, selecione o catálogo FIPE em ordem e complete os
            dados que o backend usa para criar anúncio, unidade e mídias.
          </p>
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
        className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]"
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
        />
        <InventoryCreateSidebar
          form={form}
          media={media}
          stores={stores}
          submitState={submitState}
          onRetryMedia={() => void handleRetryMedia()}
          isSubmitting={submitState.kind === "submitting"}
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
