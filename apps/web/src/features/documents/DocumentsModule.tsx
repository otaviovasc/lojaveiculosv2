import { useEffect, useMemo, useState } from "react";
import type { DocumentsApi } from "./apiClient";
import { DocumentDetailPanel } from "./DocumentDetailPanel";
import { DocumentTemplatesPanel } from "./DocumentTemplatesPanel";
import {
  createRuntimeDocumentsApi,
  type DocumentsView,
  errorMessage,
  replaceDocument,
  summarizeDocuments,
  type WorkspaceStatus,
} from "./DocumentsModuleSupport";
import type {
  DocumentKind,
  DocumentPreview,
  DocumentTemplate,
  DocumentVersion,
  ListDocumentsFilters,
  UpdateDocumentTemplateInput,
  VoidDocumentInput,
  WorkspaceDocument,
} from "./types";
import {
  DocumentsWorkspaceHeader,
  DocumentWorkspacePanel,
} from "./DocumentsModuleParts";

export function DocumentsModule({ api }: { api?: DocumentsApi }) {
  const documentsApi = useMemo(() => api ?? createRuntimeDocumentsApi(), [api]);
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [filters, setFilters] = useState<ListDocumentsFilters>({});
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [view, setView] = useState<DocumentsView>("workspace");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<WorkspaceDocument | null>(null);
  const [documentPreview, setDocumentPreview] =
    useState<DocumentPreview | null>(null);
  const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>(
    [],
  );
  const [isDocumentActionBusy, setIsDocumentActionBusy] = useState(false);
  const [status, setStatus] = useState<WorkspaceStatus>({ kind: "loading" });
  const refresh = async (nextFilters = filters) => {
    setStatus({ kind: "loading" });
    try {
      const [nextDocuments, nextTemplates] = await Promise.all([
        documentsApi.listDocuments(nextFilters),
        documentsApi.listTemplates(),
      ]);
      setDocuments(nextDocuments);
      setSelectedDocument((current) =>
        current
          ? (nextDocuments.find((document) => document.id === current.id) ??
            null)
          : null,
      );
      setTemplates([...nextTemplates]);
      setStatus({ kind: "ready" });
    } catch (error) {
      setDocuments([]);
      setTemplates([]);
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };
  const previewDocument = async (documentId: string) => {
    setIsDocumentActionBusy(true);
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
  const downloadDocument = async (documentId: string, versionId?: string) => {
    setIsDocumentActionBusy(true);
    try {
      const download = await documentsApi.downloadDocument(
        documentId,
        versionId,
      );
      window.open(download.downloadUrl, "_blank", "noopener,noreferrer");
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    } finally {
      setIsDocumentActionBusy(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const updateFilter = <Key extends keyof ListDocumentsFilters>(
    key: Key,
    value: ListDocumentsFilters[Key],
  ) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    void refresh(nextFilters);
  };

  const counts = summarizeDocuments(documents);
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

  return (
    <main className="documents-shell">
      <DocumentsWorkspaceHeader
        counts={{ ...counts, total: documents.length }}
        filters={filters}
        onRefresh={() => void refresh()}
        updateFilter={updateFilter}
      />

      {status.kind === "error" ? (
        <p className="documents-alert">{status.message}</p>
      ) : null}
      <section className="documents-view-tabs" aria-label="Modo de documentos">
        <button
          className={view === "workspace" ? "is-active" : ""}
          onClick={() => setView("workspace")}
          type="button"
        >
          Workspace
        </button>
        <button
          className={view === "templates" ? "is-active" : ""}
          onClick={() => setView("templates")}
          type="button"
        >
          Modelos
        </button>
      </section>

      {view === "workspace" ? (
        <DocumentWorkspacePanel
          documents={documents}
          isLoading={status.kind === "loading"}
          onSelect={setSelectedDocument}
        />
      ) : (
        <DocumentTemplatesPanel
          isSaving={isSavingTemplate}
          onSave={saveTemplate}
          templates={templates}
        />
      )}
      <DocumentDetailPanel
        document={selectedDocument}
        isBusy={isDocumentActionBusy}
        onClose={() => setSelectedDocument(null)}
        onDownload={downloadDocument}
        onPreview={previewDocument}
        onRegenerate={(documentId) =>
          applyDocumentAction(() => documentsApi.regenerateDocument(documentId))
        }
        onVoid={(documentId, input: VoidDocumentInput) =>
          applyDocumentAction(() =>
            documentsApi.voidDocument(documentId, input),
          )
        }
        preview={documentPreview}
        versions={documentVersions}
      />
    </main>
  );
}
