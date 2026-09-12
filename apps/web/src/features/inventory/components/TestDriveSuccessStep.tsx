import { CheckCircle2, Clock, FileCheck, User } from "lucide-react";
import type { InventoryListingSummary } from "../model/types";
import {
  getInventoryVehicleSubtitle,
  getInventoryVehicleTitle,
} from "../model/listCatalogModel";
import { MercosulPlateBadge } from "./InventoryListingBadges";
import type { DriverData } from "./TestDriveWizardTypes";

export function TestDriveSuccessStep({
  driver,
  departureTime,
  preSelectedVehicle,
}: {
  driver?: DriverData;
  departureTime?: string;
  preSelectedVehicle?: InventoryListingSummary | undefined;
}) {
  return (
    <div className="py-4 space-y-6 text-app-text">
      <div className="text-center space-y-2">
        <div className="size-14 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/30">
          <CheckCircle2 className="size-8" />
        </div>
        <div>
          <h3 className="text-lg font-black text-app-text">
            Test Drive Registrado com Sucesso!
          </h3>
          <p className="text-xs text-muted max-w-sm mx-auto mt-0.5">
            O registro e o termo de responsabilidade foram gerados e
            sincronizados com o histórico do cliente.
          </p>
        </div>
      </div>

      {/* Summary ticket */}
      <div className="rounded-2xl border border-line/60 bg-panel p-4 space-y-3">
        {preSelectedVehicle && (
          <div className="flex items-center justify-between border-b border-line/40 pb-3">
            <div>
              <span className="text-xs font-semibold text-muted">Veículo</span>
              <p className="text-sm font-black text-app-text">
                {getInventoryVehicleTitle(preSelectedVehicle.listing)}
              </p>
              <p className="text-xs text-muted">
                {getInventoryVehicleSubtitle(
                  preSelectedVehicle.listing,
                  preSelectedVehicle.listing.catalog,
                )}
              </p>
            </div>
            {preSelectedVehicle.listing.plate ? (
              <MercosulPlateBadge plate={preSelectedVehicle.listing.plate} />
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          {driver?.name ? (
            <div>
              <span className="flex items-center gap-1 font-semibold text-muted">
                <User className="size-3 text-accent" />
                Condutor
              </span>
              <p className="mt-0.5 font-bold text-app-text">{driver.name}</p>
              {driver.cpf ? (
                <p className="text-muted">CPF: {driver.cpf}</p>
              ) : null}
            </div>
          ) : null}

          {departureTime ? (
            <div>
              <span className="flex items-center gap-1 font-semibold text-muted">
                <Clock className="size-3 text-accent" />
                Saída Registrada
              </span>
              <p className="mt-0.5 font-bold text-app-text">{departureTime}</p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-app-elevated/60 px-3 py-2 text-xs text-muted border border-line/40">
          <FileCheck className="size-4 text-emerald-500 shrink-0" />
          <span>Atividade e termo anexados à linha do tempo no CRM.</span>
        </div>
      </div>
    </div>
  );
}
