import type { Dispatch, SetStateAction } from "react";
import type { DocumentsApi } from "./apiClient";
import {
  errorMessage,
  openDocumentDownload,
  replaceDocument,
  type WorkspaceStatus,
} from "./DocumentsModuleSupport";
import type {
  DocumentKind,
  DocumentPreview,
  DocumentTemplate,
  DocumentVersion,
  UpdateDocumentInput,
  UpdateDocumentTemplateInput,
  WorkspaceDocument,
} from "./types";

type DocumentsActionState = {
  documentToDelete: WorkspaceDocument | null;
  documentsApi: DocumentsApi;
  setDocumentPreview: Dispatch<SetStateAction<DocumentPreview | null>>;
  setDocumentToDelete: Dispatch<SetStateAction<WorkspaceDocument | null>>;
  setDocumentVersions: Dispatch<SetStateAction<DocumentVersion[]>>;
  setDocuments: Dispatch<SetStateAction<WorkspaceDocument[]>>;
  setIsDocumentActionBusy: Dispatch<SetStateAction<boolean>>;
  setIsSavingTemplate: Dispatch<SetStateAction<boolean>>;
  setSelectedDocument: Dispatch<SetStateAction<WorkspaceDocument | null>>;
  setStatus: Dispatch<SetStateAction<WorkspaceStatus>>;
  setTemplates: Dispatch<SetStateAction<DocumentTemplate[]>>;
};

export function useDocumentsModuleActions({
  documentToDelete,
  documentsApi,
  setDocumentPreview,
  setDocumentToDelete,
  setDocumentVersions,
  setDocuments,
  setIsDocumentActionBusy,
  setIsSavingTemplate,
  setSelectedDocument,
  setStatus,
  setTemplates,
}: DocumentsActionState) {
  const previewDocument = async (documentId: string) => {
    setIsDocumentActionBusy(true);
    setDocumentPreview(null);
    setDocumentVersions([]);
    try {
      const [preview, versions] = await Promise.all([
        documentsApi.previewDocument(documentId),
        documentsApi.listVersions(documentId),
      ]);
      setDocumentPreview(preview);
      setDocumentVersions(versions);
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    } finally {
      setIsDocumentActionBusy(false);
    }
  };

  const applyDocumentAction = async (
    action: () => Promise<WorkspaceDocument>,
  ) => {
    setIsDocumentActionBusy(true);
    try {
      const updated = await action();
      const [preview, versions] = await Promise.all([
        documentsApi.previewDocument(updated.id),
        documentsApi.listVersions(updated.id),
      ]);
      setDocuments((current) => replaceDocument(current, updated));
      setSelectedDocument(updated);
      setDocumentPreview(preview);
      setDocumentVersions(versions);
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    } finally {
      setIsDocumentActionBusy(false);
    }
  };

  const updateDocument = async (
    document: WorkspaceDocument,
    input: UpdateDocumentInput,
  ) => {
    const title = input.title?.trim();
    if (!title) {
      setStatus({
        kind: "error",
        message: "O titulo do documento e obrigatorio.",
      });
      return;
    }
    await applyDocumentAction(() =>
      documentsApi.updateDocument(document.id, { ...input, title }),
    );
  };

  const deleteDocument = async () => {
    if (!documentToDelete) return;
    setIsDocumentActionBusy(true);
    try {
      const updated = await documentsApi.deleteDocument(documentToDelete.id);
      setDocuments((current) => replaceDocument(current, updated));
      setSelectedDocument((current) =>
        current?.id === updated.id ? updated : current,
      );
      setDocumentToDelete(null);
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    } finally {
      setIsDocumentActionBusy(false);
    }
  };

  const downloadDocument = async (documentId: string, versionId?: string) => {
    setIsDocumentActionBusy(true);
    try {
      const download = await documentsApi.downloadDocument(
        documentId,
        versionId,
      );
      openDocumentDownload(download.downloadUrl);
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    } finally {
      setIsDocumentActionBusy(false);
    }
  };

  const saveTemplate = async (
    kind: DocumentKind,
    input: UpdateDocumentTemplateInput,
  ) => {
    setIsSavingTemplate(true);
    try {
      const updated = await documentsApi.updateTemplate(kind, input);
      setTemplates((current) =>
        current.map((template) =>
          template.kind === kind ? updated : template,
        ),
      );
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  return {
    applyDocumentAction,
    deleteDocument,
    downloadDocument,
    previewDocument,
    saveTemplate,
    updateDocument,
  };
}
