import type { DocumentsApi } from "./apiClient";
import { DocumentDeleteDialog } from "./DocumentDeleteDialog";
import { DocumentDetailPanel } from "./DocumentDetailPanel";
import { DocumentTemplatesPanel } from "./DocumentTemplatesPanel";
import { DocumentUploadDialog } from "./DocumentUploadDialog";
import { DocumentWorkspacePanel } from "./DocumentWorkspacePanel";
import { DOCUMENTS_WORKSPACE_LIMIT } from "./DocumentsModuleSupport";
import type { VoidDocumentInput } from "./types";
import { DocumentsWorkspaceHeader } from "./DocumentsModuleParts";
import { useDocumentsModuleState } from "./useDocumentsModuleState";

export function DocumentsModule({ api }: { api?: DocumentsApi }) {
  const state = useDocumentsModuleState(api);
  return (
    <main className="documents-shell">
      <DocumentsWorkspaceHeader
        counts={{ ...state.summaries, total: state.documents.length }}
        filters={state.filters}
        isResultCapped={state.isResultCapped}
        resultLimit={DOCUMENTS_WORKSPACE_LIMIT}
        onRefresh={() => void state.refresh()}
        updateFilter={state.updateFilter}
      />

      {state.status.kind === "error" ? (
        <p className="documents-alert">{state.status.message}</p>
      ) : null}
      <section className="documents-view-tabs" aria-label="Modo de documentos">
        <button
          className={state.view === "workspace" ? "is-active" : ""}
          onClick={() => state.setView("workspace")}
          type="button"
        >
          Workspace
        </button>
        <button
          className={state.view === "templates" ? "is-active" : ""}
          onClick={() => state.setView("templates")}
          type="button"
        >
          Modelos
        </button>
      </section>

      {state.view === "workspace" ? (
        <DocumentWorkspacePanel
          documents={state.documents}
          folders={state.folders}
          isBusy={state.isDocumentActionBusy}
          isResultCapped={state.isResultCapped}
          isLoading={state.status.kind === "loading"}
          onDownload={state.downloadDocument}
          onDelete={state.setDocumentToDelete}
          onOpenUpload={() => state.setIsUploadDialogOpen(true)}
          onSelect={state.setSelectedDocument}
          onSelectFolder={state.setSelectedFolderKey}
          onUpdate={state.updateDocument}
          onViewModeChange={(mode) => {
            state.setWorkspaceViewMode(mode);
            state.setSelectedFolderKey(null);
          }}
          selectedFolderKey={state.selectedFolderKey}
          viewMode={state.workspaceViewMode}
        />
      ) : (
        <DocumentTemplatesPanel
          isSaving={state.isSavingTemplate}
          onSave={state.saveTemplate}
          templates={state.templates}
        />
      )}
      <DocumentDetailPanel
        document={state.selectedDocument}
        isBusy={state.isDocumentActionBusy}
        onClose={() => {
          state.setSelectedDocument(null);
          state.setDocumentPreview(null);
          state.setDocumentVersions([]);
        }}
        onDownload={state.downloadDocument}
        onPreview={state.previewDocument}
        onRegenerate={(documentId) =>
          state.applyDocumentAction(() =>
            state.documentsApi.regenerateDocument(documentId),
          )
        }
        onVoid={(documentId, input: VoidDocumentInput) =>
          state.applyDocumentAction(() =>
            state.documentsApi.voidDocument(documentId, input),
          )
        }
        preview={state.documentPreview}
        versions={state.documentVersions}
      />
      <DocumentUploadDialog
        api={state.documentsApi}
        isOpen={state.isUploadDialogOpen}
        onClose={() => state.setIsUploadDialogOpen(false)}
        onUploaded={(uploadedDocuments) => {
          state.setDocuments((current) => [...uploadedDocuments, ...current]);
          state.setStatus({ kind: "ready" });
          void state.refresh();
        }}
        target={state.uploadTarget}
      />
      <DocumentDeleteDialog
        document={state.documentToDelete}
        isBusy={state.isDocumentActionBusy}
        onClose={() => state.setDocumentToDelete(null)}
        onConfirm={() => void state.deleteDocument()}
      />
    </main>
  );
}
