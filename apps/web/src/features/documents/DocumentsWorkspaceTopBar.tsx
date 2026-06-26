import { FileText, FolderOpen, RefreshCcw, UploadCloud } from "lucide-react";
import type { DocumentsFolderKey } from "./documentDisplayModel";
import {
  FeatureActionButton,
  FeaturePageHeader,
} from "../../components/ui/FeatureLayout";

export function DocumentsWorkspaceTopBar({
  folderTitle,
  folderSubtitle,
  isRefreshing,
  isUploading,
  onOpenFolders,
  onOpenTemplates,
  onRefresh,
  onUpload,
  selectedKey,
  showUpload,
  unitLabel,
  uploadTitle,
}: {
  folderTitle: string;
  folderSubtitle: string;
  isRefreshing: boolean;
  isUploading: boolean;
  onOpenFolders: () => void;
  onOpenTemplates: () => void;
  onRefresh: () => void;
  onUpload: () => void;
  selectedKey: DocumentsFolderKey;
  showUpload: boolean;
  unitLabel: string | null;
  uploadTitle: string;
}) {
  return (
    <FeaturePageHeader
      actions={
        <>
          <FeatureActionButton
            className="md:hidden"
            icon={FolderOpen}
            label="Pastas"
            onClick={onOpenFolders}
          />
          <FeatureActionButton
            disabled={isRefreshing}
            icon={RefreshCcw}
            isBusy={isRefreshing}
            label="Atualizar"
            onClick={onRefresh}
          />
          <FeatureActionButton
            icon={FileText}
            label="Modelos"
            onClick={onOpenTemplates}
          />
          {showUpload ? (
            <FeatureActionButton
              disabled={isUploading}
              icon={UploadCloud}
              label="Enviar documento"
              onClick={onUpload}
              title={uploadTitle}
              variant="primary"
            />
          ) : null}
        </>
      }
      actionsLabel="Ações do workspace"
      chip={
        unitLabel ? (
          <>
            <FolderOpen aria-hidden="true" className="size-3.5" />
            {unitLabel}
          </>
        ) : null
      }
      eyebrow="Documentos"
      hiddenStateValue={selectedKey}
      subtitle={folderSubtitle}
      title={folderTitle}
    />
  );
}
