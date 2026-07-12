import { describe, expect, it, vi } from "vitest";
import { fetchZipPhoto } from "./zipPhotos";

describe("inventory photo ZIP", () => {
  it("preserves deterministic order and the factual image extension", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(new Blob(["jpeg-bytes"], { type: "image/jpeg" }), {
          headers: { "content-type": "image/jpeg" },
          status: 200,
        }),
    );

    const photo = await fetchZipPhoto(
      "https://assets.example/photo",
      1,
      12,
      fetcher,
    );

    expect(photo.fileName).toBe("foto_02.jpg");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("rejects failed or non-image responses instead of archiving error bodies", async () => {
    await expect(
      fetchZipPhoto(
        "https://assets.example/missing",
        0,
        1,
        vi.fn(async () => new Response("missing", { status: 404 })),
      ),
    ).rejects.toThrow("HTTP 404");

    await expect(
      fetchZipPhoto(
        "https://assets.example/error",
        0,
        1,
        vi.fn(
          async () =>
            new Response("upstream error", {
              headers: { "content-type": "text/plain" },
              status: 200,
            }),
        ),
      ),
    ).rejects.toThrow("não retornou um arquivo de imagem");
  });
});
