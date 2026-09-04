import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { CrmAudioNormalizationError } from "../../domains/crm/ports/crmAudioNormalizer.js";
import { createFfmpegCrmAudioNormalizer } from "./ffmpegCrmAudioNormalizer.js";

const webmOpusFixture = Buffer.from(
  [
    "GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAA",
    "AALIEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHYTbuMU6uEElTD",
    "Z1OsggFCTbuMU6uEHFO7a1OsggKy7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAA",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "AAAAAAAAAAAAAAAVSalmsirXsYMPQkBNgI1MYXZmNjIuMTIuMTAxV0GNTGF2",
    "ZjYyLjEyLjEwMUSJiEBWAAAAAAAAFlSua+WuAQAAAAAAAFzXgQFzxYh7l154",
    "vVr1vZyBACK1nIN1bmSIgQCGhkFfT1BVU1aqg2MuoFa7hATEtACDgQLhkZ+B",
    "AbWIQOdwAAAAAABiZIEQY6KTT3B1c0hlYWQBATgBgLsAAAAAABJUw2f9c3Og",
    "Y8CAZ8iaRaOHRU5DT0RFUkSHjUxhdmY2Mi4xMi4xMDFzc9djwItjxYh7l154",
    "vVr1vWfIokWjh0VOQ09ERVJEh5VMYXZjNjIuMjguMTAxIGxpYm9wdXNnyKFF",
    "o4hEVVJBVElPTkSHkzAwOjAwOjAwLjA4ODAwMDAwMAAfQ7Z1QOjngQCjtoEA",
    "AIBIgi63bFa39AAB5c2eAUZQhZe3PJPJF1nDEZpB3wCe8tc6tiOL39/sAENd",
    "LXCWmn9WZKOpgQAVgEikiFesmIUDXCYJkzEn8TpJ7DfMoL3D6RuTODkapcik/",
    "ul1a+CjqoEAKYBInBtSUUUArOLUtKuYXknlTsuNZ9MnMLA3cBNHAYsqnBxDt",
    "kQP9qOvgQA9gEicG1JWzh/qEMq5HFSZULl2TLkafA+yILKwZQ/YQg4pqGgc1",
    "C7UeUCMkKqgo6GXgQBRAEgGauaEBfErHS05rLs0EhsOyyCbgQd1ooQAzf5gH",
    "FO7a5G7j7OBALeK94EB8YIBxPCBAw==",
  ].join(""),
  "base64",
);

describe("FFmpeg CRM audio normalizer", () => {
  it("converts browser WebM/Opus into WhatsApp OGG/Opus", async () => {
    const output = await createFfmpegCrmAudioNormalizer().normalizeToOggOpus({
      body: new Uint8Array(webmOpusFixture),
      sourceMimeType: "audio/webm;codecs=opus",
    });

    expect(Buffer.from(output).subarray(0, 4).toString("ascii")).toBe("OggS");
    expect(Buffer.from(output).includes(Buffer.from("OpusHead"))).toBe(true);
  });

  it("rejects bytes that are not decodable audio", async () => {
    const error = await createFfmpegCrmAudioNormalizer()
      .normalizeToOggOpus({
        body: new Uint8Array(Buffer.from("not-audio")),
        sourceMimeType: "audio/webm",
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CrmAudioNormalizationError);
    expect(error).toMatchObject({ reason: "invalid_media" });
  });

  it("fails explicitly when the converter runtime is unavailable", async () => {
    const error = await createFfmpegCrmAudioNormalizer({
      ffmpegPath: "missing-ffmpeg-for-test",
    })
      .normalizeToOggOpus({
        body: new Uint8Array(webmOpusFixture),
        sourceMimeType: "audio/webm",
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CrmAudioNormalizationError);
    expect(error).toMatchObject({ reason: "runtime_unavailable" });
  });
});
