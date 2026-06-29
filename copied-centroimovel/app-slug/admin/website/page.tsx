"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  TEMPLATE_IDS,
  TEMPLATE_INFO,
  type TemplateId,
  type Testimonial,
  type ViewportMode,
} from "@centroimovel/types";
import {
  Check,
  ExternalLink,
  Eye,
  Home,
  Info,
  Layers,
  Loader2,
  MessageSquareQuote,
  Palette,
  Phone,
  Save,
  Smartphone,
  Sparkles,
  Upload,
  User,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ColorsSection } from "./components/ColorsSection";
import { EditorPanel } from "./components/EditorPanel";
import {
  PreviewFrame,
  type PreviewFrameHandle,
} from "./components/PreviewFrame";
import { SectionsManager } from "./components/SectionsManager";
import { TestimonialsSection } from "./components/TestimonialsSection";

/* ──────────────────────────────────────────────────────────────────────────
   Template card branding
   ────────────────────────────────────────────────────────────────────────── */

const TEMPLATE_BRANDING: Record<
  TemplateId,
  { gradient: string; icon: string; tagline: string }
> = {
  aurora: {
    gradient:
      "from-amber-500/20 via-orange-400/10 to-rose-400/15 dark:from-amber-500/15 dark:via-orange-400/8 dark:to-rose-400/10",
    icon: "✦",
    tagline: "Alto padrão",
  },
  quadra: {
    gradient:
      "from-blue-500/15 via-violet-400/10 to-cyan-400/15 dark:from-blue-500/12 dark:via-violet-400/8 dark:to-cyan-400/10",
    icon: "◈",
    tagline: "Sua marca",
  },
};

export default function WebsiteBuilderPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  // ─── Core state ───
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [templateId, setTemplateId] = useState<TemplateId>("aurora");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const changeCountRef = useRef(0);
  const configRef = useRef<Record<string, unknown> | null>(null);
  configRef.current = config;

  // ─── Upload states ───
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingCorretorPhoto, setUploadingCorretorPhoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAbout, setUploadingAbout] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const corretorPhotoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const aboutImageInputRef = useRef<HTMLInputElement>(null);

  // ─── Layout state ───
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const previewRef = useRef<PreviewFrameHandle>(null);

  // ─── Fetch initial data ───
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/workspaces/${slug}/storefront`);
        const data = await r.json();
        if (r.ok && data) {
          setConfig(data.config ?? {});
          setTemplateId((data.templateId ?? "aurora") as TemplateId);
        } else {
          setConfig({});
          setTemplateId("aurora" as TemplateId);
        }
      } catch {
        setConfig({});
        setTemplateId("aurora" as TemplateId);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // ─── Config updater (with live preview sync) ───
  const updateConfig = useCallback((key: string, value: unknown) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
    setHasUnsavedChanges(true);
    changeCountRef.current++;

    // Sync to preview iframe
    previewRef.current?.postUpdate({ [key]: value });
  }, []);

  // ─── Image upload (presigned URL flow) ───
  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    configKey: string,
    assetType: "hero" | "avatar" | "logo" | "about",
    setUploading: (v: boolean) => void,
    inputRef: React.RefObject<HTMLInputElement | null>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Por favor, selecione uma imagem" });
      return;
    }

    setUploading(true);
    try {
      const res = await fetch(`/api/workspaces/${slug}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          assetType,
        }),
      });
      const { presignedUrl, publicUrl } = await res.json();

      const putRes = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) {
        throw new Error(
          `Erro ao enviar imagem para o storage: ${putRes.status}`,
        );
      }

      updateConfig(configKey, publicUrl);
      setMessage({ type: "success", text: "Imagem carregada com sucesso!" });
    } catch {
      setMessage({ type: "error", text: "Erro ao carregar imagem" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // ─── Save handler (uses configRef to avoid stale closure after testimonial add) ───
  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    const toSave = configRef.current ?? {};
    try {
      const res = await fetch(`/api/workspaces/${slug}/storefront`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          config: { ...toSave, templateId },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: "success", text: "Salvo com sucesso!" });
        setHasUnsavedChanges(false);
      } else {
        const errMsg =
          data?.error && typeof data.error === "object"
            ? Object.values(data.error).flat().join(", ")
            : (data?.error ?? "Erro ao salvar");
        setMessage({ type: "error", text: String(errMsg) });
      }
    } catch {
      setMessage({ type: "error", text: "Erro de conexão" });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  }, [slug, templateId]);

  // ─── Ctrl+S / Cmd+S shortcut ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!saving) handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saving, handleSave]);

  // ─── Loading state ───
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Build accordion items for the EditorPanel
  // ════════════════════════════════════════════════════════════════

  const accordionItems = [
    // ── 1. Template selector ──
    {
      id: "template",
      title: "Modelo do Site",
      icon: Sparkles,
      children: (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Escolha o modelo visual do seu site.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {TEMPLATE_IDS.map((id) => {
              const selected = templateId === id;
              const branding = TEMPLATE_BRANDING[id];
              return (
                <button
                  key={id}
                  onClick={() => {
                    setTemplateId(id);
                    updateConfig("templateId", id);
                  }}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300",
                    selected
                      ? "border-primary shadow-lg ring-2 ring-primary/20"
                      : "border-border/50 hover:border-muted-foreground/30 hover:shadow-md",
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-0 bg-linear-to-br transition-opacity duration-300",
                      branding.gradient,
                      selected
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-60",
                    )}
                  />
                  <div className="relative z-10">
                    <div className="mb-2 flex items-center justify-between">
                      <div
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors",
                          selected
                            ? "bg-primary/15 text-primary"
                            : "bg-muted/60 text-muted-foreground",
                        )}
                      >
                        <span className="text-xs">{branding.icon}</span>
                        {branding.tagline}
                      </div>
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60",
                        )}
                      >
                        <Check
                          className={cn(
                            "h-3 w-3 transition-opacity",
                            selected ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-bold">
                      {TEMPLATE_INFO[id].name}
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                      {TEMPLATE_INFO[id].description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ),
    },

    // ── 2. Brand & Professional ──
    {
      id: "brand",
      title: "Marca e Profissional",
      icon: User,
      children: (
        <div className="space-y-8">
          {/* Informações básicas */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Informações
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="corretorName">Nome / Título da Marca</Label>
                <Input
                  id="corretorName"
                  value={(config?.corretorName as string) ?? ""}
                  onChange={(e) => updateConfig("corretorName", e.target.value)}
                  placeholder="Ex: João Silva Imóveis"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="corretorCreci">Registro CRECI</Label>
                <Input
                  id="corretorCreci"
                  value={(config?.corretorCreci as string) ?? ""}
                  onChange={(e) =>
                    updateConfig("corretorCreci", e.target.value)
                  }
                  placeholder="Ex: 123456-F"
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Foto e Logo lado a lado */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Avatar upload */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sua Foto
              </h4>
              <input
                type="file"
                ref={corretorPhotoInputRef}
                accept="image/*"
                onChange={(e) =>
                  handleImageUpload(
                    e,
                    "corretorPhotoUrl",
                    "avatar",
                    setUploadingCorretorPhoto,
                    corretorPhotoInputRef,
                  )
                }
                className="hidden"
                id="corretor-photo-upload"
              />
              <div className="flex flex-col items-start gap-3">
                {config?.corretorPhotoUrl ? (
                  <div className="group relative">
                    <img
                      src={config.corretorPhotoUrl as string}
                      alt="Foto do corretor"
                      className="h-24 w-24 rounded-full border-2 border-border/50 object-cover shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => updateConfig("corretorPhotoUrl", null)}
                      className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="corretor-photo-upload"
                    className={cn(
                      "flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-2 border-dashed transition-all",
                      uploadingCorretorPhoto
                        ? "opacity-50 border-muted"
                        : "border-border hover:border-primary/40 hover:bg-primary/5",
                    )}
                  >
                    {uploadingCorretorPhoto ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                  </label>
                )}
                <span className="text-[11px] text-muted-foreground">
                  Foto profissional ou avatar
                </span>
              </div>
            </div>

            {/* Logo upload */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sua Logo
              </h4>
              <input
                type="file"
                ref={logoInputRef}
                accept="image/*"
                onChange={(e) =>
                  handleImageUpload(
                    e,
                    "logoUrl",
                    "logo",
                    setUploadingLogo,
                    logoInputRef,
                  )
                }
                className="hidden"
                id="logo-upload"
              />
              <div className="flex flex-col gap-3">
                {config?.logoUrl ? (
                  <div className="group relative inline-flex max-w-fit">
                    <img
                      src={config.logoUrl as string}
                      alt="Logo"
                      className="h-16 min-w-[120px] max-w-[140px] rounded-xl border border-border/50 object-contain bg-card p-2 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => updateConfig("logoUrl", null)}
                      className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="logo-upload"
                    className={cn(
                      "flex min-h-[100px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 transition-all",
                      uploadingLogo
                        ? "opacity-50 border-muted"
                        : "border-border hover:border-primary/40 hover:bg-primary/5",
                    )}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Clique para enviar
                        </span>
                      </>
                    )}
                  </label>
                )}
                <span className="text-[11px] text-muted-foreground">
                  PNG ou JPG, fundo transparente
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // ── 3. Colors ──
    {
      id: "colors",
      title: "Identidade Visual",
      icon: Palette,
      children: <ColorsSection config={config ?? {}} onUpdate={updateConfig} />,
    },

    // ── 4. Hero ──
    {
      id: "hero",
      title: "Capa do Site (Hero)",
      icon: Home,
      children: (
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Textos
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="heroTitle">Título de Impacto</Label>
                <Input
                  id="heroTitle"
                  value={(config?.heroTitle as string) ?? ""}
                  onChange={(e) => updateConfig("heroTitle", e.target.value)}
                  maxLength={80}
                  placeholder="Ex: O imóvel dos seus sonhos está aqui"
                  className="h-10"
                />
                <span className="text-[11px] text-muted-foreground">
                  Máx. 80 caracteres
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="heroSubtitle">Subtítulo ou Chamada</Label>
                <Input
                  id="heroSubtitle"
                  value={(config?.heroSubtitle as string) ?? ""}
                  onChange={(e) => updateConfig("heroSubtitle", e.target.value)}
                  maxLength={160}
                  placeholder="Ex: Atendimento exclusivo e personalizado"
                  className="h-10"
                />
                <span className="text-[11px] text-muted-foreground">
                  Máx. 160 caracteres
                </span>
              </div>
            </div>
          </div>

          {/* Hero image upload */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Imagem de Fundo
            </h4>
            <input
              type="file"
              ref={heroInputRef}
              accept="image/*"
              onChange={(e) =>
                handleImageUpload(
                  e,
                  "heroImageUrl",
                  "hero",
                  setUploadingHero,
                  heroInputRef,
                )
              }
              className="hidden"
              id="hero-image-upload"
            />
            {config?.heroImageUrl ? (
              <div className="group relative overflow-hidden rounded-xl border border-border/50">
                <img
                  src={config.heroImageUrl as string}
                  alt="Hero preview"
                  className="h-40 w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => updateConfig("heroImageUrl", null)}
                  >
                    <X className="mr-1 h-3.5 w-3.5" /> Remover
                  </Button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="hero-image-upload"
                className={cn(
                  "flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 transition-all",
                  uploadingHero
                    ? "opacity-50 border-muted"
                    : "border-border hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                {uploadingHero ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Clique para enviar uma imagem
                    </span>
                  </>
                )}
              </label>
            )}
            <p className="text-[11px] text-muted-foreground">
              Imagem de alta resolução (mín. 1920×1080)
            </p>
          </div>
        </div>
      ),
    },

    // ── 5. About ──
    {
      id: "about",
      title: "Seção Sobre",
      icon: Info,
      children: (
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conteúdo
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aboutTitle">Título da Seção</Label>
                <Input
                  id="aboutTitle"
                  value={(config?.aboutTitle as string) ?? ""}
                  onChange={(e) => updateConfig("aboutTitle", e.target.value)}
                  placeholder="Ex: Sobre Nós"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aboutText">Texto Sobre Você</Label>
                <Textarea
                  id="aboutText"
                  value={(config?.aboutText as string) ?? ""}
                  onChange={(e) => updateConfig("aboutText", e.target.value)}
                  rows={5}
                  maxLength={3000}
                  className="min-h-[120px] resize-y"
                />
                <span className="text-[11px] text-muted-foreground">
                  Máx. 3000 caracteres
                </span>
              </div>
            </div>
          </div>
          {/* About image upload */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Imagem da Seção
            </h4>
            <input
              type="file"
              ref={aboutImageInputRef}
              accept="image/*"
              onChange={(e) =>
                handleImageUpload(
                  e,
                  "aboutImageUrl",
                  "about",
                  setUploadingAbout,
                  aboutImageInputRef,
                )
              }
              className="hidden"
              id="about-image-upload"
            />
            {config?.aboutImageUrl ? (
              <div className="group relative overflow-hidden rounded-xl border border-border/50">
                <img
                  src={config.aboutImageUrl as string}
                  alt="Sobre preview"
                  className="h-32 w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => updateConfig("aboutImageUrl", null)}
                  >
                    <X className="mr-1 h-3.5 w-3.5" /> Remover
                  </Button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="about-image-upload"
                className={cn(
                  "flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 transition-all",
                  uploadingAbout
                    ? "opacity-50 border-muted"
                    : "border-border hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                {uploadingAbout ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Enviar imagem
                    </span>
                  </>
                )}
              </label>
            )}
            <p className="text-[11px] text-muted-foreground">
              Imagem vertical ou quadrada funciona melhor
            </p>
          </div>
        </div>
      ),
    },

    // ── 6. Contact & Social ──
    {
      id: "contact",
      title: "Contato e Redes Sociais",
      icon: Phone,
      children: (
        <div className="space-y-6">
          <p className="text-xs text-muted-foreground">
            Informações de contato exibidas no site.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp (com DDD)</Label>
              <Input
                id="whatsapp"
                value={
                  (config?.socialLinks as Record<string, string>)?.whatsapp ??
                  ""
                }
                onChange={(e) =>
                  updateConfig("socialLinks", {
                    ...(config?.socialLinks as Record<string, string>),
                    whatsapp: e.target.value,
                  })
                }
                placeholder="5511999999999"
                className="h-10"
              />
              <span className="text-[11px] text-muted-foreground">
                Apenas números
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={
                  (config?.socialLinks as Record<string, string>)?.instagram ??
                  ""
                }
                onChange={(e) =>
                  updateConfig("socialLinks", {
                    ...(config?.socialLinks as Record<string, string>),
                    instagram: e.target.value,
                  })
                }
                placeholder="https://instagram.com/seuperfil"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email de contato</Label>
              <Input
                id="email"
                value={(config?.contact as Record<string, string>)?.email ?? ""}
                onChange={(e) =>
                  updateConfig("contact", {
                    ...(config?.contact as Record<string, string>),
                    email: e.target.value,
                  })
                }
                placeholder="contato@exemplo.com"
                className="h-10"
              />
            </div>
          </div>
        </div>
      ),
    },

    // ── 7. Testimonials ──
    {
      id: "testimonials",
      title: "Depoimentos",
      icon: MessageSquareQuote,
      children: (
        <TestimonialsSection
          testimonials={(config?.testimonials as Testimonial[]) ?? []}
          config={config ?? {}}
          slug={slug}
          onUpdate={updateConfig}
        />
      ),
    },

    // ── 8. Sections manager ──
    {
      id: "sections",
      title: "Seções do Site",
      icon: Layers,
      children: (
        <SectionsManager
          sections={
            (config?.sections as Array<{
              id: string;
              type: string;
              visible: boolean;
              order: number;
            }>) ?? []
          }
          onUpdate={(sections) => updateConfig("sections", sections)}
        />
      ),
    },
  ];

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-dvh overflow-hidden w-full">
      {/* ─── Top Bar ─── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-card/80 px-4 py-2.5 backdrop-blur-sm">
        {/* Left: Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Palette className="h-4 w-4 text-primary" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-foreground">Personalizar</h1>
            <p className="text-[10px] text-muted-foreground">Editor Visual</p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="hidden sm:flex"
          >
            <a href={`/${slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Visualizar
            </a>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="relative"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            {saving ? "Salvando..." : "Salvar"}
            {hasUnsavedChanges && !saving && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-card bg-amber-500" />
            )}
          </Button>
        </div>
      </div>

      {/* ─── Toast message ─── */}
      {message && (
        <div
          className={cn(
            "mx-4 mt-2 flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-medium",
            message.type === "success"
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {message.type === "success" && <Check className="h-3.5 w-3.5" />}
          {message.text}
        </div>
      )}

      {/* ─── Mobile tab switcher ─── */}
      <div className="flex shrink-0 border-b border-border/50 md:hidden">
        <button
          onClick={() => setMobileTab("edit")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors",
            mobileTab === "edit"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground",
          )}
        >
          <Palette className="h-3.5 w-3.5" />
          Editar
        </button>
        <button
          onClick={() => setMobileTab("preview")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors",
            mobileTab === "preview"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground",
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>
      </div>

      {/* ─── Full-screen mobile preview overlay ─── */}
      {showMobilePreview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <span className="text-sm font-semibold">Preview</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobilePreview(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1">
            <PreviewFrame
              ref={previewRef}
              slug={slug}
              templateId={templateId}
              viewportMode="mobile"
              onViewportChange={() => {}}
              config={config ?? {}}
            />
          </div>
        </div>
      )}

      {/* ─── Main split-pane content ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Editor Panel */}
        <div
          className={cn(
            "flex w-full flex-col overflow-y-auto border-r border-border/50 bg-card/50 scrollbar-thin md:flex md:w-[380px] lg:w-[420px]",
            mobileTab === "edit" ? "flex" : "hidden",
          )}
        >
          <EditorPanel items={accordionItems} />
        </div>

        {/* RIGHT: Live Preview */}
        <div
          className={cn(
            "flex-1 md:flex",
            mobileTab === "preview" ? "flex" : "hidden",
          )}
        >
          <PreviewFrame
            ref={previewRef}
            slug={slug}
            templateId={templateId}
            viewportMode={viewportMode}
            onViewportChange={setViewportMode}
            config={config ?? {}}
          />
        </div>
      </div>

      {/* ─── Mobile preview FAB ─── */}
      <button
        onClick={() => setShowMobilePreview(true)}
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 active:scale-95 md:hidden"
        style={{ boxShadow: "0 4px 16px oklch(55% 0.16 45 / 0.3)" }}
      >
        <Smartphone className="h-5 w-5" />
      </button>
    </div>
  );
}
