import { describe, expect, it } from "vitest";
import webBundlePolicy from "./web-bundle-policy.json" with { type: "json" };
import {
  findWebBundleArtifactViolations,
  summarizeMeasuredBundle,
} from "./web-bundle-artifact-rules.mjs";

describe("web bundle artifact rules", () => {
  it("accepts bounded chunks, the reviewed worker, and non-code static assets", () => {
    expect(findWebBundleArtifactViolations(validInput())).toEqual([]);
  });

  it("rejects oversized JavaScript, CSS, and reviewed worker output", () => {
    const input = validInput();
    input.files.find(({ path }) => path.endsWith("index.js")).sizeBytes =
      580_001;
    input.files.find(({ path }) => path.endsWith("index.css")).sizeBytes =
      645_001;
    input.files.find(({ path }) => path.includes("pdf.worker")).sizeBytes =
      1_080_001;

    expect(findWebBundleArtifactViolations(input)).toEqual(
      expect.arrayContaining([
        "assets/index.js: javascript artifact is 580001 bytes; budget is 580000 bytes",
        "assets/index.css: stylesheet artifact is 645001 bytes; budget is 645000 bytes",
        "assets/pdf.worker.min-12345678.mjs: worker:pdf-worker artifact is 1080001 bytes; budget is 1080000 bytes",
      ]),
    );
  });

  it("rejects unreviewed workers and unclassified static formats", () => {
    const input = validInput();
    input.files.push(
      {
        path: "assets/search.worker.deadbeef.js",
        sizeBytes: 100,
        type: "file",
      },
      { path: "assets/runtime.wasm", sizeBytes: 100, type: "file" },
    );

    expect(findWebBundleArtifactViolations(input)).toEqual(
      expect.arrayContaining([
        "assets/search.worker.deadbeef.js: executable worker has no reviewed exception",
        "assets/runtime.wasm: unclassified bundle artifact extension .wasm",
      ]),
    );
  });

  it("requires a manifest-backed entry, index, JavaScript, CSS, and regular files", () => {
    const input = validInput();
    input.manifest = {};
    input.files = [
      { path: "asset.png", sizeBytes: 2_000_000, type: "file" },
      { path: "linked.svg", sizeBytes: 0, type: "symbolic link" },
    ];

    expect(findWebBundleArtifactViolations(input)).toEqual(
      expect.arrayContaining([
        "bundle manifest must contain a production entry chunk",
        "bundle must contain index.html",
        "linked.svg: bundle output must not contain symbolic link",
        "bundle must contain ordinary JavaScript output",
        "bundle must contain stylesheet output",
      ]),
    );
  });

  it("does not let the reviewed worker satisfy ordinary JavaScript output", () => {
    const input = validInput();
    input.files = input.files.filter(({ path }) => path !== "assets/index.js");
    input.manifest["src/main.tsx"].file = "assets/pdf.worker.min-12345678.mjs";

    expect(findWebBundleArtifactViolations(input)).toContain(
      "bundle must contain ordinary JavaScript output",
    );
  });

  it("reports the largest measured artifact for every enforced class", () => {
    expect(
      summarizeMeasuredBundle(validInput().files, webBundlePolicy),
    ).toEqual({
      javascript: {
        kind: "javascript",
        path: "assets/index.js",
        sizeBytes: 579_999,
        type: "file",
      },
      stylesheet: {
        kind: "stylesheet",
        path: "assets/index.css",
        sizeBytes: 644_999,
        type: "file",
      },
      worker: {
        kind: "worker",
        path: "assets/pdf.worker.min-12345678.mjs",
        sizeBytes: 1_074_999,
        type: "file",
      },
    });
  });
});

function validInput() {
  return {
    files: [
      { path: ".vite/manifest.json", sizeBytes: 200, type: "file" },
      { path: "index.html", sizeBytes: 500, type: "file" },
      { path: "assets/index.js", sizeBytes: 579_999, type: "file" },
      { path: "assets/index.css", sizeBytes: 644_999, type: "file" },
      {
        path: "assets/pdf.worker.min-12345678.mjs",
        sizeBytes: 1_074_999,
        type: "file",
      },
      { path: "carousel/hero.png", sizeBytes: 2_000_000, type: "file" },
    ],
    manifest: {
      "src/main.tsx": { file: "assets/index.js", isEntry: true },
    },
    manifestError: null,
    policy: structuredClone(webBundlePolicy),
  };
}
