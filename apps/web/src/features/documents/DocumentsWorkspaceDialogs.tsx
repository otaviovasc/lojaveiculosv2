import { DocumentDeleteDialog } from "./DocumentDeleteDialog";
import { DocumentManageLinksDialog } from "./DocumentManageLinksDialog";
import {
  DocumentUploadDialog,
  type DocumentUploadTarget,
} from "./DocumentUploadDialog";
import { DocumentsFolderSidebar } from "./DocumentsFolderSidebar";
import type { DocumentsApi } from "./apiClient";
import type {
  DocumentVehicleOption,
  DocumentsFolderKey,
} from "./documentDisplayModel";
import type { UpdateDocumentInput, WorkspaceDocument } from "./types";

export type DocumentsMobileTab = "documentos" | "pastas";

export function DocumentsWorkspaceDialogs({
  deleteDocument,
  documentToDelete,
  documents,
  isDocumentActionBusy,
  isUploadDialogOpen,
  linkDocument,
  mobileTab,
  onMobileTabChange,
  onRefresh,
  onSelectFolder,
  onUpdateDocument,
  runtimeApi,
  selectedKey,
  setDocumentToDelete,
  setIsUploadDialogOpen,
  setLinkDocument,
  unitFoldersStatus,
  uploadTarget,
  vehicleOptions,
}: {
  deleteDocument: () => Promise<void>;
  documentToDelete: WorkspaceDocument | null;
  documents: readonly WorkspaceDocument[];
  isDocumentActionBusy: boolean;
  isUploadDialogOpen: boolean;
  linkDocument: WorkspaceDocument | null;
  mobileTab: DocumentsMobileTab;
  onMobileTabChange: (tab: DocumentsMobileTab) => void;
  onRefresh: () => void;
  onSelectFolder: (key: DocumentsFolderKey) => void;
  onUpdateDocument: (
    doc: WorkspaceDocument,
    input: UpdateDocumentInput,
  ) => Promise<WorkspaceDocument | null>;
  runtimeApi: DocumentsApi | null;
  selectedKey: DocumentsFolderKey;
  setDocumentToDelete: (doc: WorkspaceDocument | null) => void;
  setIsUploadDialogOpen: (open: boolean) => void;
  setLinkDocument: (doc: WorkspaceDocument | null) => void;
  unitFoldersStatus: "idle" | "loading" | "ready" | "error";
  uploadTarget: DocumentUploadTarget | null;
  vehicleOptions: readonly DocumentVehicleOption[];
}) {
  return (
    <>
      {mobileTab === "pastas" ? (
        <div
          className="documents-modal-backdrop md:hidden"
          onClick={() => onMobileTabChange("documentos")}
        >
          <div
            aria-label="Pastas de documentos"
            aria-modal="true"
            className="documents-mobile-folders"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <DocumentsFolderSidebar
              documents={documents}
              isLoading={unitFoldersStatus === "loading"}
              onSelect={onSelectFolder}
              selectedKey={selectedKey}
              vehicleOptions={vehicleOptions}
            />
          </div>
        </div>
      ) : null}

      {runtimeApi && uploadTarget ? (
        <DocumentUploadDialog
          api={runtimeApi}
          isOpen={isUploadDialogOpen}
          onClose={() => setIsUploadDialogOpen(false)}
          onUploaded={() => {
            setIsUploadDialogOpen(false);
            void onRefresh();
          }}
          target={uploadTarget}
        />
      ) : null}
      <DocumentManageLinksDialog
        document={linkDocument}
        isBusy={isDocumentActionBusy}
        onClose={() => setLinkDocument(null)}
        onSave={onUpdateDocument}
        vehicleOptions={vehicleOptions}
      />
      <DocumentDeleteDialog
        document={documentToDelete}
        isBusy={isDocumentActionBusy}
        onClose={() => setDocumentToDelete(null)}
        onConfirm={() => void deleteDocument()}
      />
    </>
  );
}
