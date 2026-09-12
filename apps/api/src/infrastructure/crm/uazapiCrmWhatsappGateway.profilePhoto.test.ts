import { describe, expect, it, vi } from "vitest";
import { createUazapiCrmWhatsappGateway } from "./uazapiCrmWhatsappGateway.js";
import {
  createUazapiGatewayTestConnection,
  uazapiGatewayTestEnv,
} from "./uazapiCrmWhatsappGateway.testSupport.js";

describe("UAZAPI WhatsApp gateway profile photo", () => {
  it("resolves a contact profile photo through /chat/details", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            image: "https://pps.whatsapp.net/v/t61.24694-24/12345_image.jpg",
            wa_chatid: "5511999999999@s.whatsapp.net",
            wa_name: "Ana",
          }),
          { status: 200 },
        ),
    );
    const gateway = createUazapiCrmWhatsappGateway(
      uazapiGatewayTestEnv,
      fetchImpl,
    );

    const photoUrl = await gateway.getProfilePhotoUrl?.(
      await createUazapiGatewayTestConnection(),
      { phone: "5511999999999" },
    );

    expect(photoUrl).toBe(
      "https://pps.whatsapp.net/v/t61.24694-24/12345_image.jpg",
    );
    const [requestUrl, requestInit] = fetchImpl.mock.calls[0] ?? [];
    expect(requestUrl).toBe("https://free.uazapi.com/chat/details");
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      number: "5511999999999",
      preview: false,
    });
    expect(new Headers(requestInit?.headers).get("token")).toBe(
      "instance-token",
    );
  });

  it("returns null when the contact has no profile photo", async () => {
    const gateway = createUazapiCrmWhatsappGateway(
      uazapiGatewayTestEnv,
      vi.fn<typeof fetch>(
        async () =>
          new Response(
            JSON.stringify({
              wa_chatid: "5511999999999@s.whatsapp.net",
              wa_name: "Ana",
            }),
            { status: 200 },
          ),
      ),
    );

    await expect(
      gateway.getProfilePhotoUrl?.(await createUazapiGatewayTestConnection(), {
        phone: "5511999999999",
      }),
    ).resolves.toBeNull();
  });

  it("surfaces the provider error detail when the lookup fails", async () => {
    const gateway = createUazapiCrmWhatsappGateway(
      uazapiGatewayTestEnv,
      vi.fn<typeof fetch>(
        async () =>
          new Response(JSON.stringify({ error: "Chat not found" }), {
            status: 404,
          }),
      ),
    );

    await expect(
      gateway.getProfilePhotoUrl?.(await createUazapiGatewayTestConnection(), {
        phone: "5511999999999",
      }),
    ).resolves.toBeNull();
  });
});
