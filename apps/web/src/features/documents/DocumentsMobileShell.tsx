import { FileText, FolderOpen, RefreshCcw, UploadCloud } from "lucide-react";
import { FeatureTabs } from "../../components/ui/FeatureControls";
import type { DocumentsFolderKey } from "./documentDisplayModel";

export type DocumentsMobileTab = "documentos" | "pastas";

export function DocumentsMobileShell({
  activeTab,
  canUpload,
  isRefreshing,
  onSelectFolder,
  onTabChange,
  onTemplates,
  onRefresh,
  onUpload,
  selectedFolderTitle,
  showUpload,
  uploadTitle,
}: {
  activeTab: DocumentsMobileTab;
  canUpload: boolean;
  isRefreshing: boolean;
  onSelectFolder: (key: DocumentsFolderKey) => void;
  onTabChange: (tab: DocumentsMobileTab) => void;
  onTemplates: () => void;
  onRefresh: () => void;
  onUpload: () => void;
  selectedFolderTitle: string;
  showUpload: boolean;
  uploadTitle: string;
}) {
  return (
    <>
      <FeatureTabs
        activeClassName="documents-mobile-tab--active"
        ariaLabel="Navegacao do workspace"
        className="documents-mobile-tabs"
        onChange={onTabChange}
        optionClassName="documents-mobile-tab"
        options={[
          { icon: FileText, label: "Documentos", value: "documentos" },
          { icon: FolderOpen, label: "Pastas", value: "pastas" },
        ]}
        value={activeTab}
      />
      {activeTab === "documentos" ? (
        <div className="documents-mobile-breadcrumb">{selectedFolderTitle}</div>
      ) : null}
      <div
        aria-label="Acoes rapidas"
        className="documents-mobile-action-bar"
        role="toolbar"
      >
        <button
          className="documents-mobile-action"
          disabled={isRefreshing}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCcw
            aria-hidden="true"
            className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span>Atualizar</span>
        </button>
        <button
          className="documents-mobile-action"
          onClick={onTemplates}
          type="button"
        >
          <FileText aria-hidden="true" className="size-4" />
          <span>Modelos</span>
        </button>
        {showUpload ? (
          <button
            className="documents-mobile-action documents-mobile-action--primary"
            disabled={!canUpload}
            onClick={onUpload}
            title={uploadTitle}
            type="button"
          >
            <UploadCloud aria-hidden="true" className="size-4" />
            <span>Enviar</span>
          </button>
        ) : null}
      </div>
    </>
  );
}
