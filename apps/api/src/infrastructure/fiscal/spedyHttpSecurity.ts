import { SpedyGatewayConfigurationError } from "./spedyErrors.js";

export function trustedSpedyUrl(baseUrl: string, path: string) {
  let trustedOrigin: URL;
  let target: URL;
  try {
    trustedOrigin = new URL(baseUrl);
    target = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  } catch {
    throw new SpedyGatewayConfigurationError(["SPEDY_API_URL"]);
  }
  if (
    trustedOrigin.protocol !== "https:" ||
    trustedOrigin.username ||
    trustedOrigin.password ||
    target.protocol !== "https:" ||
    target.origin !== trustedOrigin.origin ||
    target.username ||
    target.password
  ) {
    throw new SpedyGatewayConfigurationError(["SPEDY_API_URL=https"]);
  }
  return target.href;
}
