import { describe, expect, it } from "vitest";
import {
  cleanCreateSaleDraftInput,
  cleanUpdateSaleDraftInput,
} from "./sales.controller.cleaners.js";
import { saleDraftSchema } from "./sales.controller.schemas.js";

describe("sales controller cleaners", () => {
  it("keeps persisted payment ids only on draft updates", () => {
    const id = crypto.randomUUID();
    const parsed = saleDraftSchema.parse({
      payments: [{ amountCents: 100000, id, method: "pix" }],
    });

    expect(cleanUpdateSaleDraftInput(parsed).payments?.[0]?.id).toBe(id);
    expect(cleanCreateSaleDraftInput(parsed).payments?.[0]?.id).toBeUndefined();
  });
});
