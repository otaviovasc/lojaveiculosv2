import type { SessionBootstrap } from "../account/apiClient";
import { readSessionActiveStore } from "../account/sessionPermissions";
import { readAccessibleStoreWorkspace } from "../account/storeWorkspace";
import { crmConversationCycleHash, crmScopeHash } from "./crmRouteState";

const crmPath = "/crm";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CrmDeepLinkLocation = {
  pathname: string;
  search: string;
};

export type CrmDeepLinkHandoff =
  | {
      kind: "fallback";
      destination: string;
      reason: "malformed" | "unauthorized";
    }
  | { kind: "none" }
  | {
      kind: "open";
      destination: string;
      storeSlug: string;
      switchStore: boolean;
    };

export function createAuthenticatedCrmConversationPath(input: {
  cycleId: string;
  storeSlug: string;
}) {
  const params = new URLSearchParams({
    storeSlug: input.storeSlug,
    cycleId: input.cycleId,
  });
  return `${crmPath}?${params.toString()}`;
}

export function resolveCrmDeepLinkHandoff(
  session: SessionBootstrap,
  location: CrmDeepLinkLocation,
): CrmDeepLinkHandoff {
  if (location.pathname.replace(/\/+$/, "") !== crmPath) {
    return { kind: "none" };
  }

  const params = new URLSearchParams(location.search);
  const storeSlugs = params.getAll("storeSlug");
  const cycleIds = params.getAll("cycleId");
  if (storeSlugs.length === 0 && cycleIds.length === 0) {
    return { kind: "none" };
  }

  const storeSlug = storeSlugs[0] ?? "";
  const cycleId = cycleIds[0] ?? "";
  if (
    storeSlugs.length !== 1 ||
    cycleIds.length !== 1 ||
    storeSlug.length === 0 ||
    storeSlug !== storeSlug.trim() ||
    !uuidPattern.test(cycleId)
  ) {
    return crmInboxFallback("malformed");
  }

  if (!readAccessibleStoreWorkspace(session, storeSlug)) {
    return crmInboxFallback("unauthorized");
  }

  return {
    destination: `${crmPath}#${crmConversationCycleHash(cycleId)}`,
    kind: "open",
    storeSlug,
    switchStore: readSessionActiveStore(session)?.storeSlug !== storeSlug,
  };
}

function crmInboxFallback(
  reason: Extract<CrmDeepLinkHandoff, { kind: "fallback" }>["reason"],
): CrmDeepLinkHandoff {
  return {
    destination: `${crmPath}#${crmScopeHash("conversations")}`,
    kind: "fallback",
    reason,
  };
}
