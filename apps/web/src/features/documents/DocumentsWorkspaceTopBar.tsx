import { FolderOpen, RefreshCcw, UploadCloud } from "lucide-react";
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
            className="documents-top-bar-action--mobile-only"
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
