import { describe, expect, it } from "vitest";
import {
  createSeedMediaPlaceholder,
  isCurrentSeedMediaPlaceholder,
  SEED_MEDIA_PLACEHOLDER_VERSION,
  seedMediaPlaceholderMetadata,
} from "./seed-product-media-placeholder.mjs";

const input = {
  altText: "Audi A4 <preto> & dianteira",
  listingTitle: 'Audi A4 "Prestige"',
  mediaId: "12000000-0000-4000-8000-000000000001",
  targetKey: "tenants/test/units/audi/photo/original.jpg",
};

describe("seed product media placeholder", () => {
  it("creates a deterministic generated WebP at a WebP storage key", () => {
    const first = createSeedMediaPlaceholder(input);
    const second = createSeedMediaPlaceholder(input);

    expect(first).toEqual(second);
    expect(first.altText).toBe('Audi A4 "Prestige": foto em preparação');
    expect(first.contentType).toBe("image/webp");
    expect(first.storageKey).toMatch(/seed-photo-pending-[a-f0-9]+\.webp$/);
    expect(first.body.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(first.body.subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect(first.height).toBe(900);
    expect(first.width).toBe(1600);
    expect(first.sizeBytes).toBe(first.body.byteLength);
  });

  it("recognizes only the current exact placeholder artifact", () => {
    const placeholder = createSeedMediaPlaceholder(input);
    const metadata = lowerCaseKeys(seedMediaPlaceholderMetadata(placeholder));
    const object = {
      contentLength: placeholder.sizeBytes,
      contentType: "image/webp",
      exists: true,
      metadata,
    };

    expect(isCurrentSeedMediaPlaceholder(object, placeholder)).toBe(true);
    expect(
      isCurrentSeedMediaPlaceholder(
        {
          ...object,
          metadata: { ...metadata, artifactversion: "stale" },
        },
        placeholder,
      ),
    ).toBe(false);
    expect(metadata.artifactversion).toBe(SEED_MEDIA_PLACEHOLDER_VERSION);
  });
});

function lowerCaseKeys(value) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key.toLowerCase(), item]),
  );
}
