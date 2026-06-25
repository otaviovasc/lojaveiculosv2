export const vehicleColorValues = [
  "white",
  "black",
  "silver",
  "gray",
  "red",
  "blue",
  "green",
  "yellow",
  "brown",
  "orange",
  "purple",
  "gold",
  "beige",
  "ice",
  "graphite",
  "champagne",
  "pearl",
  "navy",
  "coral",
  "burgundy",
  "bronze",
  "pink",
  "other",
] as const;

export type VehicleColor = (typeof vehicleColorValues)[number];

export type VehicleColorOption = {
  aliases: readonly string[];
  label: string;
  swatch: string;
  value: VehicleColor;
};

export const vehicleColorOptions = [
  colorOption("white", "Branco", "#ffffff", ["branca"]),
  colorOption("black", "Preto", "#1a1a1a", ["preta"]),
  colorOption("silver", "Prata", "#c0c0c0"),
  colorOption("gray", "Cinza", "#808080", ["cinzento", "cinzenta"]),
  colorOption("red", "Vermelho", "#b22222", ["vermelha"]),
  colorOption("blue", "Azul", "#1e90ff"),
  colorOption("green", "Verde", "#228b22"),
  colorOption("yellow", "Amarelo", "#ffd700", ["amarela"]),
  colorOption("brown", "Marrom", "#8b4513"),
  colorOption("orange", "Laranja", "#ff8c00"),
  colorOption("purple", "Roxo", "#6a0dad", ["roxa"]),
  colorOption("gold", "Dourado", "#daa520", ["dourada"]),
  colorOption("beige", "Bege", "#f5f5dc"),
  colorOption("ice", "Gelo", "#e0f7fa"),
  colorOption("graphite", "Grafite", "#36454f"),
  colorOption("champagne", "Champanhe", "#f7e7ce"),
  colorOption("pearl", "Perolizado", "#e8e4c9", ["perola", "perolada"]),
  colorOption("navy", "Navy", "#000080", ["azul marinho"]),
  colorOption("coral", "Coral", "#ff7f50"),
  colorOption("burgundy", "Vinho", "#800020"),
  colorOption("bronze", "Bronze", "#cd7f32"),
  colorOption("pink", "Rosa", "#ff69b4"),
  colorOption("other", "Outra", "#94a3b8", ["outro"]),
] as const satisfies readonly VehicleColorOption[];

export function isVehicleColor(value: unknown): value is VehicleColor {
  return (
    typeof value === "string" &&
    (vehicleColorValues as readonly string[]).includes(value)
  );
}

export function normalizeVehicleColor(
  value: string | null | undefined,
): VehicleColor | null {
  const normalized = normalizeColorText(value);
  if (!normalized) return null;

  const option = vehicleColorOptions.find(
    (item) =>
      item.value === normalized ||
      normalizeColorText(item.label) === normalized ||
      item.aliases.some((alias) => normalizeColorText(alias) === normalized),
  );

  return option?.value ?? null;
}

export function coerceVehicleColor(
  value: string | null | undefined,
): VehicleColor | null {
  if (!value?.trim()) return null;
  return normalizeVehicleColor(value) ?? "other";
}

export function getVehicleColorLabel(value: string | null | undefined): string {
  const color = normalizeVehicleColor(value);
  return color
    ? (vehicleColorOptions.find((option) => option.value === color)?.label ??
        color)
    : (value?.trim() ?? "");
}

export function getVehicleColorSwatch(
  value: string | null | undefined,
): string | null {
  const color = normalizeVehicleColor(value);
  return (
    vehicleColorOptions.find((option) => option.value === color)?.swatch ?? null
  );
}

function colorOption(
  value: VehicleColor,
  label: string,
  swatch: string,
  aliases: readonly string[] = [],
): VehicleColorOption {
  return { aliases, label, swatch, value };
}

function normalizeColorText(value: string | null | undefined) {
  return (
    value
      ?.trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") ?? ""
  );
}
