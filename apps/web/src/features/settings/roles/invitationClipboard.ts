export async function copyInvitationAcceptUrl(acceptUrl: string) {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard API is unavailable.");
  }
  await navigator.clipboard.writeText(acceptUrl);
}
