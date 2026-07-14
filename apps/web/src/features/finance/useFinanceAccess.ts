import { useEffect, useState } from "react";
import { useOptionalAccountSession } from "../account/accountSession";
import { readSessionEffectivePermissions } from "../account/sessionPermissions";
import {
  loadSellerOptions,
  type SaleSellerOption,
} from "../sales/saleContextOptions";

export function useFinanceAccess(hasInjectedApi: boolean, loadSellers = true) {
  const accountSession = useOptionalAccountSession();
  const permissions = readSessionEffectivePermissions(accountSession);
  const canCreate = hasInjectedApi || permissions.includes("finance.create");
  const canUpdate = hasInjectedApi || permissions.includes("finance.update");
  const canAttach =
    canUpdate &&
    (hasInjectedApi || permissions.includes("finance.attach_document"));
  const [sellerOptions, setSellerOptions] = useState<SaleSellerOption[]>([]);

  useEffect(() => {
    if (!loadSellers || (!canCreate && !canUpdate)) return;
    void loadSellerOptions()
      .then((options) => setSellerOptions([...options]))
      .catch(() => setSellerOptions([]));
  }, [canCreate, canUpdate, loadSellers]);

  return { canAttach, canCreate, canUpdate, sellerOptions };
}
