import { expect, test } from "@playwright/test";
import {
  capture,
  closeServer,
  installConnectedWhatsappConnectionStub,
  installLocalOwnerSession,
  startMediaServer,
  waitForApiReady,
} from "./crm-whatsapp-test-helpers";

const connectionId = "24000000-0000-4000-8000-000000000101";

test.describe("CRM WhatsApp media", () => {
  test("previews and sends image media from the composer", async ({
    page,
    request,
  }, testInfo) => {
    const messageId = `pw-compose-${Date.now()}`;
    const contactName = `Composer E2E ${messageId}`;
    const caption = `Foto via composer ${messageId}`;
    const phone = `5511${String(Date.now()).slice(-9)}`;
    await waitForApiReady(request);
    const response = await request.post(
      `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/received`,
      {
        data: {
          messageId,
          phone,
          senderName: contactName,
          text: { message: "Pode enviar a foto?" },
          timestamp: Math.floor(Date.now() / 1000),
        },
      },
    );
    expect(response.status()).toBe(201);

    await page.route("**/api/v1/crm/whatsapp/send/media", async (route) => {
      const body = route.request().postDataJSON() as {
        base64?: string;
        caption?: string;
        fileName?: string;
        mediaType?: string;
        mimeType?: string;
        sessionId?: string;
      };
      expect(body).toMatchObject({
        caption,
        fileName: "civic-e2e.svg",
        mediaType: "image",
        mimeType: "image/svg+xml",
      });
      expect(body.base64).toBeTruthy();
      await route.fulfill({
        body: JSON.stringify({
          content: caption,
          createdAt: new Date().toISOString(),
          direction: "OUTBOUND",
          id: `message-${messageId}`,
          mediaType: "image",
          mediaUrl:
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480'%3E%3Crect width='640' height='480' fill='%23155eef'/%3E%3Ctext x='48' y='260' font-family='Arial' font-size='56' font-weight='700' fill='white'%3EV2 Send%3C/text%3E%3C/svg%3E",
          metadata: { media: { caption } },
          providerTimestamp: new Date().toISOString(),
          senderType: "HUMAN",
          status: "SENT",
          type: "IMAGE",
        }),
        headers: { "content-type": "application/json" },
        status: 201,
      });
    });

    await installConnectedWhatsappConnectionStub(page, connectionId);
    await installLocalOwnerSession(page);
    await page.goto("/crm#/crm?surface=whatsapp");
    await page
      .getByPlaceholder("Buscar por contato, telefone ou mensagem")
      .fill(contactName);
    await page
      .getByLabel("Conversas do WhatsApp")
      .getByText(contactName)
      .click();

    await page.locator('input[accept="image/*,video/*"]').setInputFiles({
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#1f8b4c"/><text x="48" y="260" font-family="Arial" font-size="56" font-weight="700" fill="white">Preview</text></svg>',
      ),
      mimeType: "image/svg+xml",
      name: "civic-e2e.svg",
    });
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByAltText("civic-e2e.svg")).toBeVisible();
    await capture(page, testInfo, "crm-whatsapp-compose-media-preview");
    await page.setViewportSize({ height: 844, width: 390 });
    await expect(page.getByRole("dialog")).toBeVisible();
    await capture(page, testInfo, "crm-whatsapp-compose-media-preview-mobile");
    await page.getByPlaceholder("Adicionar legenda...").fill(caption);
    await page.getByRole("button", { name: "Enviar mensagem" }).click();

    await expect(page.getByAltText(caption)).toBeVisible();
    await capture(page, testInfo, "crm-whatsapp-compose-media");
  });

  test("previews and sends video media from the composer", async ({
    page,
    request,
  }, testInfo) => {
    const messageId = `pw-compose-video-${Date.now()}`;
    const contactName = `Video Composer E2E ${messageId}`;
    const caption = `Video via composer ${messageId}`;
    const phone = `5511${String(Date.now()).slice(-9)}`;
    await waitForApiReady(request);
    const response = await request.post(
      `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/received`,
      {
        data: {
          messageId,
          phone,
          senderName: contactName,
          text: { message: "Pode enviar o video?" },
          timestamp: Math.floor(Date.now() / 1000),
        },
      },
    );
    expect(response.status()).toBe(201);

    await page.route("**/api/v1/crm/whatsapp/send/media", async (route) => {
      const body = route.request().postDataJSON() as {
        base64?: string;
        caption?: string;
        fileName?: string;
        mediaType?: string;
        mimeType?: string;
      };
      expect(body).toMatchObject({
        caption,
        fileName: "civic-e2e.mp4",
        mediaType: "video",
        mimeType: "video/mp4",
      });
      expect(body.base64).toBeTruthy();
      await route.fulfill({
        body: JSON.stringify({
          content: caption,
          createdAt: new Date().toISOString(),
          direction: "OUTBOUND",
          id: `message-${messageId}`,
          mediaType: "video",
          mediaUrl: "data:video/mp4;base64,AAAA",
          metadata: {
            media: {
              asyncProcessing: true,
              caption,
              videoProcessingStage: "SUBMITTED",
            },
          },
          providerTimestamp: new Date().toISOString(),
          senderType: "HUMAN",
          status: "SENT",
          type: "VIDEO",
        }),
        headers: { "content-type": "application/json" },
        status: 201,
      });
    });

    await installConnectedWhatsappConnectionStub(page, connectionId);
    await installLocalOwnerSession(page);
    await page.goto("/crm#/crm?surface=whatsapp");
    await page
      .getByPlaceholder("Buscar por contato, telefone ou mensagem")
      .fill(contactName);
    await page
      .getByLabel("Conversas do WhatsApp")
      .getByText(contactName)
      .click();

    await page.locator('input[accept="image/*,video/*"]').setInputFiles({
      buffer: Buffer.from("video-e2e"),
      mimeType: "video/mp4",
      name: "civic-e2e.mp4",
    });
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Preview civic-e2e.mp4")).toBeVisible();
    await capture(page, testInfo, "crm-whatsapp-compose-video-preview");
    await page.getByPlaceholder("Adicionar legenda...").fill(caption);
    await page.getByRole("button", { name: "Enviar mensagem" }).click();

    await expect(page.getByText(caption).last()).toBeVisible();
  });

  test("renders inbound image media from the webhook pipeline", async ({
    page,
    request,
  }, testInfo) => {
    const mediaServer = await startMediaServer();
    try {
      const messageId = `pw-media-${Date.now()}`;
      const caption = `Imagem e2e ${messageId}`;
      const contactName = `Media E2E ${messageId}`;
      const phone = `5511${String(Date.now()).slice(-9)}`;
      await waitForApiReady(request);
      const response = await request.post(
        `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/received`,
        {
          data: {
            image: {
              caption,
              imageUrl: mediaServer.url,
              mimeType: "image/svg+xml",
            },
            messageId,
            phone,
            senderName: contactName,
            timestamp: Math.floor(Date.now() / 1000),
          },
        },
      );
      expect(response.status()).toBe(201);

      await installConnectedWhatsappConnectionStub(page, connectionId);
      await installLocalOwnerSession(page);
      await page.goto("/crm#/crm?surface=whatsapp");
      await page
        .getByPlaceholder("Buscar por contato, telefone ou mensagem")
        .fill(contactName);
      await page
        .getByLabel("Conversas do WhatsApp")
        .getByText(contactName)
        .click();

      await expect(page.getByAltText(caption)).toBeVisible();
      await expect(page.getByText(caption).last()).toBeVisible();
      await capture(page, testInfo, "crm-whatsapp-media");
    } finally {
      await closeServer(mediaServer.server);
    }
  });
});
