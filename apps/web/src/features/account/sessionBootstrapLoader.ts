import type { SessionBootstrap } from "./apiClient";
import { createRuntimeAccountApi } from "./runtimeApi";

export const SESSION_BOOTSTRAP_TIMEOUT_MS = 12_000;

export class SessionBootstrapTimeoutError extends Error {
  constructor() {
    super(
      "A preparação da conta demorou além do esperado. Verifique sua conexão e tente novamente.",
    );
    this.name = "SessionBootstrapTimeoutError";
  }
}

export async function loadRuntimeSessionBootstrap(
  getToken: () => Promise<string | null>,
  timeoutMs = SESSION_BOOTSTRAP_TIMEOUT_MS,
): Promise<SessionBootstrap> {
  const abortController = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      abortController.abort();
      reject(new SessionBootstrapTimeoutError());
    }, timeoutMs);
  });
  const operation = (async () => {
    const accessToken = await getToken();
    const api = await createRuntimeAccountApi({ accessToken });
    return api.bootstrap({ signal: abortController.signal });
  })();

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
