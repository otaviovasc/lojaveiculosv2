import { useEffect, useState } from "react";
import { useOptionalAccountSession } from "../account/accountSession";
import { readSessionEffectivePermissions } from "../account/sessionPermissions";
import {
  loadSellerOptions,
  type SaleSellerOption,
} from "../sales/saleContextOptions";
import {
  loadFinanceVehicleOptions,
  type FinanceVehicleOption,
} from "./financeVehicleOptions";

export type FinanceVehicleOptionsState =
  | { kind: "error" }
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready" };

export function useFinanceAccess(
  hasInjectedApi: boolean,
  loadSellers = true,
  loadVehicles = false,
) {
  const accountSession = useOptionalAccountSession();
  const permissions = readSessionEffectivePermissions(accountSession);
  const canCreate = hasInjectedApi || permissions.includes("finance.create");
  const canOpenReceipt = hasInjectedApi || permissions.includes("finance.read");
  const canUpdate = hasInjectedApi || permissions.includes("finance.update");
  const canAttach =
    canUpdate &&
    (hasInjectedApi || permissions.includes("finance.attach_document"));
  const canGenerateReceipt =
    hasInjectedApi ||
    (permissions.includes("finance.read") &&
      permissions.includes("finance.attach_document"));
  const [sellerOptions, setSellerOptions] = useState<SaleSellerOption[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<FinanceVehicleOption[]>(
    [],
  );
  const [vehicleOptionsState, setVehicleOptionsState] =
    useState<FinanceVehicleOptionsState>({ kind: "idle" });

  useEffect(() => {
    if (!loadSellers || (!canCreate && !canUpdate)) return;
    void loadSellerOptions()
      .then((options) => setSellerOptions([...options]))
      .catch(() => setSellerOptions([]));
  }, [canCreate, canUpdate, loadSellers]);

  useEffect(() => {
    if (!loadVehicles) {
      setVehicleOptionsState({ kind: "idle" });
      return;
    }
    let active = true;
    setVehicleOptionsState({ kind: "loading" });
    void loadFinanceVehicleOptions()
      .then((options) => {
        if (!active) return;
        setVehicleOptions(options);
        setVehicleOptionsState({ kind: "ready" });
      })
      .catch(() => {
        if (!active) return;
        setVehicleOptions([]);
        setVehicleOptionsState({ kind: "error" });
      });
    return () => {
      active = false;
    };
  }, [loadVehicles]);

  return {
    canAttach,
    canCreate,
    canGenerateReceipt,
    canOpenReceipt,
    canUpdate,
    sellerOptions,
    vehicleOptions,
    vehicleOptionsState,
  };
}
