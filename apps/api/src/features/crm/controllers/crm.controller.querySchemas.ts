import { z } from "zod";

export const queryBooleanSchema = z
  .union([z.boolean(), z.literal("true"), z.literal("false")])
  .transform((value) => value === true || value === "true");

export const queryUuidListSchema = z
  .string()
  .trim()
  .optional()
  .transform((value, context) => {
    if (!value) return undefined;
    const ids = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const uuid = z.string().uuid();
    for (const id of ids) {
      if (!uuid.safeParse(id).success) {
        context.addIssue({
          code: "custom",
          message: "Expected comma-separated UUIDs.",
        });
        return z.NEVER;
      }
    }
    return ids;
  });
