import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureField } from "../../components/ui/FeatureForms";
import { formatFileSize } from "./crmMediaFiles";
import {
  CAMPAIGN_IMAGE_ACCEPT,
  validateCampaignImage,
} from "./crmCampaignMedia";

export function CrmCampaignImagePicker({
  disabled = false,
  error,
  file,
  onError,
  onRemove,
  onSelect,
}: {
  disabled?: boolean;
  error?: string | null;
  file: File | null;
  onError: (error: string | null) => void;
  onRemove: () => void;
  onSelect: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || typeof URL.createObjectURL !== "function") {
      setPreviewUrl(null);
      return undefined;
    }
    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

  const handleSelect = (candidate: File | undefined) => {
    if (!candidate) return;
    const validationError = validateCampaignImage(candidate);
    if (validationError) {
      onError(validationError);
      return;
    }
    onError(null);
    onSelect(candidate);
  };

  return (
    <FeatureField
      as="div"
      error={error}
      hint="JPEG, PNG, WebP ou GIF · até 10 MB · enviada apenas na mensagem inicial."
      label="Imagem inicial (opcional)"
    >
      <div className="crm-campaign-image-picker">
        <input
          accept={CAMPAIGN_IMAGE_ACCEPT}
          aria-label="Selecionar imagem da campanha"
          className="crm-campaign-image-input"
          disabled={disabled}
          onChange={(event) => {
            handleSelect(event.currentTarget.files?.[0]);
            event.currentTarget.value = "";
          }}
          ref={inputRef}
          type="file"
        />
        {file && previewUrl ? (
          <div className="crm-campaign-image-preview">
            <img alt={`Pré-visualização ${file.name}`} src={previewUrl} />
            <div className="crm-campaign-image-preview-meta">
              <strong>{file.name}</strong>
              <span>{formatFileSize(file.size)}</span>
            </div>
          </div>
        ) : file ? (
          <div className="crm-campaign-image-file">
            <ImagePlus aria-hidden="true" />
            <strong>{file.name}</strong>
            <span>{formatFileSize(file.size)}</span>
          </div>
        ) : (
          <div className="crm-campaign-image-empty">
            <ImagePlus aria-hidden="true" />
            <span>Adicione uma imagem para acompanhar a mensagem inicial.</span>
          </div>
        )}
        <div className="crm-campaign-image-actions">
          <FeatureActionButton
            className="crm-campaign-image-action"
            disabled={disabled}
            icon={file ? RefreshCw : ImagePlus}
            label={file ? "Trocar imagem" : "Adicionar imagem"}
            onClick={() => inputRef.current?.click()}
          />
          {file ? (
            <FeatureActionButton
              className="crm-campaign-image-action crm-campaign-image-remove"
              disabled={disabled}
              icon={Trash2}
              label="Remover imagem"
              onClick={() => {
                onError(null);
                onRemove();
              }}
            />
          ) : null}
        </div>
      </div>
    </FeatureField>
  );
}
