import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import { sendUazapiMedia } from "./uazapiCrmWhatsappMediaActions.js";
import type { UazapiCredentials } from "./uazapiCrmWhatsappGatewaySupport.js";

const credentials: UazapiCredentials = {
  apiBaseUrl: "https://free.uazapi.com",
  instanceId: "instance-1",
  instanceToken: "instance-token-1",
};

describe("sendUazapiMedia", () => {
  it("sends images by URL without transcoding", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ messageId: "whatsapp-media-1" }),
    );

    const result = await sendUazapiMedia(credentials, fetch, {
      caption: "Frente",
      mediaType: "image",
      mediaUrl: "https://cdn.example.test/vehicle.jpg",
      phone: "5511999999999",
    });

    expect(result.externalId).toBe("whatsapp-media-1");
    expect(fetch).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetch.mock.calls[0] ?? [];
    expect(requestUrl).toBe("https://free.uazapi.com/send/media");
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      number: "5511999999999",
      type: "image",
      file: "https://cdn.example.test/vehicle.jpg",
      text: "Frente",
    });
  });

  it("transcodes voice notes to MP3 and sends them as base64 audio with async false", async () => {
    const oggBytes = Buffer.from("ogg-bytes");
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (request) =>
        String(request) === "https://cdn.example.test/voice.ogg"
          ? new Response(oggBytes, {
              status: 200,
              headers: { "content-type": "audio/ogg" },
            })
          : Response.json({ messageid: "whatsapp-audio-1" }),
      );
    const transcodeAudioToMp3 = vi.fn(
      async () => new Uint8Array(Buffer.from("mp3-bytes")),
    );

    const result = await sendUazapiMedia(
      credentials,
      fetch,
      {
        mediaType: "audio",
        mediaUrl: "https://cdn.example.test/voice.ogg",
        mimeType: "audio/ogg; codecs=opus",
        phone: "5511999999999",
      },
      { transcodeAudioToMp3 },
    );

    expect(result.externalId).toBe("whatsapp-audio-1");
    expect(transcodeAudioToMp3).toHaveBeenCalledWith({
      body: new Uint8Array(oggBytes),
      sourceMimeType: "audio/ogg",
    });
    const body = JSON.parse(String(fetch.mock.calls[1]?.[1]?.body)) as Record<
      string,
      unknown
    >;
    expect(body.type).toBe("audio");
    expect(body.async).toBe(false);
    expect(body.mimetype).toBe("audio/mpeg");
    expect(body.file).toBe(
      `data:audio/mpeg;base64,${Buffer.from("mp3-bytes").toString("base64")}`,
    );
  });

  it("skips the transcode download for non-https audio URLs", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ messageid: "whatsapp-audio-2" }),
    );
    const transcodeAudioToMp3 = vi.fn();

    await sendUazapiMedia(
      credentials,
      fetch,
      {
        mediaType: "audio",
        mediaUrl: "http://internal.test/voice.ogg",
        mimeType: "audio/ogg; codecs=opus",
        phone: "5511999999999",
      },
      { transcodeAudioToMp3 },
    );

    expect(transcodeAudioToMp3).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as Record<
      string,
      unknown
    >;
    expect(body.file).toBe("http://internal.test/voice.ogg");
  });

  it("throws when the provider answers HTTP 200 with an error body", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ error: true, message: "instance is disconnected" }),
    );

    await expect(
      sendUazapiMedia(credentials, fetch, {
        mediaType: "image",
        mediaUrl: "https://cdn.example.test/vehicle.jpg",
        phone: "5511999999999",
      }),
    ).rejects.toMatchObject({ code: "provider_rejected", status: 502 });
  });
});
