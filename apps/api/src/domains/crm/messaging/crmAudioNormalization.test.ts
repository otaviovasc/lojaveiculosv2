import { describe, expect, it } from "vitest";
import { CrmAudioNormalizationError } from "../ports/crmAudioNormalizer.js";
import { normalizeCrmAudio } from "./crmAudioNormalization.js";

describe("normalizeCrmAudio", () => {
  it("reports normalized output size failures as deterministic input errors", async () => {
    const result = normalizeCrmAudio({
      body: new Uint8Array([1]),
      fileName: "recording.webm",
      maxBytes: 1,
      normalizer: {
        normalizeToOggOpus: async () => {
          throw new CrmAudioNormalizationError("output_too_large");
        },
      },
      sourceMimeType: "audio/webm",
    });

    await expect(result).rejects.toMatchObject({
      code: "provider_rejected",
      status: 409,
    });
  });

  it("reports missing runtime as an unavailable server capability", async () => {
    const result = normalizeCrmAudio({
      body: new Uint8Array([1]),
      fileName: "recording.webm",
      maxBytes: 10,
      normalizer: {
        normalizeToOggOpus: async () => {
          throw new CrmAudioNormalizationError("runtime_unavailable");
        },
      },
      sourceMimeType: "audio/webm",
    });

    await expect(result).rejects.toMatchObject({
      code: "configuration_error",
      status: 502,
    });
  });
});
