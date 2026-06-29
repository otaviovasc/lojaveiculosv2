"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  BackgroundSelector,
  BuilderComponentRenderer,
  COMPONENT_CATEGORIES,
  COMPONENT_LABELS,
} from "@/modules/storefront/components/builder";
import { BuilderEditorCanvasContext } from "@/modules/storefront/components/builder/builder-editor-canvas-context";
import { collectFontFamiliesFromPageComponents } from "@/modules/storefront/components/builder/collect-component-fonts";
import { CustomPageChrome } from "@/modules/storefront/components/custom-page/CustomPageChrome";
import { migrateModularCustomRoute } from "@/modules/storefront/lib/migrate-custom-page-route";
import type { TemplateProperty } from "@/modules/storefront/templates/registry";
import {
  StoreConfigSchema,
  type BackgroundConfig,
  type PageChrome,
  type PageComponent,
  type PageComponentType,
  type StoreConfig,
  type ViewportMode,
} from "@centroimovel/types";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  EyeOff,
  Globe,
  GripVertical,
  Loader2,
  Monitor,
  Plus,
  Save,
  Search,
  Settings,
  Smartphone,
  Tablet,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PropsEditorRegistry } from "./components";
import { PreviewViewportFrame } from "./components/PreviewViewportFrame";
import { createDefaultBlockProps } from "./default-block-props";

interface CustomPage {
  id: string;
  slug: string;
  label: string;
  description?: string;
  visible: boolean;
  secretToken?: string;
  backgroundColor?: string;
  accentColor?: string;
  fontFamily?: string;
  pageBackground?: BackgroundConfig;
  pageChrome?: PageChrome;
  components: PageComponent[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImageUrl?: string;
  };
}

function buildGoogleFontsHref(fonts: string[]): string | null {
  const families = fonts
    .map((font) => font?.trim())
    .filter(
      (font): font is string =>
        Boolean(font) &&
        font !== "system-ui" &&
        font !== "serif" &&
        font !== "sans-serif",
    )
    .map((font) => `family=${font.replace(/\s+/g, "+")}:wght@400;500;600;700`);

  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

function getPreviewUrl(slug: string, page: CustomPage): string {
  const tokenSuffix = page.secretToken ? `?token=${page.secretToken}` : "";
  return `/${slug}/p/${page.slug}${tokenSuffix}`;
}

function buildBackgroundGradient(
  background?: BackgroundConfig,
): string | undefined {
  if (background?.type !== "gradient" || !background.gradient) {
    return undefined;
  }

  const stops = background.gradient.stops
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(", ");

  return background.gradient.type === "radial"
    ? `radial-gradient(${stops})`
    : `linear-gradient(${background.gradient.angle}deg, ${stops})`;
}

function mapPreviewProperty(
  property: Record<string, unknown>,
): TemplateProperty {
  const photos = Array.isArray(property.photos)
    ? (property.photos as Array<{ url?: string; isCover?: boolean }>).filter(
        (photo) => Boolean(photo?.url),
      )
    : [];
  const coverPhoto = photos.find((photo) => photo.isCover) || photos[0];

  return {
    id: String(property.id || ""),
    title: String(property.title || "Imóvel sem título"),
    type: String(property.type || ""),
    purpose: String(property.purpose || "VENDA"),
    price: Number(property.price || 0),
    rentPrice: property.rentPrice ? Number(property.rentPrice) : null,
    areaM2: property.areaM2 ? Number(property.areaM2) : null,
    bedrooms: typeof property.bedrooms === "number" ? property.bedrooms : null,
    bathrooms:
      typeof property.bathrooms === "number" ? property.bathrooms : null,
    parkingSpots:
      typeof property.parkingSpots === "number" ? property.parkingSpots : null,
    neighborhood:
      typeof property.neighborhood === "string" ? property.neighborhood : null,
    city: typeof property.city === "string" ? property.city : null,
    state: typeof property.state === "string" ? property.state : null,
    coverPhotoUrl: coverPhoto?.url || null,
    amenities: Array.isArray(property.amenities)
      ? (property.amenities as string[])
      : [],
    featured: Boolean(property.featured),
    hidePrice: Boolean(property.hidePrice),
  };
}

export default function PageEditorPage() {
  const params = useParams<{ slug: string; id: string }>();
  const slug = params.slug;
  const pageId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [page, setPage] = useState<CustomPage | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    null,
  );
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [activeTab, setActiveTab] = useState<"blocks" | "canvas" | "editor">(
    "canvas",
  );
  const [lastSavedPage, setLastSavedPage] = useState<CustomPage | null>(null);
  const [deleteComponentId, setDeleteComponentId] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [propertiesList, setPropertiesList] = useState<TemplateProperty[]>([]);
  const [workspaceDisplayName, setWorkspaceDisplayName] = useState<
    string | null
  >(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Fetch page and config
  useEffect(() => {
    async function fetchData() {
      try {
        const [storefrontRes, propertiesRes] = await Promise.all([
          fetch(`/api/workspaces/${slug}/storefront`),
          fetch(
            `/api/workspaces/${slug}/properties?status=DISPONIVEL&pageSize=500`,
          ),
        ]);

        const storefrontData = await storefrontRes.json();
        if (storefrontRes.ok && storefrontData.config) {
          setConfig(storefrontData.config);
        }
        if (
          storefrontRes.ok &&
          typeof storefrontData.workspaceName === "string"
        ) {
          setWorkspaceDisplayName(storefrontData.workspaceName);
        }

        // Fetch properties for the property grid selector
        if (propertiesRes.ok) {
          const propertiesData = await propertiesRes.json();
          const availableProperties = (
            (propertiesData.items || []) as Array<Record<string, unknown>>
          ).map(mapPreviewProperty);
          setPropertiesList(availableProperties);
        }

        if (storefrontRes.ok && storefrontData.customRoutes) {
          const foundPage = (storefrontData.customRoutes as CustomPage[]).find(
            (p) => p.id === pageId,
          );
          if (foundPage) {
            const migrated = migrateModularCustomRoute(
              foundPage as unknown as Record<string, unknown>,
            ) as unknown as CustomPage;
            setPage(migrated);
            setLastSavedPage(migrated);
            if (migrated.components && migrated.components.length > 0) {
              setSelectedComponentId(migrated.components[0]?.id ?? null);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug, pageId]);

  const isDirty = useMemo(() => {
    if (!page || !lastSavedPage) return false;
    return JSON.stringify(page) !== JSON.stringify(lastSavedPage);
  }, [page, lastSavedPage]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue =
          "Você tem alterações não salvas. Tem certeza que deseja sair?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  // Get selected component
  const selectedComponent =
    page?.components.find((c) => c.id === selectedComponentId) ?? null;

  // Add component
  const addComponent = useCallback(
    (type: PageComponentType) => {
      if (!page) return;

      const baseProps = createDefaultBlockProps(type, slug) as Record<
        string,
        unknown
      >;

      const newComponent: PageComponent = {
        id: "c_" + Math.random().toString(36).substring(2, 10),
        type,
        props: baseProps,
        visible: true,
        order: page.components.length,
      };

      setPage({
        ...page,
        components: [...page.components, newComponent],
      });
      setSelectedComponentId(newComponent.id);

      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setActiveTab("canvas");
      }
    },
    [page, slug],
  );

  // Update component props
  const updateComponentProps = useCallback(
    (componentId: string, props: Record<string, unknown>) => {
      if (!page) return;

      setPage({
        ...page,
        components: page.components.map((c) =>
          c.id === componentId ? { ...c, props: { ...c.props, ...props } } : c,
        ),
      });
    },
    [page],
  );

  // Delete component
  const deleteComponent = useCallback((componentId: string) => {
    setDeleteComponentId(componentId);
  }, []);

  const performDeleteComponent = useCallback(
    (componentId: string) => {
      if (!page) return;

      const newComponents = page.components
        .filter((c) => c.id !== componentId)
        .map((c, i) => ({ ...c, order: i }));

      setPage({
        ...page,
        components: newComponents,
      });

      if (selectedComponentId === componentId) {
        setSelectedComponentId(newComponents[0]?.id || null);
      }
      setDeleteComponentId(null);
      toast.success("Componente removido.");
    },
    [page, selectedComponentId],
  );

  // Duplicate component
  const duplicateComponent = useCallback(
    (component: PageComponent) => {
      if (!page) return;

      const newComponent: PageComponent = {
        ...component,
        id: "c_" + Math.random().toString(36).substring(2, 10),
        order: page.components.length,
      };

      setPage({
        ...page,
        components: [...page.components, newComponent],
      });
      setSelectedComponentId(newComponent.id);
    },
    [page],
  );

  // Move component
  const moveComponent = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!page) return;

      const newComponents = [...page.components];
      const [moved] = newComponents.splice(fromIndex, 1);
      if (!moved) return;
      newComponents.splice(toIndex, 0, moved);

      setPage({
        ...page,
        components: newComponents.map((c, i) => ({ ...c, order: i })),
      });
    },
    [page],
  );

  // Save page
  const handleSave = useCallback(
    async (customPageToSave?: CustomPage) => {
      const pageToSave = customPageToSave || page;
      if (!pageToSave) return;

      setSaving(true);

      try {
        const storefrontRes = await fetch(`/api/workspaces/${slug}/storefront`);
        const storefrontData = await storefrontRes.json();
        const existingRoutes = (storefrontData.customRoutes ||
          []) as CustomPage[];

        const updatedRoutes = existingRoutes.map((r) =>
          r.id === pageToSave.id ? pageToSave : r,
        );

        // If page not in routes yet, add it
        if (!updatedRoutes.find((r) => r.id === pageToSave.id)) {
          updatedRoutes.push(pageToSave);
        }

        const res = await fetch(`/api/workspaces/${slug}/storefront`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customRoutes: updatedRoutes }),
        });

        if (res.ok) {
          const saveResult = await res.json();
          const savedRoutes = (saveResult.storefront?.customRoutes ||
            []) as CustomPage[];
          const savedPage = savedRoutes.find(
            (route) => route.id === pageToSave.id,
          );
          if (savedPage) {
            const migrated = migrateModularCustomRoute(
              savedPage as unknown as Record<string, unknown>,
            ) as unknown as CustomPage;
            setPage(migrated);
            setLastSavedPage(migrated);
          }
          toast.success("Página salva com sucesso!");
        } else {
          toast.error("Erro ao salvar a página.");
        }
      } catch {
        toast.error("Erro de conexão ao salvar.");
      } finally {
        setSaving(false);
      }
    },
    [page, slug],
  );

  // Toggle visibility
  const toggleVisibility = useCallback(async () => {
    if (!page) return;

    const updatedPage = {
      ...page,
      visible: !page.visible,
    };

    setPage(updatedPage);
    await handleSave(updatedPage);
  }, [page, handleSave]);

  // Get preview URL
  const previewUrl = page ? getPreviewUrl(slug, page) : "";
  const storefrontConfig = useMemo(() => {
    const parsedConfig = StoreConfigSchema.safeParse(config || {});
    return (parsedConfig.success ? parsedConfig.data : config || {}) as Record<
      string,
      unknown
    >;
  }, [config]);
  const previewConfig = useMemo(() => {
    if (!page) return storefrontConfig;
    return {
      ...storefrontConfig,
      ...(page.accentColor ? { accentColor: page.accentColor } : {}),
      ...(page.fontFamily
        ? {
            fonts: {
              ...(((storefrontConfig.fonts as Record<string, unknown>) ||
                {}) as Record<string, unknown>),
              heading: page.fontFamily,
              body: page.fontFamily,
            },
          }
        : {}),
    };
  }, [page, storefrontConfig]);
  const previewPageBackground = useMemo<BackgroundConfig | undefined>(() => {
    const configBackgroundColor =
      (storefrontConfig.backgroundColor as string | undefined) || "#F8F5F0";
    if (page?.pageBackground) return page.pageBackground;
    return {
      type: "solid",
      solidColor: page?.backgroundColor || configBackgroundColor,
    };
  }, [page, storefrontConfig.backgroundColor]);
  const visibleComponents = useMemo(
    () =>
      (page?.components.filter((component) => component.visible) ?? []).sort(
        (a, b) => a.order - b.order,
      ),
    [page],
  );
  const previewFontsHref = useMemo(() => {
    if (!config || !page) return null;
    const storefrontConfig = config as {
      fonts?: { heading?: string; body?: string };
    };
    const fromBlocks = collectFontFamiliesFromPageComponents(
      page.components as Array<{
        type: string;
        props: Record<string, unknown>;
      }>,
    );
    return buildGoogleFontsHref([
      storefrontConfig.fonts?.heading || "",
      storefrontConfig.fonts?.body || "",
      page.fontFamily || "",
      ...fromBlocks,
    ]);
  }, [config, page]);

  // Filter components by search
  const allComponents = Object.entries(COMPONENT_CATEGORIES).flatMap(
    ([category, items]) => items.map((item) => ({ ...item, category })),
  );
  const filteredComponents = searchQuery
    ? allComponents.filter((c) =>
        c.label.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allComponents;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="mb-4 text-muted-foreground">Página não encontrada</p>
        <Button asChild>
          <Link href={`/${slug}/admin/website/pages`}>Voltar para Páginas</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* Top Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-card/80 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" className="px-2 sm:px-3" asChild>
            <Link href={`/${slug}/admin/website/pages`}>
              <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate max-w-[80px] xs:max-w-[120px] sm:max-w-none">
              {page.label}
            </h1>
            <p className="text-[10px] text-muted-foreground hidden sm:block truncate">
              /p/{page.slug}
            </p>
          </div>
          <CustomDropdown
            value={page.visible ? "published" : "draft"}
            onChange={(val) => {
              if ((val === "published") !== page.visible) {
                toggleVisibility();
              }
            }}
            options={[
              {
                value: "draft",
                label: "Rascunho",
                icon: saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500 shrink-0" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                ),
              },
              {
                value: "published",
                label: "Publicado",
                icon: saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500 shrink-0" />
                ) : (
                  <Globe className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ),
              },
            ]}
            size="sm"
            className="w-28 sm:w-36"
            triggerClassName={cn(
              "font-semibold border transition-all duration-200 shadow-sm px-2 sm:px-3",
              page.visible
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                : "bg-amber-50/80 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/40",
            )}
            disabled={saving}
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {isDirty && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-amber-500 font-medium animate-pulse mr-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Alterações não salvas
            </span>
          )}
          <Button
            variant={showPageSettings ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPageSettings(!showPageSettings)}
            className="px-2.5 sm:px-3"
            title="Configurações"
          >
            <Settings className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Configurações</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="px-2.5 sm:px-3"
            title="Visualizar"
            asChild
          >
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Visualizar</span>
            </a>
          </Button>
          <Button
            size="sm"
            className="px-2.5 sm:px-3"
            title="Salvar"
            onClick={() => handleSave()}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1.5" />
            ) : (
              <Save className="h-3.5 w-3.5 sm:mr-1.5" />
            )}
            <span className="hidden sm:inline">
              {saving ? "Salvando..." : "Salvar"}
            </span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Page Settings Sidebar */}
        {showPageSettings && (
          <div className="fixed inset-y-0 left-0 z-50 w-full sm:w-80 shrink-0 border-r border-border/50 bg-card overflow-y-auto p-4 space-y-4 shadow-2xl lg:shadow-none lg:static lg:z-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Configurações da Página</h3>
              <button
                onClick={() => setShowPageSettings(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <Label>Nome da Página</Label>
              <Input
                value={page?.label || ""}
                onChange={(e) =>
                  setPage(page ? { ...page, label: e.target.value } : null)
                }
                placeholder="Nome da página"
              />
            </div>

            <div className="space-y-2">
              <Label>URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/p/</span>
                <Input
                  value={page?.slug || ""}
                  onChange={(e) =>
                    setPage(
                      page
                        ? {
                            ...page,
                            slug: e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, "-"),
                          }
                        : null,
                    )
                  }
                  placeholder="slug"
                />
              </div>
            </div>

            <div className="space-y-3">
              <BackgroundSelector
                value={page?.pageBackground}
                onChange={(config) =>
                  setPage(page ? { ...page, pageBackground: config } : null)
                }
                workspaceSlug={slug}
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label className="font-medium">Cabeçalho e rodapé</Label>
              <p className="text-[11px] text-muted-foreground">
                Mesmo visual da página publicada (logo, voltar, rodapé fino com
                ©). No construtor o topo acompanha o painel de pré-visualização.
                Você pode ocultar cabeçalho ou rodapé do site abaixo ou ajustar
                cores opcionais do link e do rodapé fino.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">Estilo do topo</Label>
                <select
                  className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm"
                  value={page?.pageChrome?.headerVariant ?? "minimal"}
                  onChange={(e) =>
                    setPage(
                      page
                        ? {
                            ...page,
                            pageChrome: {
                              ...page.pageChrome,
                              headerVariant: e.target.value as
                                "minimal" | "glass" | "solid",
                            } as PageChrome,
                          }
                        : null,
                    )
                  }
                >
                  <option value="minimal">Vidro leve (padrão)</option>
                  <option value="glass">Vidro forte</option>
                  <option value="solid">Sólido</option>
                </select>
              </div>
              {page?.pageChrome?.headerVariant === "solid" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Cor de fundo do topo</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={page.pageChrome?.headerBgColor || "#ffffff"}
                      onChange={(e) =>
                        setPage(
                          page
                            ? {
                                ...page,
                                pageChrome: {
                                  ...page.pageChrome,
                                  headerBgColor: e.target.value,
                                } as PageChrome,
                              }
                            : null,
                        )
                      }
                      className="h-9 w-14 cursor-pointer rounded border border-border/50"
                    />
                    <Input
                      value={page.pageChrome?.headerBgColor || ""}
                      onChange={(e) =>
                        setPage(
                          page
                            ? {
                                ...page,
                                pageChrome: {
                                  ...page.pageChrome,
                                  headerBgColor: e.target.value || undefined,
                                } as PageChrome,
                              }
                            : null,
                        )
                      }
                      placeholder="#ffffff"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  checked={page?.pageChrome?.showHeader !== false}
                  onChange={(e) =>
                    setPage(
                      page
                        ? {
                            ...page,
                            pageChrome: {
                              ...page.pageChrome,
                              showHeader: e.target.checked,
                            } as PageChrome,
                          }
                        : null,
                    )
                  }
                />
                Mostrar cabeçalho
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  checked={page?.pageChrome?.showFooter !== false}
                  onChange={(e) =>
                    setPage(
                      page
                        ? {
                            ...page,
                            pageChrome: {
                              ...page.pageChrome,
                              showFooter: e.target.checked,
                            } as PageChrome,
                          }
                        : null,
                    )
                  }
                />
                Mostrar rodapé
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  checked={page?.pageChrome?.showSiteLink !== false}
                  onChange={(e) =>
                    setPage(
                      page
                        ? {
                            ...page,
                            pageChrome: {
                              ...page.pageChrome,
                              showSiteLink: e.target.checked,
                            } as PageChrome,
                          }
                        : null,
                    )
                  }
                />
                Link &quot;Voltar ao site&quot;
              </label>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Texto extra no rodapé (opcional)
                </Label>
                <Input
                  value={page?.pageChrome?.footerExtraLine || ""}
                  onChange={(e) =>
                    setPage(
                      page
                        ? {
                            ...page,
                            pageChrome: {
                              ...page.pageChrome,
                              footerExtraLine: e.target.value || undefined,
                            } as PageChrome,
                          }
                        : null,
                    )
                  }
                  placeholder="Ex.: CRECI 12345"
                />
              </div>
              {page && page.pageChrome?.showHeader !== false && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Cor do link &quot;Voltar ao site&quot; (opcional)
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      value={page.pageChrome?.headerLinkColor || "#57534e"}
                      onChange={(e) =>
                        setPage(
                          page
                            ? {
                                ...page,
                                pageChrome: {
                                  ...page.pageChrome,
                                  headerLinkColor: e.target.value,
                                } as PageChrome,
                              }
                            : null,
                        )
                      }
                      className="h-9 w-14 cursor-pointer rounded border border-border/50"
                    />
                    <Input
                      value={page.pageChrome?.headerLinkColor || ""}
                      onChange={(e) =>
                        setPage(
                          page
                            ? {
                                ...page,
                                pageChrome: {
                                  ...page.pageChrome,
                                  headerLinkColor:
                                    e.target.value.trim() || undefined,
                                } as PageChrome,
                              }
                            : null,
                        )
                      }
                      placeholder="Padrão do tema"
                      className="min-w-[7rem] flex-1 font-mono text-xs"
                    />
                    {page.pageChrome?.headerLinkColor ? (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline"
                        onClick={() =>
                          setPage(
                            page
                              ? {
                                  ...page,
                                  pageChrome: {
                                    ...page.pageChrome,
                                    headerLinkColor: undefined,
                                  } as PageChrome,
                                }
                              : null,
                          )
                        }
                      >
                        Limpar
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
              {page && page.pageChrome?.showFooter !== false && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Cor do rodapé do site (©, opcional)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Aplica-se ao rodapé fino do site, não ao bloco Rodapé da
                    página.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      value={
                        page.pageChrome?.footerChromeTextColor || "#78716c"
                      }
                      onChange={(e) =>
                        setPage(
                          page
                            ? {
                                ...page,
                                pageChrome: {
                                  ...page.pageChrome,
                                  footerChromeTextColor: e.target.value,
                                } as PageChrome,
                              }
                            : null,
                        )
                      }
                      className="h-9 w-14 cursor-pointer rounded border border-border/50"
                    />
                    <Input
                      value={page.pageChrome?.footerChromeTextColor || ""}
                      onChange={(e) =>
                        setPage(
                          page
                            ? {
                                ...page,
                                pageChrome: {
                                  ...page.pageChrome,
                                  footerChromeTextColor:
                                    e.target.value.trim() || undefined,
                                } as PageChrome,
                              }
                            : null,
                        )
                      }
                      placeholder="Padrão do tema"
                      className="min-w-[7rem] flex-1 font-mono text-xs"
                    />
                    {page.pageChrome?.footerChromeTextColor ? (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline"
                        onClick={() =>
                          setPage(
                            page
                              ? {
                                  ...page,
                                  pageChrome: {
                                    ...page.pageChrome,
                                    footerChromeTextColor: undefined,
                                  } as PageChrome,
                                }
                              : null,
                          )
                        }
                      >
                        Limpar
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Cor de Destaque</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={page?.accentColor || "#C9A84C"}
                  onChange={(e) =>
                    setPage(
                      page ? { ...page, accentColor: e.target.value } : null,
                    )
                  }
                  className="h-9 w-14 rounded cursor-pointer"
                />
                <Input
                  value={page?.accentColor || "#C9A84C"}
                  onChange={(e) =>
                    setPage(
                      page ? { ...page, accentColor: e.target.value } : null,
                    )
                  }
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label className="font-medium">SEO</Label>
              <Input
                value={page?.seo?.metaTitle || ""}
                onChange={(e) =>
                  setPage(
                    page
                      ? {
                          ...page,
                          seo: { ...page.seo, metaTitle: e.target.value },
                        }
                      : null,
                  )
                }
                placeholder="Título meta"
              />
              <Textarea
                value={page?.seo?.metaDescription || ""}
                onChange={(e) =>
                  setPage(
                    page
                      ? {
                          ...page,
                          seo: { ...page.seo, metaDescription: e.target.value },
                        }
                      : null,
                  )
                }
                placeholder="Descrição meta"
                rows={3}
              />
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label className="font-medium">Link de Preview</Label>
              <p className="text-[11px] text-muted-foreground">
                Compartilhe este link para visualizar a página mesmo sem
                publicar
              </p>
              <div className="flex items-center gap-2">
                <Input value={previewUrl} readOnly className="text-xs" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(previewUrl);
                    toast.success("Link copiado!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Left Sidebar - Component Palette */}
        <div
          className={cn(
            "w-full lg:w-64 shrink-0 border-r border-border/50 bg-card/50 overflow-y-auto",
            activeTab === "blocks" ? "block" : "hidden lg:block",
          )}
        >
          <div className="p-3 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar componentes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="p-3 space-y-4">
            {Object.entries(COMPONENT_CATEGORIES).map(([category, items]) => {
              const filteredItems = searchQuery
                ? items.filter((item) =>
                    item.label
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                  )
                : items;

              if (filteredItems.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {category === "conteudo"
                      ? "Conteúdo"
                      : category === "imagens"
                        ? "Imagens"
                        : category === "imoveis"
                          ? "Imóveis"
                          : category === "layout"
                            ? "Layout"
                            : "Design"}
                  </h3>
                  <div className="space-y-1">
                    {filteredItems.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <button
                          key={item.type}
                          onClick={() =>
                            addComponent(item.type as PageComponentType)
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 lg:py-2 text-sm hover:bg-muted transition-colors text-left"
                        >
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center - Live Preview */}
        <div
          className={cn(
            "flex-1 flex flex-col overflow-hidden bg-muted/30",
            activeTab === "canvas" ? "flex w-full" : "hidden lg:flex",
          )}
        >
          {/* Viewport controls */}
          <div className="flex shrink-0 items-center justify-center gap-1 border-b border-border/50 bg-card/50 px-4 py-2">
            <button
              onClick={() => setViewportMode("desktop")}
              className={cn(
                "flex items-center justify-center rounded-md p-2 transition-colors",
                viewportMode === "desktop"
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted",
              )}
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewportMode("tablet")}
              className={cn(
                "flex items-center justify-center rounded-md p-2 transition-colors",
                viewportMode === "tablet"
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted",
              )}
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewportMode("mobile")}
              className={cn(
                "flex items-center justify-center rounded-md p-2 transition-colors",
                viewportMode === "mobile"
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted",
              )}
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          {/* Preview canvas — iframe viewport matches device width; scroll inside iframe */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {previewFontsHref && (
              <>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                  rel="preconnect"
                  href="https://fonts.gstatic.com"
                  crossOrigin="anonymous"
                />
                <link rel="stylesheet" href={previewFontsHref} />
              </>
            )}
            <PreviewViewportFrame
              mode={viewportMode}
              className="min-h-0 flex-1"
            >
              <BuilderEditorCanvasContext.Provider value={true}>
                <div
                  className="relative w-full overflow-hidden bg-background shadow-lg transition-all"
                  style={{
                    backgroundColor:
                      previewPageBackground?.type === "solid"
                        ? previewPageBackground.solidColor
                        : undefined,
                  }}
                >
                  {previewPageBackground?.type === "gradient" && (
                    <div
                      className="absolute inset-0 z-0"
                      style={{
                        background: buildBackgroundGradient(
                          previewPageBackground,
                        ),
                      }}
                    />
                  )}
                  {previewPageBackground?.type === "image" &&
                    previewPageBackground.imageUrl && (
                      <div
                        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                        style={{
                          backgroundImage: `url(${previewPageBackground.imageUrl})`,
                        }}
                      >
                        {previewPageBackground.overlay?.enabled && (
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundColor:
                                previewPageBackground.overlay.color,
                              opacity:
                                (previewPageBackground.overlay.opacity ?? 50) /
                                100,
                            }}
                          />
                        )}
                      </div>
                    )}
                  {previewPageBackground?.type === "video" &&
                    previewPageBackground.videoUrl && (
                      <video
                        autoPlay
                        muted
                        loop
                        className="absolute inset-0 z-0 h-full w-full object-cover"
                      >
                        <source src={previewPageBackground.videoUrl} />
                      </video>
                    )}
                  <div className="relative z-10 flex min-h-[280px] flex-1 flex-col">
                    <CustomPageChrome
                      embedded
                      slug={slug}
                      corretorName={
                        (previewConfig as StoreConfig).corretorName ||
                        workspaceDisplayName ||
                        undefined
                      }
                      logoUrl={(previewConfig as StoreConfig).logoUrl}
                      pageChrome={page.pageChrome}
                    >
                      {visibleComponents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <Plus className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <h3 className="mb-2 text-lg font-semibold">
                            Nenhum componente
                          </h3>
                          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                            Adicione componentes da paleta à esquerda para
                            começar a construir sua página.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {visibleComponents.map((component, index) => (
                            <div
                              key={component.id}
                              draggable
                              onDragStart={(e) => {
                                setDraggedIndex(index);
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("text/html", "");
                              }}
                              onDragEnd={() => {
                                setDraggedIndex(null);
                                setDropTargetIndex(null);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                setDropTargetIndex(index);
                              }}
                              onDragEnter={(e) => {
                                e.preventDefault();
                                setDropTargetIndex(index);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (
                                  draggedIndex !== null &&
                                  draggedIndex !== index
                                ) {
                                  moveComponent(draggedIndex, index);
                                }
                                setDraggedIndex(null);
                                setDropTargetIndex(null);
                              }}
                              className={cn(
                                "group relative cursor-pointer transition-all",
                                selectedComponentId === component.id
                                  ? "ring-2 ring-primary ring-offset-2 z-40"
                                  : "hover:ring-1 hover:ring-primary/30 hover:ring-offset-1 hover:z-30",
                                draggedIndex === index && "opacity-50",
                                dropTargetIndex === index &&
                                  draggedIndex !== index &&
                                  "ring-2 ring-primary ring-inset",
                              )}
                              onClick={() => {
                                setSelectedComponentId(component.id);
                                if (
                                  typeof window !== "undefined" &&
                                  window.innerWidth < 1024
                                ) {
                                  setActiveTab("editor");
                                }
                              }}
                            >
                              {/* Drag handle and actions */}
                              <div
                                className={cn(
                                  "absolute left-2 top-2 z-[60] flex items-center gap-1 rounded-lg bg-card/95 border border-border shadow-md px-1.5 py-1 transition-opacity",
                                  selectedComponentId === component.id
                                    ? "opacity-100"
                                    : "opacity-0 group-hover:opacity-100",
                                )}
                              >
                                <div
                                  className="cursor-move rounded p-1 hover:bg-muted transition-colors"
                                  title="Arrastar"
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="h-4 w-px bg-border" />

                                {/* Move Up */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (index > 0) {
                                      moveComponent(index, index - 1);
                                    }
                                  }}
                                  disabled={index === 0}
                                  className={cn(
                                    "rounded p-1 hover:bg-muted transition-colors text-muted-foreground",
                                    index === 0 &&
                                      "opacity-30 cursor-not-allowed",
                                  )}
                                  title="Mover para cima"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </button>

                                {/* Move Down */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (index < visibleComponents.length - 1) {
                                      moveComponent(index, index + 1);
                                    }
                                  }}
                                  disabled={
                                    index === visibleComponents.length - 1
                                  }
                                  className={cn(
                                    "rounded p-1 hover:bg-muted transition-colors text-muted-foreground",
                                    index === visibleComponents.length - 1 &&
                                      "opacity-30 cursor-not-allowed",
                                  )}
                                  title="Mover para baixo"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>

                                <div className="h-4 w-px bg-border" />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateComponent(component);
                                  }}
                                  className="rounded p-1 hover:bg-muted transition-colors"
                                  title="Duplicar"
                                >
                                  <Copy className="h-4 w-4 text-muted-foreground" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteComponent(component.id);
                                  }}
                                  className="rounded p-1 hover:bg-destructive/10 transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </button>
                              </div>

                              {/* Render component */}
                              <BuilderComponentRenderer
                                type={component.type}
                                props={component.props}
                                config={previewConfig as StoreConfig}
                                slug={slug}
                                properties={propertiesList}
                                pageBackground={previewPageBackground}
                                workspaceDisplayName={workspaceDisplayName}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </CustomPageChrome>
                  </div>
                </div>
              </BuilderEditorCanvasContext.Provider>
            </PreviewViewportFrame>
          </div>
        </div>

        {/* Right Sidebar - Props Editor */}
        <div
          className={cn(
            "w-full lg:w-80 shrink-0 border-l border-border/50 bg-card/50 overflow-y-auto",
            activeTab === "editor" ? "block" : "hidden lg:block",
          )}
        >
          {selectedComponent ? (
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-8 w-8 lg:hidden shrink-0"
                    onClick={() => setActiveTab("canvas")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="font-semibold truncate">
                    {COMPONENT_LABELS[selectedComponent.type] ||
                      selectedComponent.type}
                  </h3>
                </div>
                <button
                  onClick={() => deleteComponent(selectedComponent.id)}
                  className="rounded p-1 hover:bg-muted text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <PropsEditorRegistry
                type={selectedComponent.type}
                props={selectedComponent.props}
                onChange={(newProps) =>
                  updateComponentProps(selectedComponent.id, newProps)
                }
                properties={propertiesList}
                workspaceSlug={slug}
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Selecione um componente para editar suas propriedades
              </p>
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setActiveTab("canvas")}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Voltar ao Canvas
              </Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteComponentId !== null}
        onClose={() => setDeleteComponentId(null)}
        onConfirm={() => {
          if (deleteComponentId) {
            performDeleteComponent(deleteComponentId);
          }
        }}
        title="Excluir Componente"
        description="Tem certeza que deseja remover este componente? Todas as configurações feitas nele serão perdidas."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="destructive"
      />

      {/* Bottom Tab Switcher (Mobile/Tablet only) */}
      <div className="lg:hidden shrink-0 border-t border-border/50 bg-card px-4 py-2 flex items-center justify-around z-40 shadow-lg backdrop-blur-sm">
        <button
          onClick={() => setActiveTab("blocks")}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[10px] sm:text-xs font-semibold transition-all rounded-xl",
            activeTab === "blocks"
              ? "text-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Blocos</span>
        </button>
        <button
          onClick={() => setActiveTab("canvas")}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[10px] sm:text-xs font-semibold transition-all rounded-xl",
            activeTab === "canvas"
              ? "text-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Monitor className="h-4.5 w-4.5" />
          <span>Canvas</span>
        </button>
        <button
          onClick={() => setActiveTab("editor")}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[10px] sm:text-xs font-semibold transition-all rounded-xl",
            activeTab === "editor"
              ? "text-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Settings className="h-4.5 w-4.5" />
          <span>Ajustes</span>
          {selectedComponent && (
            <span className="absolute top-1.5 right-[calc(50%-14px)] h-2 w-2 rounded-full bg-primary border border-card" />
          )}
        </button>
      </div>
    </div>
  );
}
