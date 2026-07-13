import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FeatureTextarea } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";

export function SaleReasonDialog({
  confirmLabel,
  description,
  fieldLabel,
  isOpen,
  isSaving,
  loadingLabel,
  onClose,
  onConfirm,
  placeholder,
  title,
}: {
  confirmLabel: string;
  description: ReactNode;
  fieldLabel: string;
  isOpen: boolean;
  isSaving: boolean;
  loadingLabel: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  placeholder: string;
  title: string;
}) {
  const [reason, setReason] = useState("");
  const handleClose = useCallback(() => {
    if (!isSaving) onClose();
  }, [isSaving, onClose]);

  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  return (
    <FeatureDialog
      description={description}
      footer={
        <FeatureDialogActions
          confirmDisabled={!reason.trim()}
          confirmLabel={confirmLabel}
          isLoading={isSaving}
          loadingLabel={loadingLabel}
          onCancel={handleClose}
          onConfirm={() => onConfirm(reason.trim())}
          variant="danger"
        />
      }
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
    >
      <FeatureField label={fieldLabel}>
        <FeatureTextarea
          aria-label={fieldLabel}
          autoFocus
          disabled={isSaving}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          placeholder={placeholder}
          value={reason}
        />
      </FeatureField>
    </FeatureDialog>
  );
}
