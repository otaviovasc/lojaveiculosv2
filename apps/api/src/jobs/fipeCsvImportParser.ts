const FIPE_CSV_COLUMNS = [
  "Type",
  "Brand Code",
  "Brand Value",
  "Model Code",
  "Model Value",
  "Year Code",
  "Year Value",
  "Fipe Code",
  "Fuel Letter",
  "Fuel Type",
  "Price",
  "Month",
] as const;

export type FipeCsvRow = {
  brandCode: string;
  brandValue: string;
  fipeCode: string;
  fuelType: string;
  modelCode: string;
  modelValue: string;
  month: string;
  price: string;
  type: string;
  yearCode: string;
  yearValue: string;
};

export function assertFipeCsvHeader(line: string): void {
  const fields = parseCsvLine(line.replace(/^\uFEFF/, ""));
  const hasExpectedColumns =
    fields?.length === FIPE_CSV_COLUMNS.length &&
    fields.every((field, index) => field === FIPE_CSV_COLUMNS[index]);

  if (!hasExpectedColumns) {
    throw new Error(
      `Invalid FIPE CSV header. Expected: ${FIPE_CSV_COLUMNS.join(",")}`,
    );
  }
}

export function parseFipeCsvRow(line: string): FipeCsvRow | null {
  const fields = parseCsvLine(line);
  if (!fields || fields.length !== FIPE_CSV_COLUMNS.length) return null;

  const [
    type,
    brandCode,
    brandValue,
    modelCode,
    modelValue,
    yearCode,
    yearValue,
    fipeCode,
    _fuelLetter,
    fuelType,
    price,
    month,
  ] = fields;

  if (!type || !brandCode || !modelCode || !yearCode) return null;

  return {
    brandCode,
    brandValue: brandValue ?? "",
    fipeCode: fipeCode ?? "",
    fuelType: fuelType ?? "",
    modelCode,
    modelValue: modelValue ?? "",
    month: month ?? "",
    price: price ?? "",
    type,
    yearCode,
    yearValue: yearValue ?? "",
  };
}

export function parseCsvLine(line: string): string[] | null {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (inQuotes) return null;
  fields.push(current);
  return fields;
}
