export function renderSpecialDateText(
  template: string,
  recipientName: string,
): string {
  const firstName =
    recipientName.trim().split(/\s+/)[0] || recipientName.trim();
  return template
    .replaceAll(/\{nome\}/gi, firstName)
    .replaceAll(/\{nome_completo\}/gi, recipientName.trim())
    .trim();
}
