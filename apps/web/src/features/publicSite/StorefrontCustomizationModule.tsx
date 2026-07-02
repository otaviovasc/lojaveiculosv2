import { useEffect, useMemo, useState } from "react";
import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { SettingsApi } from "../settings/apiClient";
import { createStoreSettingsPatch } from "../settings/settingsPatch";
import type { StoreSettingsSnapshot } from "../settings/types";
import { CustomPageEditor } from "./CustomPageEditor";
import { CustomPagesList } from "./CustomPagesList";
import { createDuplicatePageSlug, slugifyCustomPage } from "./customPageUtils";
import { createBuilderConfigFromSettings } from "./storefrontBuilderConfig";
import { StorefrontMediaLibraryProvider } from "./StorefrontMediaLibraryContext";
import type { StorefrontMediaApi } from "./storefrontMediaApi";
import type { StorefrontPagesApi } from "./storefrontPagesApi";
import {
  createRuntimeSettingsApi,
  createRuntimeStorefrontMediaApi,
  createRuntimeStorefrontPagesApi,
} from "./storefrontRuntimeApis";
import type {
  StorefrontCustomizationStatus,
  StorefrontCustomizationTab,
} from "./storefrontCustomizationTypes";
import { StorefrontLoadingState } from "./StorefrontCustomizationModuleParts";
import { WebsiteBuilderDesign } from "./WebsiteBuilderDesign";

export function StorefrontCustomizationModule({
  initialTab = "design",
  pagesApi,
  mediaApi,
  settingsApi,
}: {
  initialTab?: StorefrontCustomizationTab;
  mediaApi?: StorefrontMediaApi;
  pagesApi?: StorefrontPagesApi;
  settingsApi?: SettingsApi;
}) {
  const runtimeSettingsApi = useMemo(
    () => settingsApi ?? createRuntimeSettingsApi(),
    [settingsApi],
  );
  const runtimePagesApi = useMemo(
    () => pagesApi ?? createRuntimeStorefrontPagesApi(),
    [pagesApi],
  );
  const runtimeMediaApi = useMemo(
    () => mediaApi ?? createRuntimeStorefrontMediaApi(),
    [mediaApi],
  );
  const [savedSettings, setSavedSettings] =
    useState<StoreSettingsSnapshot | null>(null);
  const [draftSettings, setDraftSettings] =
    useState<StoreSettingsSnapshot | null>(null);
  const [pages, setPages] = useState<readonly StorefrontCustomPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<StorefrontCustomPage | null>(
    null,
  );
  const [status, setStatus] = useState<StorefrontCustomizationStatus>({
    kind: "loading",
  });
  const [createTitle, setCreateTitle] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createDescription, setCreateDescription] = useState("");

  const refresh = async () => {
    setStatus({ kind: "loading" });
    try {
      const [settings, nextPages] = await Promise.all([
        runtimeSettingsApi.getStoreSettings(),
        runtimePagesApi.listPages(),
      ]);
      setSavedSettings(settings);
      setDraftSettings(settings);
      setPages(nextPages);
      setSelectedPage((current) =>
        current
          ? (nextPages.find((page) => page.id === current.id) ?? null)
          : null,
      );
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const saveSettings = async (nextSettings: StoreSettingsSnapshot) => {
    setStatus({ kind: "saving" });
    try {
      const saved = await runtimeSettingsApi.updateStoreSettings(
        savedSettings
          ? createStoreSettingsPatch(savedSettings, nextSettings)
          : {
              identity: nextSettings.identity,
              profile: nextSettings.profile,
              publicSite: nextSettings.publicSite,
            },
      );
      setSavedSettings(saved);
      setDraftSettings(saved);
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  const createPage = async () => {
    setStatus({ kind: "saving" });
    try {
      const page = await runtimePagesApi.createPage({
        description: createDescription || null,
        slug: createSlug,
        title: createTitle,
      });
      setPages((current) => [...current, page]);
      setSelectedPage(page);
      setCreateTitle("");
      setCreateSlug("");
      setCreateDescription("");
      setStatus({ kind: "saved" });
      return true;
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
      return false;
    }
  };

  const savePage = async (page: StorefrontCustomPage) => {
    setStatus({ kind: "saving" });
    try {
      const saved = await runtimePagesApi.updatePage(
        page.id,
        toPageUpdate(page),
      );
      setPages((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      setSelectedPage(saved);
      setStatus({ kind: "saved" });
      return true;
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
      return false;
    }
  };

  const duplicatePage = async (page: StorefrontCustomPage) => {
    setStatus({ kind: "saving" });
    try {
      const copy = await runtimePagesApi.createPage({
        ...(page.description !== undefined
          ? { description: page.description }
          : {}),
        slug: createDuplicatePageSlug(page.slug, pages),
        title: `${page.title} copia`,
      });
      const saved = await runtimePagesApi.updatePage(copy.id, {
        ...toPageUpdate(page),
        slug: copy.slug,
        title: copy.title,
        visible: false,
      });
      setPages((current) => [...current, saved]);
      setSelectedPage(saved);
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  const deletePage = async (page: StorefrontCustomPage) => {
    setStatus({ kind: "saving" });
    try {
      await runtimePagesApi.deletePage(page.id);
      setPages((current) => current.filter((item) => item.id !== page.id));
      if (selectedPage?.id === page.id) setSelectedPage(null);
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  const builderConfig = draftSettings
    ? createBuilderConfigFromSettings(draftSettings)
    : null;
  const clearSavedStatus = () => {
    setStatus((current) =>
      current.kind === "saved" ? { kind: "ready" } : current,
    );
  };

  if (!draftSettings || !builderConfig) {
    return <StorefrontLoadingState status={status} />;
  }

  if (initialTab === "design") {
    return (
      <StorefrontMediaLibraryProvider api={runtimeMediaApi}>
        <WebsiteBuilderDesign
          isSaving={status.kind === "saving"}
          onDirty={clearSavedStatus}
          onSave={(input) => saveSettings(input.settings)}
          settings={draftSettings}
          statusMessage={toStatusMessage(status)}
        />
      </StorefrontMediaLibraryProvider>
    );
  }

  if (selectedPage) {
    return (
      <div className="website-builder-surface text-foreground">
        <StorefrontMediaLibraryProvider api={runtimeMediaApi}>
          <CustomPageEditor
            config={builderConfig}
            isSaving={status.kind === "saving"}
            onBack={() => setSelectedPage(null)}
            onDirty={clearSavedStatus}
            onSave={savePage}
            page={selectedPage}
            statusMessage={toStatusMessage(status)}
            storeSlug={draftSettings.identity.publicSlug}
          />
        </StorefrontMediaLibraryProvider>
      </div>
    );
  }

  return (
    <div className="website-builder-surface min-h-dvh p-4 text-foreground md:p-6">
      <CustomPagesList
        createDescription={createDescription}
        createSlug={createSlug}
        createTitle={createTitle}
        isBusy={status.kind === "saving"}
        onCreate={createPage}
        onCreateDescriptionChange={setCreateDescription}
        onCreateSlugChange={(value) => setCreateSlug(slugifyCustomPage(value))}
        onCreateTitleChange={(value) => {
          setCreateTitle(value);
          if (!createSlug) setCreateSlug(slugifyCustomPage(value));
        }}
        onDelete={(page) => void deletePage(page)}
        onDuplicate={(page) => void duplicatePage(page)}
        onSelect={setSelectedPage}
        pages={pages}
        statusMessage={toStatusMessage(status)}
        storeSlug={draftSettings.identity.publicSlug}
      />
    </div>
  );
}

function toPageUpdate(page: StorefrontCustomPage) {
  return cleanUndefined({
    ...(page.accentColor !== undefined
      ? { accentColor: page.accentColor }
      : {}),
    ...(page.backgroundColor !== undefined
      ? { backgroundColor: page.backgroundColor }
      : {}),
    components: page.components,
    ...(page.description !== undefined
      ? { description: page.description }
      : {}),
    ...(page.fontFamily !== undefined ? { fontFamily: page.fontFamily } : {}),
    ...(page.pageBackground !== undefined
      ? { pageBackground: page.pageBackground }
      : {}),
    ...(page.pageChrome !== undefined ? { pageChrome: page.pageChrome } : {}),
    ...(page.seo !== undefined ? { seo: page.seo } : {}),
    slug: page.slug,
    title: page.title,
    visible: page.visible,
  });
}

function toStatusMessage(status: StorefrontCustomizationStatus) {
  if (status.kind === "error")
    return { text: status.message, type: "error" as const };
  if (status.kind === "saved")
    return { text: "Salvo com sucesso!", type: "success" as const };
  return null;
}

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(error, "Nao foi possivel salvar a vitrine.");
}

function cleanUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as T;
}
