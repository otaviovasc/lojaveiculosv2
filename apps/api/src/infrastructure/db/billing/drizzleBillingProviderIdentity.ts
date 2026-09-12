export function providerIdentityCanBind(
  current: string | null,
  incoming: string | null | undefined,
) {
  return !incoming || !current || current === incoming;
}
