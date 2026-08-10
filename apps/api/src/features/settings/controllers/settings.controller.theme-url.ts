export function isSafeGoogleMapsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLocaleLowerCase("en-US");
    const isGoogle =
      hostname === "google.com" ||
      hostname === "maps.google.com" ||
      hostname === "www.google.com" ||
      hostname.endsWith(".google.com.br");
    return url.protocol === "https:" && isGoogle;
  } catch {
    return false;
  }
}
