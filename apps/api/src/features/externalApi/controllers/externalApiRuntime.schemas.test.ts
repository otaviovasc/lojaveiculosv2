import { describe, expect, it } from "vitest";
import { externalLeadMetadataSchema } from "./externalApiRuntime.schemas.js";

describe("external API lead metadata contract", () => {
  it("accepts only bounded public message and title strings", () => {
    expect(
      externalLeadMetadataSchema.parse({
        message: "Quero saber mais sobre o veículo",
        title: "Formulário do site",
      }),
    ).toEqual({
      message: "Quero saber mais sobre o veículo",
      title: "Formulário do site",
    });
  });

  it.each([
    [{ assignedUserId: "user_1" }, "unknown internal key"],
    [{ message: { nested: "not allowed" } }, "nested value"],
    [{ message: "x".repeat(2001) }, "message longer than 2000 characters"],
    [
      { message: "😀".repeat(1000), title: "😀".repeat(40) },
      "object larger than 4096 UTF-8 bytes",
    ],
  ])("rejects %s (%s)", (metadata, _reason) => {
    expect(externalLeadMetadataSchema.safeParse(metadata).success).toBe(false);
  });
});
