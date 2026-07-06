import type { Dispatch, SetStateAction } from "react";
import { DatePickerField } from "../../../components/ui/DatePickerField";
import {
  InventoryField,
  InventorySelect,
  InventoryTextarea,
} from "./InventoryFormParts";
import { TextField } from "./VehicleAcquisitionCardParts";
import {
  channelOptions,
  commissionOptions,
  formatCurrencyBRL,
  type AcquisitionDraft,
} from "./VehicleAcquisitionCardModel";

type Props = {
  acquisitionDraft: AcquisitionDraft;
  setAcquisitionDraft: Dispatch<SetStateAction<AcquisitionDraft>>;
};

export function VehicleAcquisitionSourcePanel({
  acquisitionDraft,
  setAcquisitionDraft,
}: Props) {
  const parseDate = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
    const parts = dateString.split("-");
    if (parts.length !== 3) return null;
    const yStr = parts[0];
    const mStr = parts[1];
    const dStr = parts[2];
    if (yStr === undefined || mStr === undefined || dStr === undefined)
      return null;
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1;
    const day = parseInt(dStr, 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDate = (date: Date | null): string | null => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

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
      <div className="grid gap-3 sm:grid-cols-2 items-end">
        <TextField
          label="Valor compra (R$)"
          onChange={(value) => {
            const formatted = formatCurrencyBRL(value);
            setAcquisitionDraft((current) => ({
              ...current,
              priceDraft: formatted,
            }));
          }}
          value={acquisitionDraft.priceDraft}
          placeholder="0,00"
        />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-black text-app-text">Data</span>
          <DatePickerField
            label="Data de aquisição"
            value={parseDate(acquisitionDraft.acquisitionDate)}
            onChange={(date) =>
              setAcquisitionDraft((current) => ({
                ...current,
                acquisitionDate: formatDate(date),
              }))
            }
          />
        </div>
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
    </div>
  );
}
