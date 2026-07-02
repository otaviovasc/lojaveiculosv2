import type { StorefrontMediaAsset } from "@lojaveiculosv2/shared";
import { Check, ImagePlus, Images, RefreshCw, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { cx } from "../../components/ui/featureShared";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { StorefrontImageEditorDialog } from "./StorefrontImageEditorDialog";
import { useStorefrontMediaLibrary } from "./StorefrontMediaLibraryContext";

export function StorefrontImagePicker({
  imageClassName,
  label,
  onChange,
  value,
}: {
  imageClassName: string;
  label: string;
  onChange: (value: string | null) => void;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-black uppercase tracking-widest text-muted">
          {label}
        </h4>
        <button
          aria-label={`Abrir galeria para ${label}`}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-app text-muted transition-colors hover:text-app-text"
          onClick={() => setIsOpen(true)}
          title="Galeria da sua loja"
          type="button"
        >
          <Images aria-hidden="true" className="size-4" />
        </button>
      </div>
      {value ? (
        <div className="group relative inline-flex max-w-fit">
          <img
            alt=""
            className={cx(
              "border border-line object-cover shadow-sm",
              imageClassName,
            )}
            src={value}
          />
          <button
            aria-label={`Remover ${label}`}
            className="absolute -right-2 -top-2 inline-flex size-8 items-center justify-center rounded-full bg-danger text-inverse opacity-0 shadow-md transition-opacity group-hover:opacity-100"
            onClick={() => onChange(null)}
            title="Remover imagem"
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : (
        <button
          className="flex min-h-[7rem] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line bg-app py-6 text-muted transition-colors hover:border-accent hover:text-app-text"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <ImagePlus aria-hidden="true" className="size-6" />
          <span className="text-xs font-bold">Selecionar da galeria</span>
        </button>
      )}
      <StorefrontImageLibraryDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelect={(asset) => {
          onChange(asset.publicUrl);
          setIsOpen(false);
        }}
        selectedUrl={value}
      />
    </div>
  );
}

function StorefrontImageLibraryDialog({
  isOpen,
  onClose,
  onSelect,
  selectedUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: StorefrontMediaAsset) => void;
  selectedUrl: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { assets, isLoading, refresh, statusMessage, uploadImage } =
    useStorefrontMediaLibrary();
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const openFile = (files: FileList | null) => {
    const file = Array.from(files ?? []).find((item) =>
      item.type.startsWith("image/"),
    );
    if (!file) {
      setUploadStatus("Selecione um arquivo de imagem.");
      return;
    }
    setEditingFile(file);
  };

  return (
    <>
      <FeatureDialog
        className="max-w-4xl"
        footer={
          <FeatureDialogActions
            cancelLabel="Fechar"
            confirmIcon={<Upload aria-hidden="true" className="size-4" />}
            confirmLabel="Enviar imagem"
            isLoading={isUploading}
            loadingLabel="Enviando"
            onCancel={onClose}
            onConfirm={() => fileInputRef.current?.click()}
          />
        }
        isOpen={isOpen}
        onClose={onClose}
        title="Galeria da sua loja"
      >
        <div className="grid gap-4">
          <label
            className="grid min-h-[8rem] cursor-pointer place-items-center rounded-lg border-2 border-dashed border-line bg-app p-4 text-center text-muted transition-colors hover:border-accent hover:text-app-text"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              openFile(event.dataTransfer.files);
            }}
          >
            <input
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                openFile(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
              ref={fileInputRef}
              type="file"
            />
            <span className="grid justify-items-center gap-2">
              <Upload aria-hidden="true" className="size-6" />
              <strong className="text-sm text-app-text">
                Enviar, recortar e salvar na galeria
              </strong>
              <small className="text-xs font-bold">
                Fachada, logo, banner, foto da equipe ou imagens dos blocos.
              </small>
            </span>
          </label>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted">
              Imagens salvas
            </p>
            <FeatureActionButton
              icon={RefreshCw}
              isBusy={isLoading}
              label="Atualizar"
              onClick={() => void refresh()}
            />
          </div>
          <GalleryStatus
            isLoading={isLoading}
            statusMessage={uploadStatus ?? statusMessage}
          />
          <AssetGrid
            assets={assets}
            onSelect={onSelect}
            selectedUrl={selectedUrl}
          />
        </div>
      </FeatureDialog>
      <StorefrontImageEditorDialog
        file={editingFile}
        isOpen={Boolean(editingFile)}
        onClose={() => setEditingFile(null)}
        onConfirm={async (image) => {
          setIsUploading(true);
          setUploadStatus(null);
          try {
            const asset = await uploadImage(image);
            onSelect(asset);
            setEditingFile(null);
            setUploadStatus("Imagem salva na galeria.");
          } catch (error) {
            const message = formatApiErrorDisplay(
              error,
              "Nao foi possivel enviar a imagem.",
            );
            setUploadStatus(message);
            throw new Error(message);
          } finally {
            setIsUploading(false);
          }
        }}
      />
    </>
  );
}

function GalleryStatus({
  isLoading,
  statusMessage,
}: {
  isLoading: boolean;
  statusMessage: string | null;
}) {
  if (isLoading) {
    return <p className="text-sm font-black text-muted">Carregando galeria.</p>;
  }
  if (statusMessage) {
    return <p className="text-sm font-black text-danger">{statusMessage}</p>;
  }
  return null;
}

function AssetGrid({
  assets,
  onSelect,
  selectedUrl,
}: {
  assets: readonly StorefrontMediaAsset[];
  onSelect: (asset: StorefrontMediaAsset) => void;
  selectedUrl: string;
}) {
  if (!assets.length) {
    return (
      <div className="grid min-h-[10rem] place-items-center rounded-lg border border-line bg-app p-6 text-center">
        <div className="grid justify-items-center gap-2 text-muted">
          <Images aria-hidden="true" className="size-6" />
          <strong className="text-sm text-app-text">
            Nenhuma imagem ainda
          </strong>
          <span className="text-xs font-bold">
            Envie a primeira imagem para reutilizar nos proximos blocos.
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="grid max-h-[45vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
      {assets.map((asset) => (
        <button
          aria-pressed={asset.publicUrl === selectedUrl}
          className={cx(
            "group overflow-hidden rounded-lg border bg-app text-left transition-all hover:border-accent",
            asset.publicUrl === selectedUrl ? "border-accent" : "border-line",
          )}
          key={asset.id}
          onClick={() => onSelect(asset)}
          type="button"
        >
          <img
            alt=""
            className="aspect-[4/3] w-full object-cover"
            src={asset.publicUrl}
          />
          <span className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2 text-xs font-black text-app-text">
            <span className="truncate">{asset.fileName}</span>
            {asset.publicUrl === selectedUrl ? (
              <Check aria-hidden="true" className="size-3.5 text-muted" />
            ) : null}
          </span>
        </button>
      ))}
    </div>
  );
}
