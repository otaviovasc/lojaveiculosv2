import ImageTemplateModal from "./ImageTemplateModal";
import TestDriveWizard from "./TestDriveWizard";
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
  isTemplateOpen,
  isTestDriveOpen,
  onClose,
  storeSettings,
}: {
  activeSummaryItem: InventoryActionItem | null;
  isTemplateOpen: boolean;
  isTestDriveOpen: boolean;
  onClose: () => void;
  storeSettings: ImageTemplateStoreSettings;
}) {
  if (!activeSummaryItem) return null;

  return (
    <>
      <ImageTemplateModal
        isOpen={isTemplateOpen}
        onClose={onClose}
        listing={activeSummaryItem.listing}
        media={activeSummaryItem.media ? [...activeSummaryItem.media] : []}
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
