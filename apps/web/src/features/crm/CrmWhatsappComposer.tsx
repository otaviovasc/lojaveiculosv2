import { Loader2, Reply, Send, X } from "lucide-react";
import { CrmWhatsappAttachMenu } from "./CrmWhatsappAttachMenu";
import { CrmWhatsappAudioRecorderButton } from "./CrmWhatsappAudioRecorderButton";
import { CatalogDialog } from "./CrmWhatsappCatalogDialog";
import { LocationDialog } from "./CrmWhatsappComposerActionDialogs";
import { VehicleDialog } from "./CrmWhatsappVehicleDialog";
import { CrmWhatsappMediaPreviewDialog } from "./CrmWhatsappMediaPreviewDialog";
import { CrmWhatsappQuickMessageManager } from "./CrmWhatsappQuickMessageManager";
import { CrmWhatsappQuickMessagePicker } from "./CrmWhatsappQuickMessagePicker";
import { addFiles, formatReplyDraft } from "./crmWhatsappComposerSupport";
import type {
  ComposerDialog,
  MessageComposerProps,
} from "./CrmWhatsappComposerTypes";
import { useMessageComposerState } from "./CrmWhatsappComposerState";

export function MessageComposer({
  catalogUrl,
  defaultLocationName,
  disabled = false,
  onSend,
  onSendCatalog,
  onLoadCatalogProducts,
  onSendLocation,
  onSendMedia,
  onLoadVehicles,
  onSendCatalogProduct,
  onSendQuickMessage,
  onSendVehicle,
  onCreateQuickMessage,
  onDeleteQuickMessage,
  onUpdateQuickMessage,
  quickMessages = [],
  replyToMessage,
  onCancelReply,
}: MessageComposerProps) {
  const composerState = useMessageComposerState({
    disabled,
    onSend,
    onSendMedia,
    onSendQuickMessage,
    quickMessages,
  });
  const {
    activeIndex,
    applyQuickMessage,
    canSend,
    dialog,
    discardFiles,
    effectiveDisabled,
    files,
    imageInputRef,
    audioInputRef,
    documentInputRef,
    menuOpen,
    onTextChange,
    onTextKeyDown,
    quickIndex,
    quickMatches,
    quickPickerOpen,
    removeFile,
    setActiveIndex,
    setDialog,
    setFiles,
    setMenuOpen,
    submit,
    text,
    textareaRef,
    previewUrls,
  } = composerState;

  const openDialog = (nextDialog: ComposerDialog) => {
    setDialog(nextDialog);
    setMenuOpen(false);
  };

  return (
    <form
      className="crm-whatsapp-composer"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <input
        accept="image/*,video/*"
        hidden
        multiple
        onChange={(event) => {
          addFiles(event.currentTarget.files, setFiles);
          event.currentTarget.value = "";
        }}
        ref={imageInputRef}
        type="file"
      />
      <input
        accept="audio/*"
        hidden
        multiple
        onChange={(event) => {
          addFiles(event.currentTarget.files, setFiles);
          event.currentTarget.value = "";
        }}
        ref={audioInputRef}
        type="file"
      />
      <input
        accept=".csv,.doc,.docx,.pdf,.txt,.xls,.xlsx,application/pdf,text/plain"
        hidden
        multiple
        onChange={(event) => {
          addFiles(event.currentTarget.files, setFiles);
          event.currentTarget.value = "";
        }}
        ref={documentInputRef}
        type="file"
      />

      {files.length ? (
        <CrmWhatsappMediaPreviewDialog
          activeIndex={activeIndex}
          caption={text}
          disabled={effectiveDisabled}
          files={files}
          onCaptionChange={onTextChange}
          onClose={discardFiles}
          onPickAudio={() => audioInputRef.current?.click()}
          onPickDocuments={() => documentInputRef.current?.click()}
          onPickImages={() => imageInputRef.current?.click()}
          onRemove={removeFile}
          onSelect={setActiveIndex}
          onSend={() => void submit()}
          previewUrls={previewUrls}
        />
      ) : null}
      {dialog === "catalog" ? (
        <CatalogDialog
          catalogUrl={catalogUrl}
          disabled={effectiveDisabled}
          onClose={() => setDialog(null)}
          onLoadProducts={onLoadCatalogProducts}
          onSend={onSendCatalog}
          onSendProduct={onSendCatalogProduct}
        />
      ) : null}
      {dialog === "location" ? (
        <LocationDialog
          {...(defaultLocationName ? { defaultName: defaultLocationName } : {})}
          disabled={effectiveDisabled}
          onClose={() => setDialog(null)}
          onSend={onSendLocation}
        />
      ) : null}
      {dialog === "quick" ? (
        <CrmWhatsappQuickMessageManager
          disabled={effectiveDisabled}
          messages={quickMessages}
          onClose={() => setDialog(null)}
          onCreate={onCreateQuickMessage}
          onDelete={onDeleteQuickMessage}
          onUpdate={onUpdateQuickMessage}
        />
      ) : null}
      {dialog === "vehicle" ? (
        <VehicleDialog
          disabled={effectiveDisabled}
          onClose={() => setDialog(null)}
          onLoadVehicles={onLoadVehicles}
          onSend={onSendVehicle}
        />
      ) : null}

      {replyToMessage ? (
        <div className="crm-whatsapp-reply-draft">
          <Reply aria-hidden="true" />
          <span>
            <strong>Respondendo</strong>
            <small>{formatReplyDraft(replyToMessage)}</small>
          </span>
          <button
            aria-label="Cancelar resposta"
            disabled={effectiveDisabled}
            onClick={onCancelReply}
            title="Cancelar resposta"
            type="button"
          >
            <X />
          </button>
        </div>
      ) : null}

      <div
        aria-hidden={files.length ? "true" : undefined}
        className="crm-whatsapp-composer-row"
      >
        <CrmWhatsappAttachMenu
          disabled={effectiveDisabled}
          onOpenAudio={() => {
            setMenuOpen(false);
            audioInputRef.current?.click();
          }}
          onOpenCatalog={() => openDialog("catalog")}
          onOpenDocuments={() => {
            setMenuOpen(false);
            documentInputRef.current?.click();
          }}
          onOpenImages={() => {
            setMenuOpen(false);
            imageInputRef.current?.click();
          }}
          onOpenLocation={() => openDialog("location")}
          onOpenQuickMessages={() => {
            openDialog("quick");
          }}
          onOpenVehicle={() => openDialog("vehicle")}
          onToggle={() => setMenuOpen((open) => !open)}
          open={menuOpen}
        />
        <div className="crm-whatsapp-composer-textbox">
          {quickPickerOpen ? (
            <CrmWhatsappQuickMessagePicker
              activeIndex={quickIndex}
              messages={quickMatches}
              onPick={applyQuickMessage}
            />
          ) : null}
          <textarea
            disabled={effectiveDisabled}
            onChange={(event) => onTextChange(event.target.value)}
            onKeyDown={onTextKeyDown}
            placeholder="Digite uma mensagem..."
            ref={textareaRef}
            rows={1}
            value={text}
          />
          <CrmWhatsappAudioRecorderButton
            disabled={effectiveDisabled}
            onRecorded={(file) => setFiles((current) => [...current, file])}
          />
        </div>
        <button
          aria-label="Enviar mensagem"
          className="crm-icon-action crm-icon-action-active crm-whatsapp-send-action"
          disabled={effectiveDisabled || !canSend}
          title="Enviar"
          type="submit"
        >
          {effectiveDisabled ? <Loader2 className="crm-spin" /> : <Send />}
        </button>
      </div>
    </form>
  );
}
