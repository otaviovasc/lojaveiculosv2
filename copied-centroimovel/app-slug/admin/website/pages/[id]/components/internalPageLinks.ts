export interface InternalPage {
  slug: string;
  label: string;
  visible: boolean;
  secretToken?: string;
}

export function buildInternalPageUrl(
  workspaceSlug: string,
  pageSlug: string,
  secretToken?: string,
): string {
  const basePath = workspaceSlug
    ? `/${workspaceSlug}/p/${pageSlug}`
    : `/p/${pageSlug}`;
  return secretToken ? `${basePath}?token=${secretToken}` : basePath;
}

export async function fetchInternalPages(
  workspaceSlug: string,
): Promise<InternalPage[]> {
  if (!workspaceSlug) return [];

  const response = await fetch(`/api/workspaces/${workspaceSlug}/storefront`);
  if (!response.ok) return [];

  const data = await response.json();
  const routes = (data.customRoutes || []) as InternalPage[];
  return routes
    .filter((route) => Boolean(route?.slug) && Boolean(route?.label))
    .sort((a, b) => a.label.localeCompare(b.label));
}
