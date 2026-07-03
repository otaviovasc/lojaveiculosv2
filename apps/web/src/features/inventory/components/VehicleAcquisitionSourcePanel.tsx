import type { Dispatch, SetStateAction } from "react";
import { Save } from "lucide-react";
import {
  InventoryField,
  InventorySelect,
  InventoryTextarea,
} from "./InventoryFormParts";
import { IconButton, TextField } from "./VehicleAcquisitionCardParts";
import {
  channelOptions,
  commissionOptions,
  type AcquisitionDraft,
} from "./VehicleAcquisitionCardModel";

type Props = {
  acquisitionDraft: AcquisitionDraft;
  isSaving: boolean;
  onSave: () => void;
  setAcquisitionDraft: Dispatch<SetStateAction<AcquisitionDraft>>;
};

export function VehicleAcquisitionSourcePanel({
  acquisitionDraft,
  isSaving,
  onSave,
  setAcquisitionDraft,
}: Props) {
  return (
    <div className="grid gap-3 content-start">
      <div className="grid gap-3 sm:grid-cols-2">
        <InventoryField label="Canal">
          <InventorySelect
            onChange={(value) =>
              setAcquisitionDraft((current) => ({
                ...current,
                channel: value,
              }))
            }
            options={channelOptions}
            value={acquisitionDraft.channel}
          />
        </InventoryField>
        <InventoryField label="Comissão">
          <InventorySelect
            onChange={(value) =>
              setAcquisitionDraft((current) => ({
                ...current,
                commissionTiming: value,
              }))
            }
            options={commissionOptions}
            value={acquisitionDraft.commissionTiming ?? "closed"}
          />
        </InventoryField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Valor compra"
          onChange={(value) =>
            setAcquisitionDraft((current) => ({
              ...current,
              priceDraft: value,
            }))
          }
          value={acquisitionDraft.priceDraft}
        />
        <TextField
          label="Data"
          onChange={(value) =>
            setAcquisitionDraft((current) => ({
              ...current,
              acquisitionDate: value || null,
            }))
          }
          placeholder="dd/mm/aaaa"
          value={acquisitionDraft.acquisitionDate}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Lead de origem"
          onChange={(value) =>
            setAcquisitionDraft((current) => ({
              ...current,
              leadId: value || null,
            }))
          }
          value={acquisitionDraft.leadId}
        />
        <TextField
          label="Rótulo"
          onChange={(value) =>
            setAcquisitionDraft((current) => ({
              ...current,
              customChannelLabel: value || null,
            }))
          }
          value={acquisitionDraft.customChannelLabel}
        />
      </div>
      <InventoryField label="Observações">
        <InventoryTextarea
          onChange={(event) =>
            setAcquisitionDraft((current) => ({
              ...current,
              notes: event.target.value || null,
            }))
          }
          value={acquisitionDraft.notes ?? ""}
        />
      </InventoryField>
      <IconButton
        disabled={isSaving}
        icon={<Save className="size-3.5" />}
        label="Salvar origem"
        onClick={onSave}
        variant="primary"
      />
    </div>
  );
}
