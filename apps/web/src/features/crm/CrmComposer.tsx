import { AnimatedIconSwap } from "../../components/ui/AnimatedIconSwap";
import { Loader2, Reply, Send, X } from "lucide-react";
import { forwardRef, useCallback, useImperativeHandle } from "react";
import { CrmComposerAttachMenu } from "./CrmComposerAttachMenu";
import { CrmComposerAudioRecorderButton } from "./CrmComposerAudioRecorderButton";
import { CatalogDialog } from "./CrmWhatsappCatalogDialog";
import { LocationDialog } from "./CrmComposerActionDialogs";
import { VehicleDialog } from "./CrmWhatsappVehicleDialog";
import { CrmComposerFinancingDialog } from "./CrmComposerFinancingDialog";
import { CrmComposerNoteDialog } from "./CrmComposerNoteDialog";
import { CrmComposerTagsDialog } from "./CrmComposerTagsDialog";
import { CrmScheduleMessageDialog } from "./CrmScheduleMessageDialog";
import { CrmVisitSessionDialog } from "./CrmVisitSessionDialog";
import { CrmMediaPreviewDialog } from "./CrmMediaPreviewDialog";
import { CrmQuickMessageManager } from "./CrmQuickMessageManager";
import { CrmQuickMessagePicker } from "./CrmQuickMessagePicker";
import { addFiles, formatReplyDraft } from "./crmComposerSupport";
import type { ComposerDialog, MessageComposerProps } from "./CrmComposerTypes";
import { useMessageComposerState } from "./CrmComposerState";
import { readCrmConnectionCapabilities } from "./crmProviderCapabilities";
import { readMediaType } from "./crmMediaFiles";

export type MessageComposerHandle = {
  focusInput: () => void;
  openFiles: (files: readonly File[]) => void;
  insertPrompt: (text: string) => void;
};

export const MessageComposer = forwardRef<
  MessageComposerHandle,
  MessageComposerProps
>(function MessageComposer(
  {
    availableTags = [],
    capabilities = readCrmConnectionCapabilities(undefined),
    canScheduleCreate = true,
    catalogUrl,
    cycle = null,
    defaultLocationName,
    disabled = false,
    onAddCycleTag,
    onCancelScheduledMessage,
    onListScheduledMessages,
    onProcessDueScheduledMessages,
    onRemoveCycleTag,
    onScheduleMessage,
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
  }: MessageComposerProps,
  ref,
) {
  const composerState = useMessageComposerState({
    allowMediaCaption: capabilities.allowImageCaption,
    allowQuickMessages: capabilities.allowQuickMessages,
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
    isSubmitting,
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

  const openFiles = useCallback(
    (incomingFiles: readonly File[]) => {
      const acceptedFiles = incomingFiles.filter((file) => {
        const mediaType = readMediaType(file);
        if (mediaType === "audio") return capabilities.allowAudio;
        if (mediaType === "document") return capabilities.allowDocuments;
        if (mediaType === "video") return capabilities.allowVideo;
        return capabilities.allowImages;
      });
      if (acceptedFiles.length) {
        setFiles((current) => [...current, ...acceptedFiles]);
      }
    },
    [capabilities, setFiles],
  );

  const insertPrompt = useCallback(
    (promptText: string) => {
      onTextChange(promptText);
      window.requestAnimationFrame(() =>
        textareaRef.current?.focus({ preventScroll: true }),
      );
    },
    [onTextChange, textareaRef],
  );

  const focusInput = useCallback(() => {
    textareaRef.current?.focus({ preventScroll: true });
  }, [textareaRef]);

  useImperativeHandle(ref, () => ({ focusInput, openFiles, insertPrompt }), [
    focusInput,
    openFiles,
    insertPrompt,
  ]);

  const openDialog = (nextDialog: ComposerDialog) => {
    setDialog(nextDialog);
    setMenuOpen(false);
  };

  return (
    <form
      className="crm-composer"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <input
        accept={capabilities.allowVideo ? "image/*,video/*" : "image/*"}
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
        <CrmMediaPreviewDialog
          activeIndex={activeIndex}
          allowAudio={capabilities.allowAudio}
          allowCaption={capabilities.allowImageCaption}
          allowDocuments={capabilities.allowDocuments}
          allowVideo={capabilities.allowVideo}
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
      {dialog === "catalog" && capabilities.allowCatalog ? (
        <CatalogDialog
          catalogUrl={catalogUrl}
          disabled={effectiveDisabled}
          onClose={() => setDialog(null)}
          onLoadProducts={onLoadCatalogProducts}
          onSend={onSendCatalog}
          onSendProduct={onSendCatalogProduct}
        />
      ) : null}
      {dialog === "location" && capabilities.allowLocation ? (
        <LocationDialog
          {...(defaultLocationName ? { defaultName: defaultLocationName } : {})}
          disabled={effectiveDisabled}
          onClose={() => setDialog(null)}
          onSend={onSendLocation}
        />
      ) : null}
      {dialog === "quick" && capabilities.allowQuickMessages ? (
        <CrmQuickMessageManager
          disabled={effectiveDisabled}
          messages={quickMessages}
          onClose={() => setDialog(null)}
          onCreate={onCreateQuickMessage}
          onDelete={onDeleteQuickMessage}
          onUpdate={onUpdateQuickMessage}
        />
      ) : null}
      {dialog === "vehicle" && capabilities.allowVehicle ? (
        <VehicleDialog
          disabled={effectiveDisabled}
          onClose={() => setDialog(null)}
          onLoadVehicles={onLoadVehicles}
          onSend={onSendVehicle}
        />
      ) : null}
      {dialog === "schedule" &&
      capabilities.allowScheduling &&
      onScheduleMessage &&
      onListScheduledMessages &&
      onCancelScheduledMessage &&
      onProcessDueScheduledMessages ? (
        <CrmScheduleMessageDialog
          canCancel
          canCreate={canScheduleCreate}
          canProcess
          canRead
          onCancel={onCancelScheduledMessage}
          onClose={() => setDialog(null)}
          onList={onListScheduledMessages}
          onProcessDue={onProcessDueScheduledMessages}
          onSchedule={onScheduleMessage}
        />
      ) : null}
      {dialog === "note" && capabilities.allowNotes && cycle?.leadId ? (
        <CrmComposerNoteDialog
          disabled={effectiveDisabled}
          leadId={cycle.leadId}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === "tags" &&
      capabilities.allowTags &&
      onAddCycleTag &&
      onRemoveCycleTag ? (
        <CrmComposerTagsDialog
          activeTags={cycle?.tags ?? []}
          availableTags={availableTags}
          disabled={effectiveDisabled}
          onAddTag={onAddCycleTag}
          onClose={() => setDialog(null)}
          onRemoveTag={onRemoveCycleTag}
        />
      ) : null}
      {dialog === "visit" && capabilities.allowVisits && cycle?.leadId ? (
        <CrmVisitSessionDialog
          cycle={cycle}
          disabled={effectiveDisabled}
          listVehicles={onLoadVehicles}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === "financing" &&
      capabilities.allowFinancing &&
      cycle?.leadId ? (
        <CrmComposerFinancingDialog
          disabled={effectiveDisabled}
          leadId={cycle.leadId}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {replyToMessage && capabilities.allowReply ? (
        <div className="crm-reply-draft">
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
        className="crm-composer-row"
      >
        <CrmComposerAttachMenu
          capabilities={capabilities}
          disabled={effectiveDisabled}
          hasLead={Boolean(cycle?.leadId)}
          onOpenAudio={() => {
            setMenuOpen(false);
            audioInputRef.current?.click();
          }}
          onOpenCatalog={() => openDialog("catalog")}
          onOpenDocuments={() => {
            setMenuOpen(false);
            documentInputRef.current?.click();
          }}
          onOpenFinancing={() => openDialog("financing")}
          onOpenImages={() => {
            setMenuOpen(false);
            imageInputRef.current?.click();
          }}
          onOpenLocation={() => openDialog("location")}
          onOpenNote={() => openDialog("note")}
          onOpenQuickMessages={() => {
            openDialog("quick");
          }}
          onOpenSchedule={() => openDialog("schedule")}
          onOpenTags={() => openDialog("tags")}
          onOpenVehicle={() => openDialog("vehicle")}
          onOpenVisit={() => openDialog("visit")}
          onToggle={() => setMenuOpen((open) => !open)}
          open={menuOpen}
        />
        <div className="crm-composer-textbox">
          {quickPickerOpen ? (
            <CrmQuickMessagePicker
              activeIndex={quickIndex}
              messages={quickMatches}
              onPick={applyQuickMessage}
            />
          ) : null}
          <textarea
            aria-label="Mensagem para enviar"
            disabled={effectiveDisabled}
            onChange={(event) => onTextChange(event.target.value)}
            onKeyDown={onTextKeyDown}
            placeholder="Digite uma mensagem..."
            ref={textareaRef}
            rows={1}
            value={text}
          />
        </div>
        <AnimatedIconSwap
          stateKey={isSubmitting ? "submitting" : canSend ? "send" : "audio"}
          variant="pop"
        >
          {isSubmitting || canSend ? (
            <button
              aria-label="Enviar mensagem"
              className="crm-icon-action crm-icon-action-active crm-send-action"
              disabled={effectiveDisabled || !canSend}
              title="Enviar"
              type="submit"
            >
              <AnimatedIconSwap
                stateKey={isSubmitting ? "loading" : "send"}
                variant="rotate-spin"
              >
                {isSubmitting ? <Loader2 className="crm-spin" /> : <Send />}
              </AnimatedIconSwap>
            </button>
          ) : capabilities.allowAudio ? (
            <CrmComposerAudioRecorderButton
              disabled={effectiveDisabled}
              primary
              onSend={(file) => onSendMedia({ file, mediaType: "audio" })}
            />
          ) : null}
        </AnimatedIconSwap>
      </div>
    </form>
  );
});
