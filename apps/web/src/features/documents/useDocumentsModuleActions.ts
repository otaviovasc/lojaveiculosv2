import type { Dispatch, SetStateAction } from "react";
import type { DocumentsApi } from "./apiClient";
import {
  errorMessage,
  openDocumentDownload,
  replaceDocument,
  type WorkspaceStatus,
} from "./DocumentsModuleSupport";
import type {
  DocumentDownload,
  DocumentKind,
  DocumentTemplate,
  DocumentVersion,
  UpdateDocumentInput,
  UpdateDocumentTemplateInput,
  WorkspaceDocument,
} from "./types";

type DocumentsActionState = {
  documentToDelete: WorkspaceDocument | null;
  documentsApi: DocumentsApi | null;
  setDocumentPreview: Dispatch<SetStateAction<DocumentDownload | null>>;
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
  function requireApi(): DocumentsApi {
    if (!documentsApi) throw new Error("API de documentos indisponível.");
    return documentsApi;
  }

  const previewDocument = async (documentId: string) => {
    setIsDocumentActionBusy(true);
    setDocumentPreview(null);
    setDocumentVersions([]);
    try {
      const [preview, versions] = await Promise.all([
        requireApi().downloadDocument(documentId, { disposition: "inline" }),
        requireApi().listVersions(documentId),
      ]);
      setDocumentPreview(preview);
      setDocumentVersions(versions);
    } catch (error) {
      setSelectedDocument(null);
      setDocumentPreview(null);
      setDocumentVersions([]);
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
        requireApi().downloadDocument(updated.id, { disposition: "inline" }),
        requireApi().listVersions(updated.id),
      ]);
      setDocuments((current) => replaceDocument(current, updated));
      setSelectedDocument(updated);
      setDocumentPreview(preview);
      setDocumentVersions(versions);
      setStatus({ kind: "ready" });
      return updated;
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
      return null;
    } finally {
      setIsDocumentActionBusy(false);
    }
  };

  const updateDocument = async (
    document: WorkspaceDocument,
    input: UpdateDocumentInput,
  ) => {
    const title = input.title?.trim();
    const nextInput: UpdateDocumentInput = { ...input };
    if ("title" in input) {
      if (!title) {
        setStatus({
          kind: "error",
          message: "O título do documento é obrigatório.",
        });
        return null;
      }
      nextInput.title = title;
    }
    if (Object.keys(nextInput).length === 0) {
      setStatus({
        kind: "error",
        message: "Informe ao menos uma alteração no documento.",
      });
      return null;
    }
    return applyDocumentAction(() =>
      requireApi().updateDocument(document.id, nextInput),
    );
  };

  const deleteDocument = async () => {
    if (!documentToDelete) return;
    setIsDocumentActionBusy(true);
    try {
      const updated = await requireApi().deleteDocument(documentToDelete.id);
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
      const download = await requireApi().downloadDocument(
        documentId,
        versionId ? { versionId } : undefined,
      );
      openDocumentDownload(download);
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
      const updated = await requireApi().updateTemplate(kind, input);
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
