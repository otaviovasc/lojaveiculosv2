import { CRM_BRIDGE_TOKEN_REFRESH, CRM_REQUEST_BRIDGE_REFRESH } from "./types";
import type { CrmBootstrapState } from "./types";

type BridgeMessage = {
  bridgeToken?: unknown;
  type?: unknown;
};

export function getCrmBootstrapState(location: Location): CrmBootstrapState {
  const params = new URLSearchParams(location.search);
  const bridgeToken = params.get("bridge");
  const isEmbedded = params.get("embedded") === "1";

  return {
    agent: null,
    bridgeError: null,
    bridgeToken,
    isBridgeLoading: isEmbedded && !bridgeToken,
    isReady: !isEmbedded || Boolean(bridgeToken),
    mode: isEmbedded ? "embedded" : "standalone",
  };
}

export function requestBridgeRefresh(target: Pick<Window, "postMessage">) {
  target.postMessage({ type: CRM_REQUEST_BRIDGE_REFRESH }, "*");
}

export function readBridgeTokenRefresh(data: unknown): string | null {
  const message = data as BridgeMessage;

  if (message?.type !== CRM_BRIDGE_TOKEN_REFRESH) {
    return null;
  }

  return typeof message.bridgeToken === "string" &&
    message.bridgeToken.length > 0
    ? message.bridgeToken
    : null;
}
