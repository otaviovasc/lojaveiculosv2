import { Check, Eraser, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import {
  FeatureInput,
  FeatureSegmentedControl,
} from "../../components/ui/FeatureControls";
import { cx } from "../../components/ui/featureShared";
import { canvasToPng, renderEditedImage } from "./StorefrontImageEditorCanvas";
import {
  createEditedImageFileName,
  defaultImageEditorSettings,
  imageAspectOptions,
  type StorefrontImageEditorSettings,
} from "./storefrontImageEditorModel";

export type EditedStorefrontImage = {
  blob: Blob;
  fileName: string;
  height: number;
  width: number;
};

export function StorefrontImageEditorDialog({
  file,
  isOpen,
  onClose,
  onConfirm,
}: {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (image: EditedStorefrontImage) => Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [settings, setSettings] = useState(defaultImageEditorSettings);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      drawPreview(settings);
    };
    image.onerror = () => setStatus("Nao foi possivel ler esta imagem.");
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, isOpen]);

  useEffect(() => {
    if (isOpen) drawPreview(settings);
  }, [isOpen, settings]);

  useEffect(() => {
    if (!isOpen) {
      setSettings(defaultImageEditorSettings);
      setStatus(null);
      setIsSaving(false);
      imageRef.current = null;
    }
  }, [isOpen]);

  const drawPreview = (nextSettings: StorefrontImageEditorSettings) => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return null;
    return renderEditedImage(canvas, image, nextSettings);
  };

  const confirm = async () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !file) return;
    setIsSaving(true);
    setStatus(null);
    try {
      const size = renderEditedImage(canvas, image, settings);
      const blob = await canvasToPng(canvas);
      await onConfirm({
        blob,
        fileName: createEditedImageFileName(file.name),
        height: size.height,
        width: size.width,
      });
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Nao foi possivel salvar.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FeatureDialog
      className="max-w-5xl"
      footer={
        <FeatureDialogActions
          confirmDisabled={!file}
          confirmIcon={<Check aria-hidden="true" className="size-4" />}
          confirmLabel="Usar imagem"
          isLoading={isSaving}
          loadingLabel="Enviando"
          onCancel={onClose}
          onConfirm={() => void confirm()}
        />
      }
      isOpen={isOpen}
      onClose={onClose}
      title="Recortar e ajustar imagem"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid min-h-[18rem] place-items-center overflow-hidden rounded-lg border border-line bg-app p-3">
          <canvas
            aria-label="Previa da imagem ajustada"
            className="max-h-[58vh] max-w-full rounded-lg object-contain shadow-lg"
            ref={canvasRef}
          />
        </div>
        <div className="grid content-start gap-4">
          <FeatureSegmentedControl
            ariaLabel="Formato de corte"
            onChange={(aspect) =>
              setSettings((current) => ({ ...current, aspect }))
            }
            options={imageAspectOptions}
            value={settings.aspect}
          />
          <ControlGroup
            icon={<SlidersHorizontal className="size-4" />}
            title="Imagem"
          >
            <RangeControl
              label="Zoom"
              max={2.5}
              min={1}
              onChange={(zoom) =>
                setSettings((current) => ({ ...current, zoom }))
              }
              step={0.05}
              value={settings.zoom}
            />
            <RangeControl
              label="Horizontal"
              max={50}
              min={-50}
              onChange={(x) => setSettings((current) => ({ ...current, x }))}
              value={settings.x}
            />
            <RangeControl
              label="Vertical"
              max={50}
              min={-50}
              onChange={(y) => setSettings((current) => ({ ...current, y }))}
              value={settings.y}
            />
          </ControlGroup>
          <ControlGroup title="Filtros">
            <RangeControl
              label="Brilho"
              max={1.8}
              min={0.4}
              onChange={(brightness) =>
                setSettings((current) => ({ ...current, brightness }))
              }
              step={0.05}
              value={settings.brightness}
            />
            <RangeControl
              label="Contraste"
              max={1.8}
              min={0.4}
              onChange={(contrast) =>
                setSettings((current) => ({ ...current, contrast }))
              }
              step={0.05}
              value={settings.contrast}
            />
            <RangeControl
              label="Saturacao"
              max={2}
              min={0}
              onChange={(saturation) =>
                setSettings((current) => ({ ...current, saturation }))
              }
              step={0.05}
              value={settings.saturation}
            />
            <RangeControl
              label="Desfoque"
              max={8}
              min={0}
              onChange={(blur) =>
                setSettings((current) => ({ ...current, blur }))
              }
              step={0.5}
              value={settings.blur}
            />
          </ControlGroup>
          <ControlGroup
            icon={<Eraser className="size-4" />}
            title="Remover fundo"
          >
            <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-xs font-black text-app-text">
              <input
                checked={settings.removeColorEnabled}
                className="size-4 accent-[var(--color-accent)]"
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    removeColorEnabled: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              Remover cor selecionada
            </label>
            <FeatureInput
              aria-label="Cor do fundo para remover"
              className="min-h-10 px-1"
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  removeColor: event.target.value,
                }))
              }
              type="color"
              value={settings.removeColor}
            />
            <RangeControl
              label="Tolerancia"
              max={120}
              min={0}
              onChange={(removeTolerance) =>
                setSettings((current) => ({ ...current, removeTolerance }))
              }
              value={settings.removeTolerance}
            />
          </ControlGroup>
          {status ? (
            <p className="text-sm font-black text-danger">{status}</p>
          ) : null}
        </div>
      </div>
    </FeatureDialog>
  );
}

function ControlGroup({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <section className="grid gap-3 rounded-lg border border-line bg-app p-3">
      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}

function RangeControl({
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-muted">
      <span className="flex justify-between gap-2">
        {label}
        <strong className="text-app-text">{formatRangeValue(value)}</strong>
      </span>
      <input
        className={cx("w-full accent-[var(--color-accent)]")}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

function formatRangeValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
