import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";
import type { SettingsApi } from "../settings/apiClient";
import { createStoreSettingsPatch } from "../settings/settingsPatch";
import type { StoreSettingsSnapshot } from "../settings/types";
import { CustomPageEditor } from "./CustomPageEditor";
import { CustomPagesList } from "./CustomPagesList";
import { createBuilderConfigFromSettings } from "./storefrontBuilderConfig";
import type { StorefrontPagesApi } from "./storefrontPagesApi";
import {
  createRuntimeSettingsApi,
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
  settingsApi,
}: {
  initialTab?: StorefrontCustomizationTab;
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

  const createPage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
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
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  const duplicatePage = async (page: StorefrontCustomPage) => {
    setStatus({ kind: "saving" });
    try {
      const copy = await runtimePagesApi.createPage({
        ...(page.description !== undefined
          ? { description: page.description }
          : {}),
        slug: `${page.slug}-copia`,
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

  if (!draftSettings || !builderConfig) {
    return <StorefrontLoadingState status={status} />;
  }

  if (initialTab === "design") {
    return (
      <WebsiteBuilderDesign
        isSaving={status.kind === "saving"}
        onSave={(input) => saveSettings(input.settings)}
        settings={draftSettings}
        statusMessage={toStatusMessage(status)}
      />
    );
  }

  if (selectedPage) {
    return (
      <div className="website-builder-surface text-foreground">
        <CustomPageEditor
          config={builderConfig}
          isSaving={status.kind === "saving"}
          onBack={() => setSelectedPage(null)}
          onSave={savePage}
          page={selectedPage}
        />
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
        onCreate={(event) => void createPage(event)}
        onCreateDescriptionChange={setCreateDescription}
        onCreateSlugChange={setCreateSlug}
        onCreateTitleChange={(value) => {
          setCreateTitle(value);
          if (!createSlug) setCreateSlug(slugify(value));
        }}
        onDelete={(page) => void deletePage(page)}
        onDuplicate={(page) => void duplicatePage(page)}
        onSelect={setSelectedPage}
        pages={pages}
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

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function cleanUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as T;
}
