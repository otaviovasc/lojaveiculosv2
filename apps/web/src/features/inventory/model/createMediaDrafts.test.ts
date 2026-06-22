import { describe, expect, it } from "vitest";
import {
  buildCreateMediaDrafts,
  moveCreateMediaDraft,
  removeCreateMediaDraft,
} from "./createMediaDrafts";

describe("create media drafts", () => {
  it("accepts ordered photos and one video", () => {
    const photo = file("front.jpg", "image/jpeg");
    const video = file("walkaround.mp4", "video/mp4");

    const result = buildCreateMediaDrafts({
      current: [],
      files: [photo, video],
      previewUrl: (input) => `preview://${input.name}`,
    });

    expect(result.rejected).toEqual([]);
    expect(result.accepted).toMatchObject([
      { altText: "front.jpg", displayOrder: 0, kind: "photo" },
      { altText: "walkaround.mp4", displayOrder: 1, kind: "video" },
    ]);
  });

  it("rejects media over backend upload limits and extra videos", () => {
    const first = buildCreateMediaDrafts({
      current: [],
      files: [file("walkaround.mp4", "video/mp4")],
    }).accepted;
    const oversized = file("large.jpg", "image/jpeg", 26 * 1024 * 1024);

    const result = buildCreateMediaDrafts({
      current: first,
      files: [file("second.mp4", "video/mp4"), oversized],
    });

    expect(result.accepted).toHaveLength(1);
    expect(result.rejected.map((item) => item.reason)).toEqual([
      "Apenas um video por anuncio.",
      "Arquivo acima de 25 MB.",
    ]);
  });

  it("keeps order stable when moving and removing drafts", () => {
    const drafts = buildCreateMediaDrafts({
      current: [],
      files: [
        file("1.jpg", "image/jpeg"),
        file("2.jpg", "image/jpeg"),
        file("3.jpg", "image/jpeg"),
      ],
    }).accepted;

    const moved = moveCreateMediaDraft(drafts, 2, -1);
    const removed = removeCreateMediaDraft(moved, moved[1]!.id);

    expect(moved.map((item) => item.file.name)).toEqual([
      "1.jpg",
      "3.jpg",
      "2.jpg",
    ]);
    expect(removed.map((item) => item.displayOrder)).toEqual([0, 1]);
  });
});

function file(name: string, type: string, size = 1024) {
  return new File([new Uint8Array(size)], name, {
    lastModified: 1,
    type,
  });
}
