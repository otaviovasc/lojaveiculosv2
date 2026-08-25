import { useLocation } from "react-router-dom";
import { useAccountSession } from "../account/accountSession";
import { readSessionActiveStore } from "../account/sessionPermissions";

export function CrmDeepLinkHandoffTestProbe() {
  const location = useLocation();
  const session = useAccountSession();
  return (
    <>
      <div>CRM carregado</div>
      <output data-testid="active-store">
        {readSessionActiveStore(session)?.storeSlug}
      </output>
      <output data-testid="route-location">
        {location.pathname}
        {location.search}
        {location.hash}
      </output>
    </>
  );
}
