import { z } from "zod";

export const listingDescriptionTextSchema = z
  .string()
  .transform(normalizeListingDescriptionText)
  .refine((value) => value.trim().length > 0, {
    message: "Description must not be blank.",
  });

export function normalizeListingDescriptionText(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}
