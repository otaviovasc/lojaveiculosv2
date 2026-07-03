import { createServer, type Server } from "node:http";
import {
  expect,
  type APIRequestContext,
  type Page,
  type TestInfo,
} from "@playwright/test";

export async function installLocalOwnerSession(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "lojaveiculosv2:local-auth-user-id",
      "clerk_seed_owner",
    );
  });
}

export async function waitForApiReady(request: APIRequestContext) {
  await expect
    .poll(
      async () => {
        try {
          return (await request.get("http://127.0.0.1:8787/health")).status();
        } catch {
          return 0;
        }
      },
      { timeout: 30_000 },
    )
    .toBe(200);
}

export async function seedWhatsappSession(
  request: APIRequestContext,
  input: {
    connectionId: string;
    contactName: string;
    message: string;
    messageId: string;
    phone: string;
  },
) {
  await waitForApiReady(request);
  const response = await request.post(
    `/api/v1/crm/whatsapp/webhooks/zapi/${input.connectionId}/received`,
    {
      data: {
        messageId: input.messageId,
        phone: input.phone,
        senderName: input.contactName,
        text: { message: input.message },
        timestamp: Math.floor(Date.now() / 1000),
      },
    },
  );
  expect(response.status()).toBe(201);
  const body: unknown = await response.json();
  const sessionId = readSeedSessionId(body);
  expect(sessionId).toBeTruthy();
  return { sessionId };
}

export async function installConnectedWhatsappConnectionStub(
  page: Page,
  connectionId: string,
) {
  await page.route("**/crm/whatsapp/connections", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        connections: [
          {
            displayName: "ZAPI E2E",
            externalConnectionId: null,
            externalInstanceId: null,
            id: connectionId,
            live: {
              checkedAt: new Date().toISOString(),
              connected: true,
              connectedPhone: "5511940231407",
              providerStatus: "connected",
              smartphoneConnected: true,
            },
            phone: "5511940231407",
            provider: "zapi",
            status: "active",
            webhookUrl: null,
          },
        ],
      }),
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
}

export async function startMediaServer(): Promise<{
  server: Server;
  url: string;
}> {
  const body = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#ef1b2d"/><text x="48" y="260" font-family="Arial" font-size="56" font-weight="700" fill="#fff">CRM Media</text></svg>',
  );
  const server = createServer((_request, response) => {
    response.writeHead(200, {
      "content-length": String(body.length),
      "content-type": "image/svg+xml",
    });
    response.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Media server did not bind to a TCP port.");
  }
  return {
    server,
    url: `http://127.0.0.1:${address.port}/zapi-media.svg`,
  };
}

export async function closeServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath(`${name}.png`),
  });
}

function readSeedSessionId(body: unknown) {
  if (!body || typeof body !== "object" || !("session" in body)) return "";
  const session = body.session;
  if (!session || typeof session !== "object" || !("id" in session)) return "";
  const id = session.id;
  return typeof id === "string" || typeof id === "number" ? String(id) : "";
}
