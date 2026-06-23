import { PrintWrapper, TermoTestDrivePrint } from "./InventoryPrintTemplates";
import {
  storeDataFromSettings,
  type InventoryStoreSettings,
} from "./InventoryPrintTypes";
import type { InventoryListingSummary } from "../model/types";
import type { DriverData } from "./TestDriveWizardTypes";

export function TestDrivePrintPreview({
  currentDate,
  departureTime,
  driver,
  onClose,
  preSelectedVehicle,
  returnTime,
  storeSettings,
}: {
  currentDate: string;
  departureTime: string;
  driver: DriverData;
  onClose: () => void;
  preSelectedVehicle?: InventoryListingSummary | undefined;
  returnTime: string;
  storeSettings: InventoryStoreSettings;
}) {
  return (
    <PrintWrapper title="Termo de Test Drive" onClose={onClose}>
      <TermoTestDrivePrint
        driver={driver}
        date={currentDate}
        departureTime={departureTime}
        returnTime={returnTime || undefined}
        vehicle={{
          title: preSelectedVehicle?.listing?.title || "Veículo",
          brand: preSelectedVehicle?.listing?.catalog?.brandName || "",
          model: preSelectedVehicle?.listing?.catalog?.modelName || "",
          version: preSelectedVehicle?.listing?.trimName || "",
          yearModel: preSelectedVehicle?.listing?.modelYear || "",
          yearFabrication: preSelectedVehicle?.listing?.manufactureYear || "",
          plate:
            preSelectedVehicle?.listing?.plate ||
            preSelectedVehicle?.primaryUnit?.plate ||
            "",
          km: preSelectedVehicle?.primaryUnit?.stockNumber || "0",
        }}
        store={storeDataFromSettings(storeSettings)}
      />
    </PrintWrapper>
  );
}
