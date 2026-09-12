import {
  readArray,
  readNumber,
  readRecord,
  readString,
} from "./credereHttpSupport.js";

export function mapDomainOptions(
  payload: Record<string, unknown>,
  type: string,
) {
  const data = readRecord(payload.data);
  const domains = readRecord(payload.domains);
  return readArray(data[type] ?? domains[type])
    .map(readRecord)
    .map((option) => ({
      label: readString(option.label) ?? "",
      value:
        readString(option.credere_identifier) ??
        readString(option.identifier) ??
        String(readNumber(option.id) ?? readString(option.id) ?? ""),
    }))
    .filter((option) => option.label && option.value);
}
