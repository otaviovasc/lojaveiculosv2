import {
  Download,
  FileArchive,
  Loader2,
  RotateCcw,
  WandSparkles,
  X,
} from "lucide-react";
import { DialogDescription, DialogTitle } from "../../../components/ui/dialog";
import type { InventoryApi } from "../api/apiClient";
import { AdjustSection } from "./ImageTemplateAdjustSection";
import { ImageTemplateAiStudioSection } from "./ImageTemplateAiStudioSection";
import { ImageTemplateContentSection } from "./ImageTemplateContentSection";
import { LayoutSection, PresetsSection } from "./ImageTemplateControlSections";
import type {
  ImageTemplateListing,
  ImageTemplateMedia,
  ImageTemplateStoreSettings,
} from "./ImageTemplateTypes";
import type { ImageTemplateEditorState } from "./useImageTemplateEditorState";

export function ImageTemplateControls({
  api,
  canDownload,
  downloadMessage,
  downloadingZip,
  editor,
  handleDownload,
  handleDownloadAllZipped,
  listing,
  media,
  onClose,
  primaryUnitId,
  storeSettings,
}: {
  api: InventoryApi | null;
  canDownload: boolean;
  downloadMessage?: string | null;
  downloadingZip: boolean;
  editor: ImageTemplateEditorState;
  handleDownload: () => void;
  handleDownloadAllZipped: () => void;
  listing: ImageTemplateListing;
  media: readonly ImageTemplateMedia[];
  onClose: () => void;
  primaryUnitId?: string | null;
  storeSettings: ImageTemplateStoreSettings;
}) {
  const hasPhone = Boolean(
    storeSettings?.profile?.whatsappPhone ||
    storeSettings?.profile?.contactPhone,
  );
  const hasWebsite = Boolean(
    storeSettings?.publicSite?.customDomain ||
    storeSettings?.identity?.primaryDomain,
  );

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-t border-line bg-panel lg:border-l lg:border-t-0">
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-accent-text">
            <WandSparkles aria-hidden="true" className="size-4" />
            Post Studio
          </span>
          <DialogTitle className="truncate text-lg font-black tracking-tight text-app-text">
            Estúdio de posts
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs font-bold text-muted">
            Crie uma arte pronta para publicar sem sair do estoque.
          </DialogDescription>
          <p className="mt-2 truncate text-xs font-black text-app-text">
            {listing.title}
            <span className="ml-2 font-bold text-muted">
              {media.length} {media.length === 1 ? "foto" : "fotos"}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            aria-label="Restaurar ajustes do post"
            className="grid size-9 cursor-pointer place-items-center rounded-lg border border-line bg-app-elevated text-muted transition-colors hover:bg-line/25 hover:text-app-text"
            onClick={editor.resetEditor}
            title="Restaurar ajustes"
            type="button"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
          </button>
          <button
            aria-label="Fechar estúdio de posts"
            className="grid size-9 cursor-pointer place-items-center rounded-lg border border-line bg-app-elevated text-app-text transition-colors hover:bg-line/25"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        <PresetsSection
          activeSection={editor.activeSection}
          deletePreset={editor.deletePreset}
          isSavingPreset={editor.isSavingPreset}
          loadPreset={editor.applyConfig}
          presetName={editor.presetName}
          presets={editor.presets}
          savePreset={editor.savePreset}
          setActiveSection={editor.setActiveSection}
          setPresetName={editor.setPresetName}
        />
        <LayoutSection
          activeSection={editor.activeSection}
          bgStyle={editor.bgStyle}
          color={editor.color}
          format={editor.format}
          setActiveSection={editor.setActiveSection}
          setBgStyle={editor.setBgStyle}
          setColor={editor.setColor}
          setFormat={editor.setFormat}
          fontFamily={editor.fontFamily}
          setFontFamily={editor.setFontFamily}
          customTextColor={editor.customTextColor}
          setCustomTextColor={editor.setCustomTextColor}
        />
        <ImageTemplateContentSection
          editor={editor}
          hasPhone={hasPhone}
          hasWebsite={hasWebsite}
        />
        <AdjustSection
          activeSection={editor.activeSection}
          bgBlurAmount={editor.bgBlurAmount}
          bgStyle={editor.bgStyle}
          blurBrightness={editor.blurBrightness}
          imageHeightScale={editor.imageHeightScale}
          imageXOffset={editor.imageXOffset}
          imageYOffset={editor.imageYOffset}
          cropXOffset={editor.cropXOffset}
          setCropXOffset={editor.setCropXOffset}
          cropYOffset={editor.cropYOffset}
          setCropYOffset={editor.setCropYOffset}
          setActiveSection={editor.setActiveSection}
          setBgBlurAmount={editor.setBgBlurAmount}
          setBlurBrightness={editor.setBlurBrightness}
          setImageHeightScale={editor.setImageHeightScale}
          setImageWidthScale={editor.setImageWidthScale}
          setImageXOffset={editor.setImageXOffset}
          setImageYOffset={editor.setImageYOffset}
        />
        <ImageTemplateAiStudioSection
          activeSection={editor.activeSection}
          api={api}
          listing={listing}
          media={media}
          primaryUnitId={primaryUnitId}
          selectedPhotoIndex={editor.selectedPhotoIndex}
          setActiveSection={editor.setActiveSection}
          setSelectedPhotoIndex={editor.setSelectedPhotoIndex}
        />
      </div>

      <footer className="space-y-2.5 border-t border-line bg-panel p-4 sm:p-5">
        {downloadMessage ? (
          <p
            className="rounded-lg border border-line bg-app-elevated px-3 py-2 text-center text-xs font-bold text-muted"
            role="status"
          >
            {downloadMessage}
          </p>
        ) : null}
        <button
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-black text-accent-foreground transition-[background-color,transform] hover:bg-accent-strong hover:text-accent-strong-foreground active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canDownload}
          onClick={handleDownload}
          type="button"
        >
          <Download aria-hidden="true" className="size-4" />
          Baixar post em PNG
        </button>
        <button
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-app-elevated px-4 text-sm font-black text-app-text transition-[background-color,transform] hover:bg-line/25 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canDownload || downloadingZip}
          onClick={handleDownloadAllZipped}
          type="button"
        >
          {downloadingZip ? (
            <Loader2
              aria-hidden="true"
              className="size-4 animate-spin text-accent"
            />
          ) : (
            <FileArchive aria-hidden="true" className="size-4" />
          )}
          {downloadingZip
            ? "Preparando arquivos..."
            : `Baixar ${media.length > 1 ? `${media.length} posts` : "post"} em ZIP`}
        </button>
      </footer>
    </aside>
  );
}
