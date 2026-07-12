import { Trash2 } from "lucide-react";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import type { PublicApiClient } from "./types";

export function PublicApiRevokeDialog({
  client,
  error,
  isLoading,
  onClose,
  onConfirm,
}: {
  client: PublicApiClient | null;
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <FeatureDialog
      footer={
        <FeatureDialogActions
          cancelDisabled={isLoading}
          confirmIcon={<Trash2 aria-hidden="true" className="size-4" />}
          confirmLabel="Revogar cliente"
          isLoading={isLoading}
          loadingLabel="Revogando"
          onCancel={onClose}
          onConfirm={onConfirm}
          variant="danger"
        />
      }
      isOpen={client !== null}
      onClose={onClose}
      title="Revogar acesso externo"
    >
      <div className="public-api-revoke-dialog">
        <p>
          As chaves ativas de <strong>{client?.name}</strong> deixarão de
          autenticar imediatamente. Esta ação não pode ser desfeita.
        </p>
        {error ? (
          <p className="public-api-revoke-dialog__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </FeatureDialog>
  );
}
