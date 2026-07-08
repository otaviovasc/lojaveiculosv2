import ImageTemplateModal from "./ImageTemplateModal";
import TestDriveWizard from "./TestDriveWizard";
import type { InventoryApi } from "../api/apiClient";
import type {
  InventoryListingDetail,
  InventoryListingSummary,
} from "../model/types";
import type { ImageTemplateStoreSettings } from "./ImageTemplateTypes";

export type InventoryActionItem = InventoryListingSummary & {
  media?: InventoryListingDetail["media"];
};

export function InventoryListModals({
  activeSummaryItem,
  api,
  isTemplateOpen,
  isTestDriveOpen,
  onClose,
  storeSettings,
}: {
  activeSummaryItem: InventoryActionItem | null;
  api: InventoryApi | null;
  isTemplateOpen: boolean;
  isTestDriveOpen: boolean;
  onClose: () => void;
  storeSettings: ImageTemplateStoreSettings;
}) {
  if (!activeSummaryItem) return null;

  return (
    <>
      <ImageTemplateModal
        api={api}
        isOpen={isTemplateOpen}
        onClose={onClose}
        listing={activeSummaryItem.listing}
        media={activeSummaryItem.media ? [...activeSummaryItem.media] : []}
        primaryUnitId={activeSummaryItem.primaryUnit?.id ?? null}
        storeSettings={storeSettings}
      />
      <TestDriveWizard
        isOpen={isTestDriveOpen}
        onClose={onClose}
        preSelectedVehicle={activeSummaryItem}
        storeSettings={storeSettings}
      />
    </>
  );
}
