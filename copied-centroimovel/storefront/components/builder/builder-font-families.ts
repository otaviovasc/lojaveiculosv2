/**
 * Font stacks available in the storefront builder (Google Fonts + system).
 * Matches product UI direction: Bricolage Grotesque + Plus Jakarta (see globals.css).
 */
export const DEFAULT_BUILDER_FONT_FAMILY = "Bricolage Grotesque" as const;

export const STORE_BUILDER_FONT_FAMILIES = [
  { value: "Bricolage Grotesque", label: "Bricolage Grotesque" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "DM Sans", label: "DM Sans" },
  { value: "Inter", label: "Inter" },
  { value: "Geist", label: "Geist" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Poppins", label: "Poppins" },
  { value: "system-ui", label: "Padrão do sistema" },
] as const;
