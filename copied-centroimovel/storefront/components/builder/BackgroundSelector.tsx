"use client";

import type { MediaAsset } from "@/components/MediaLibrary/MediaLibrary";
import { MediaLibrary } from "@/components/MediaLibrary/MediaLibrary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { BackgroundConfig, GradientConfig } from "@centroimovel/types";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Film,
  FolderOpen,
  Image,
  Palette,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface BackgroundSelectorProps {
  value?: BackgroundConfig;
  onChange: (config: BackgroundConfig) => void;
  compressionQuality?: number;
  onCompressionChange?: (quality: number) => void;
  workspaceSlug?: string;
}

interface Preset {
  id: string;
  name: string;
  type: "solid" | "gradient" | "image" | "video";
  preview: React.ReactNode;
  config: Partial<BackgroundConfig>;
}

const MODERN_MINIMAL_PRESETS: Preset[] = [
  {
    id: "mm-white",
    name: "Branco Puro",
    type: "solid",
    preview: <div className="w-full h-full bg-white" />,
    config: { type: "solid", solidColor: "#FFFFFF" },
  },
  {
    id: "mm-light-gray",
    name: "Cinza Claro",
    type: "solid",
    preview: <div className="w-full h-full bg-gray-100" />,
    config: { type: "solid", solidColor: "#F3F4F6" },
  },
  {
    id: "mm-cream",
    name: "Creme",
    type: "solid",
    preview: <div className="w-full h-full bg-amber-50" />,
    config: { type: "solid", solidColor: "#FEF3C7" },
  },
  {
    id: "mm-subtle-gradient",
    name: "Gradiente Suave",
    type: "gradient",
    preview: (
      <div
        className="w-full h-full"
        style={{
          background: "linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)",
        }}
      />
    ),
    config: {
      type: "gradient",
      gradient: {
        type: "linear",
        angle: 135,
        stops: [
          { color: "#F8FAFC", position: 0 },
          { color: "#E2E8F0", position: 100 },
        ],
      },
    },
  },
  {
    id: "mm-blue-tint",
    name: "Tom Azul",
    type: "solid",
    preview: <div className="w-full h-full bg-sky-50" />,
    config: { type: "solid", solidColor: "#F0F9FF" },
  },
];

const BOLD_LUXURY_PRESETS: Preset[] = [
  {
    id: "bl-rich-black",
    name: "Preto Rico",
    type: "solid",
    preview: <div className="w-full h-full bg-gray-900" />,
    config: { type: "solid", solidColor: "#0F172A" },
  },
  {
    id: "bl-charcoal",
    name: "Carvão",
    type: "solid",
    preview: <div className="w-full h-full bg-gray-800" />,
    config: { type: "solid", solidColor: "#1F2937" },
  },
  {
    id: "bl-gold-gradient",
    name: "Gradiente Dourado",
    type: "gradient",
    preview: (
      <div
        className="w-full h-full"
        style={{
          background:
            "linear-gradient(135deg, #1F2937 0%, #78350F 50%, #C9A84C 100%)",
        }}
      />
    ),
    config: {
      type: "gradient",
      gradient: {
        type: "linear",
        angle: 135,
        stops: [
          { color: "#1F2937", position: 0 },
          { color: "#78350F", position: 50 },
          { color: "#C9A84C", position: 100 },
        ],
      },
    },
  },
  {
    id: "bl-navy",
    name: "Azul Marinho",
    type: "solid",
    preview: <div className="w-full h-full bg-slate-800" />,
    config: { type: "solid", solidColor: "#1E3A5F" },
  },
  {
    id: "bl-burgundy",
    name: "Bordeaux",
    type: "solid",
    preview: <div className="w-full h-full bg-red-950" />,
    config: { type: "solid", solidColor: "#4C0519" },
  },
];

const NATURE_WARMTH_PRESETS: Preset[] = [
  {
    id: "nw-forest",
    name: "Floresta",
    type: "solid",
    preview: <div className="w-full h-full bg-green-900" />,
    config: { type: "solid", solidColor: "#14532D" },
  },
  {
    id: "nw-warm-beige",
    name: "Bege Quente",
    type: "solid",
    preview: <div className="w-full h-full bg-stone-200" />,
    config: { type: "solid", solidColor: "#D6D3D1" },
  },
  {
    id: "nw-terracotta",
    name: "Terracota",
    type: "solid",
    preview: <div className="w-full h-full bg-orange-800" />,
    config: { type: "solid", solidColor: "#9A3412" },
  },
  {
    id: "nw-sunset",
    name: "Pôr do Sol",
    type: "gradient",
    preview: (
      <div
        className="w-full h-full"
        style={{
          background:
            "linear-gradient(180deg, #FC9732 0%, #E84118 50%, #6B1B1B 100%)",
        }}
      />
    ),
    config: {
      type: "gradient",
      gradient: {
        type: "linear",
        angle: 180,
        stops: [
          { color: "#FC9732", position: 0 },
          { color: "#E84118", position: 50 },
          { color: "#6B1B1B", position: 100 },
        ],
      },
    },
  },
  {
    id: "nw-earth",
    name: "Terra",
    type: "solid",
    preview: <div className="w-full h-full bg-amber-900" />,
    config: { type: "solid", solidColor: "#78350F" },
  },
];

const OVERLAY_PRESETS: Preset[] = [
  {
    id: "ov-dark-heavy",
    name: "Overlay Escuro",
    type: "image",
    preview: (
      <div className="relative w-full h-full bg-gray-900">
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white/50 text-xs">Imagem</span>
        </div>
      </div>
    ),
    config: {
      type: "image",
      overlay: { enabled: true, color: "#000000", opacity: 70 },
    },
  },
  {
    id: "ov-dark-light",
    name: "Overlay Leve",
    type: "image",
    preview: (
      <div className="relative w-full h-full bg-gray-900">
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white/50 text-xs">Imagem</span>
        </div>
      </div>
    ),
    config: {
      type: "image",
      overlay: { enabled: true, color: "#000000", opacity: 30 },
    },
  },
  {
    id: "ov-brand",
    name: "Overlay da Marca",
    type: "image",
    preview: (
      <div className="relative w-full h-full bg-gray-900">
        <div className="absolute inset-0 bg-primary/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white/50 text-xs">Imagem</span>
        </div>
      </div>
    ),
    config: {
      type: "image",
      overlay: { enabled: true, color: "#C9A84C", opacity: 50 },
    },
  },
];

const ALL_PRESETS = [
  { category: "Moderno Minimal", presets: MODERN_MINIMAL_PRESETS },
  { category: "Luxo Bold", presets: BOLD_LUXURY_PRESETS },
  { category: "Natureza", presets: NATURE_WARMTH_PRESETS },
  { category: "Com Overlay", presets: OVERLAY_PRESETS },
];

const DEFAULT_CONFIG: BackgroundConfig = {
  type: "solid",
  solidColor: "#FFFFFF",
  overlay: { enabled: false, color: "#000000", opacity: 50 },
};

function renderGradientPreview(gradient?: GradientConfig): string {
  if (!gradient) return "linear-gradient(180deg, #000 0%, #fff 100%)";
  const stops = gradient.stops
    .map((s) => `${s.color} ${s.position}%`)
    .join(", ");
  if (gradient.type === "radial") {
    return `radial-gradient(${stops})`;
  }
  return `linear-gradient(${gradient.angle}deg, ${stops})`;
}

export function BackgroundSelector({
  value,
  onChange,
  workspaceSlug,
}: BackgroundSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "solid" | "gradient" | "image" | "video"
  >(value?.type || "solid");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [compressionLoading, setCompressionLoading] = useState(false);
  const [compressionResult, setCompressionResult] = useState<{
    original: number;
    compressed: number;
  } | null>(null);
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const config = value || DEFAULT_CONFIG;

  const updateConfig = (updates: Partial<BackgroundConfig>) => {
    setSelectedPresetId(null);
    onChange({ ...config, ...updates });
  };

  const handleAssetSelect = (asset: MediaAsset) => {
    if (asset.type === "image" || asset.type === "gif") {
      updateConfig({ imageUrl: asset.url, type: "image" });
    } else if (asset.type === "video") {
      updateConfig({
        videoUrl: asset.url,
        type: "video",
        videoMuted: true,
        videoLoop: true,
        videoAutoplay: true,
      });
    }
    setShowImageLibrary(false);
    setShowVideoLibrary(false);
  };

  const applyPreset = (preset: Preset) => {
    setSelectedPresetId(preset.id);
    onChange({
      ...DEFAULT_CONFIG,
      ...preset.config,
      overlay: preset.config.overlay || {
        enabled: false,
        color: "#000000",
        opacity: 50,
      },
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressionLoading(true);
    setCompressionResult(null);

    try {
      const compressed = await compressImage(
        file,
        config.imageCompression || 80,
      );
      const dataUrl = await fileToDataUrl(compressed);
      setCompressionResult({
        original: file.size,
        compressed: compressed.size,
      });
      updateConfig({ imageUrl: dataUrl, type: "image" });
    } catch (err) {
      console.error("Image compression failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao carregar imagem",
      );
    } finally {
      setCompressionLoading(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressionLoading(true);
    setCompressionResult(null);

    try {
      const compressed = await compressVideo(
        file,
        config.videoCompression || 60,
      );
      const dataUrl = await fileToDataUrl(compressed);
      setCompressionResult({
        original: file.size,
        compressed: compressed.size,
      });
      updateConfig({
        videoUrl: dataUrl,
        type: "video",
        videoMuted: true,
        videoLoop: true,
        videoAutoplay: true,
      });
    } catch (err) {
      console.error("Video compression failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao carregar vídeo",
      );
    } finally {
      setCompressionLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Fundo
        </Label>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {showAdvanced ? (
            <>
              <Sparkles className="h-3 w-3" />
              Modo Simples
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              Opções Avançadas
            </>
          )}
          {showAdvanced ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
      </div>

      {showAdvanced ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/50 rounded-lg">
            {(["solid", "gradient", "image", "video"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-md py-2 text-[10px] font-medium transition-colors",
                  activeTab === tab
                    ? "bg-background shadow-sm"
                    : "hover:bg-muted/80",
                )}
              >
                {tab === "solid" && <Palette className="h-3 w-3 shrink-0" />}
                {tab === "gradient" && (
                  <Sparkles className="h-3 w-3 shrink-0" />
                )}
                {tab === "image" && <Image className="h-3 w-3 shrink-0" />}
                {tab === "video" && <Film className="h-3 w-3 shrink-0" />}
                {tab === "solid" && "Sólido"}
                {tab === "gradient" && "Gradiente"}
                {tab === "image" && "Imagem"}
                {tab === "video" && "Vídeo"}
              </button>
            ))}
          </div>

          {activeTab === "solid" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.solidColor || "#FFFFFF"}
                  onChange={(e) => updateConfig({ solidColor: e.target.value })}
                  className="h-10 w-14 rounded-lg cursor-pointer border border-border/50"
                />
                <Input
                  value={config.solidColor || "#FFFFFF"}
                  onChange={(e) => updateConfig({ solidColor: e.target.value })}
                  className="flex-1 font-mono text-sm"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          )}

          {activeTab === "gradient" && (
            <GradientEditor
              value={config.gradient}
              onChange={(gradient) =>
                updateConfig({ gradient, type: "gradient" })
              }
            />
          )}

          {activeTab === "image" && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                {compressionLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-xs text-muted-foreground">
                      Comprimindo...
                    </span>
                  </div>
                ) : config.imageUrl ? (
                  <div className="relative w-full">
                    <img
                      src={config.imageUrl}
                      alt="Background"
                      className="max-h-24 mx-auto rounded object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateConfig({ imageUrl: undefined });
                      }}
                      className="absolute -top-2 -right-2 rounded-full p-1 bg-destructive text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Clique ou arraste uma imagem
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              {compressionResult && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Compressão: {formatBytes(compressionResult.original)} →{" "}
                  {formatBytes(compressionResult.compressed)} (
                  {Math.round(
                    (1 -
                      compressionResult.compressed /
                        compressionResult.original) *
                      100,
                  )}
                  % menor)
                </p>
              )}
              {workspaceSlug && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setShowImageLibrary(true)}
                >
                  <FolderOpen className="h-4 w-4" />
                  Escolher da Biblioteca
                </Button>
              )}
              <Input
                value={config.imageUrl || ""}
                onChange={(e) =>
                  updateConfig({ imageUrl: e.target.value || undefined })
                }
                placeholder="Ou cole uma URL de imagem"
                className="text-xs"
              />
              <div className="space-y-2">
                <Label className="text-xs">Qualidade da Compressão</Label>
                <Input
                  type="range"
                  min={20}
                  max={100}
                  value={config.imageCompression || 80}
                  onChange={(e) =>
                    updateConfig({ imageCompression: Number(e.target.value) })
                  }
                  className="h-2 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Menor tamanho</span>
                  <span>Melhor qualidade</span>
                </div>
              </div>

              <OverlayEditor
                overlay={config.overlay}
                onChange={(overlay) => updateConfig({ overlay })}
              />
            </div>
          )}

          {activeTab === "video" && (
            <div className="space-y-3">
              <div
                onClick={() => videoInputRef.current?.click()}
                className="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                {compressionLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-xs text-muted-foreground">
                      Comprimindo...
                    </span>
                  </div>
                ) : config.videoUrl ? (
                  <div className="relative w-full">
                    <video
                      src={config.videoUrl}
                      className="max-h-24 mx-auto rounded object-contain"
                      muted
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateConfig({ videoUrl: undefined });
                      }}
                      className="absolute -top-2 -right-2 rounded-full p-1 bg-destructive text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Film className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Clique ou arraste um vídeo/GIF
                    </span>
                  </>
                )}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*,image/gif"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
              </div>
              {compressionResult && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Compressão: {formatBytes(compressionResult.original)} →{" "}
                  {formatBytes(compressionResult.compressed)}(
                  {Math.round(
                    (1 -
                      compressionResult.compressed /
                        compressionResult.original) *
                      100,
                  )}
                  % menor)
                </p>
              )}
              {workspaceSlug && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setShowVideoLibrary(true)}
                >
                  <FolderOpen className="h-4 w-4" />
                  Escolher da Biblioteca
                </Button>
              )}
              <Input
                value={config.videoUrl || ""}
                onChange={(e) =>
                  updateConfig({ videoUrl: e.target.value || undefined })
                }
                placeholder="Ou cole uma URL de vídeo"
                className="text-xs"
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.videoAutoplay ?? true}
                    onChange={(e) =>
                      updateConfig({ videoAutoplay: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-xs">Autoplay</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.videoLoop ?? true}
                    onChange={(e) =>
                      updateConfig({ videoLoop: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-xs">Loop</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.videoMuted ?? true}
                    onChange={(e) =>
                      updateConfig({ videoMuted: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-xs">Mudo</span>
                </label>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Qualidade da Compressão</Label>
                <Input
                  type="range"
                  min={20}
                  max={100}
                  value={config.videoCompression || 60}
                  onChange={(e) =>
                    updateConfig({ videoCompression: Number(e.target.value) })
                  }
                  className="h-2 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Menor tamanho</span>
                  <span>Melhor qualidade</span>
                </div>
              </div>

              <OverlayEditor
                overlay={config.overlay}
                onChange={(overlay) => updateConfig({ overlay })}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {ALL_PRESETS.map((group) => (
            <div key={group.category} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {group.category}
                </span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              <div className="grid grid-cols-5 gap-2">
                {group.presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                      selectedPresetId === preset.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-primary/50",
                    )}
                    title={preset.name}
                  >
                    {preset.preview}
                    {selectedPresetId === preset.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground text-center pt-2">
            Clique em um preset para aplicar ou use &quot;Opções Avançadas&quot;
            para personalizar
          </p>
        </div>
      )}

      {workspaceSlug && (
        <>
          <MediaLibrary
            open={showImageLibrary}
            onOpenChange={setShowImageLibrary}
            onSelect={handleAssetSelect}
            workspaceSlug={workspaceSlug}
            currentValue={config.imageUrl || undefined}
            accept="image"
            mode="select"
          />
          <MediaLibrary
            open={showVideoLibrary}
            onOpenChange={setShowVideoLibrary}
            onSelect={handleAssetSelect}
            workspaceSlug={workspaceSlug}
            currentValue={config.videoUrl || undefined}
            accept="video"
            mode="select"
          />
        </>
      )}
    </div>
  );
}

interface GradientEditorProps {
  value?: GradientConfig;
  onChange: (gradient: GradientConfig) => void;
}

function GradientEditor({ value, onChange }: GradientEditorProps) {
  const gradient = value || {
    type: "linear",
    angle: 180,
    stops: [
      { color: "#000000", position: 0 },
      { color: "#ffffff", position: 100 },
    ],
  };

  const updateStops = (stops: GradientConfig["stops"]) => {
    onChange({ ...gradient, stops });
  };

  const addStop = () => {
    const midPoint = 50;
    const newStop = {
      color: "#888888",
      position: midPoint,
    };
    updateStops(
      [...gradient.stops, newStop].sort((a, b) => a.position - b.position),
    );
  };

  const removeStop = (index: number) => {
    if (gradient.stops.length <= 2) return;
    updateStops(gradient.stops.filter((_, i) => i !== index));
  };

  const updateStop = (
    index: number,
    updates: Partial<(typeof gradient.stops)[0]>,
  ) => {
    const newStops = gradient.stops.map((stop, i) =>
      i === index ? { ...stop, ...updates } : stop,
    );
    updateStops(newStops.sort((a, b) => a.position - b.position));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Tipo de Gradiente</Label>
        <div className="flex gap-1">
          {(["linear", "radial"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ ...gradient, type })}
              className={cn(
                "flex flex-1 items-center justify-center rounded-lg py-2 text-xs font-medium transition-colors",
                gradient.type === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80",
              )}
            >
              {type === "linear" ? "Linear" : "Radial"}
            </button>
          ))}
        </div>
      </div>

      {gradient.type === "linear" && (
        <div className="space-y-2">
          <Label className="text-xs">Ângulo: {gradient.angle}°</Label>
          <Input
            type="range"
            min={0}
            max={360}
            value={gradient.angle}
            onChange={(e) =>
              onChange({ ...gradient, angle: Number(e.target.value) })
            }
            className="h-2 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0°</span>
            <span>90°</span>
            <span>180°</span>
            <span>270°</span>
            <span>360°</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Pontos de Cor</Label>
          <button
            type="button"
            onClick={addStop}
            className="text-xs text-primary hover:underline"
          >
            + Adicionar
          </button>
        </div>
        <div className="space-y-2">
          {gradient.stops.map((stop, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="color"
                value={stop.color}
                onChange={(e) => updateStop(index, { color: e.target.value })}
                className="h-8 w-10 rounded cursor-pointer"
              />
              <Input
                value={stop.color}
                onChange={(e) => updateStop(index, { color: e.target.value })}
                className="w-24 font-mono text-xs"
              />
              <Input
                type="range"
                min={0}
                max={100}
                value={stop.position}
                onChange={(e) =>
                  updateStop(index, { position: Number(e.target.value) })
                }
                className="flex-1 h-2 cursor-pointer"
              />
              <span className="w-8 text-xs text-muted-foreground">
                {stop.position}%
              </span>
              {gradient.stops.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeStop(index)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        className="h-16 w-full rounded-lg border border-border/50"
        style={{ background: renderGradientPreview(gradient) }}
      />
    </div>
  );
}

interface OverlayEditorProps {
  overlay?: { enabled: boolean; color: string; opacity: number };
  onChange: (overlay: {
    enabled: boolean;
    color: string;
    opacity: number;
  }) => void;
}

function OverlayEditor({ overlay, onChange }: OverlayEditorProps) {
  const o = overlay || { enabled: false, color: "#000000", opacity: 50 };

  return (
    <div className="space-y-3 pt-3 border-t border-border/50">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Overlay (sobreposição)</Label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={o.enabled}
            onChange={(e) => onChange({ ...o, enabled: e.target.checked })}
            className="rounded"
          />
          <span className="text-xs">
            {o.enabled ? "Ativado" : "Desativado"}
          </span>
        </label>
      </div>

      {o.enabled && (
        <>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={o.color}
              onChange={(e) => onChange({ ...o, color: e.target.value })}
              className="h-8 w-12 rounded cursor-pointer"
            />
            <Input
              value={o.color}
              onChange={(e) => onChange({ ...o, color: e.target.value })}
              className="flex-1 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Opacidade: {o.opacity}%</Label>
            <Input
              type="range"
              min={0}
              max={100}
              value={o.opacity}
              onChange={(e) =>
                onChange({ ...o, opacity: Number(e.target.value) })
              }
              className="h-2 cursor-pointer"
            />
          </div>
          <div className="h-8 w-full rounded border border-border/50 relative overflow-hidden">
            <div
              className="absolute inset-0"
              style={{ background: o.color, opacity: o.opacity / 100 }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] bg-black/50 text-white px-2 py-0.5 rounded">
                Preview do overlay
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

async function compressImage(file: File, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      let { width, height } = img;
      const maxDimension = 1920;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas to blob failed"));
        },
        "image/jpeg",
        quality / 100,
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(file);
  });
}

async function compressVideo(file: File, quality: number): Promise<Blob> {
  const maxSize = 10 * 1024 * 1024;

  if (file.type === "image/gif") {
    if (file.size > maxSize) {
      throw new Error(
        "GIF muito grande. Limite para upload direto: 10MB. Use a Biblioteca de Mídia.",
      );
    }
    return file;
  }

  if (file.size > maxSize) {
    throw new Error(
      "Vídeo muito grande. Limite para upload direto: 10MB. Use a Biblioteca de Mídia.",
    );
  }

  return file;
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
