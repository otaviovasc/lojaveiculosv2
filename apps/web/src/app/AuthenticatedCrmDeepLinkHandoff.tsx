import { useEffect, useMemo, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppBootScreen } from "../components/ui";
import { useAccountSession } from "../features/account/accountSession";
import { selectStoreWorkspace } from "../features/account/storeWorkspace";
import { resolveCrmDeepLinkHandoff } from "../features/crm/crmDeepLinkHandoff";

export function AuthenticatedCrmDeepLinkHandoff({
  children,
}: {
  children: ReactNode;
}) {
  const session = useAccountSession();
  const location = useLocation();
  const navigate = useNavigate();
  const handoff = useMemo(
    () => resolveCrmDeepLinkHandoff(session, location),
    [location.pathname, location.search, session],
  );

  useEffect(() => {
    if (handoff.kind === "none") return;
    if (handoff.kind === "open" && handoff.switchStore) {
      selectStoreWorkspace(session, handoff.storeSlug);
    }
    void navigate(handoff.destination, { replace: true });
  }, [handoff, navigate, session]);

  if (handoff.kind !== "none") {
    return (
      <AppBootScreen
        description="Validando a loja antes de carregar o atendimento."
        title="Abrindo conversa"
      />
    );
  }

  return children;
}
