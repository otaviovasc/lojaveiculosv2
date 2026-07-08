import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const failures = [];

const requiredMarkers = [
  {
    file: "apps/web/src/components/AppShell.tsx",
    markers: [
      "useTenantAdminBrand",
      "style={tenantBrandState.style}",
      "workspaceIconUrl={tenantBrand.iconUrl}",
      "workspaceLogoUrl={tenantBrand.logoUrl}",
    ],
  },
  {
    file: "apps/web/src/components/ui/dashboard-sidebar.tsx",
    markers: ["workspaceIconUrl", "workspaceLogoUrl", "SidebarWorkspace"],
  },
  {
    file: "apps/web/src/components/ui/dashboard-sidebar-parts.tsx",
    markers: ["iconUrl", "logoUrl", "src={compactLogoUrl}"],
  },
  {
    file: "apps/web/src/components/ui/logo.tsx",
    markers: ["src?: string | null | undefined", "src={src ?? fallbackSrc}"],
  },
  {
    file: "apps/web/src/features/publicSite/StorefrontCustomizationModule.tsx",
    markers: ["notifyTenantAdminBrandUpdated(saved)"],
  },
  {
    file: "apps/web/src/features/settings/SettingsModule.tsx",
    markers: ["notifyTenantAdminBrandUpdated(saved)"],
  },
];

for (const { file, markers } of requiredMarkers) {
  const source = read(file);
  for (const marker of markers) {
    if (source.includes(marker)) continue;
    failures.push(`${file} must include ${marker}`);
  }
}

const shellSource = read("apps/web/src/components/AppShell.tsx");
if (shellSource.includes('workspaceName="Loja Veiculos"')) {
  failures.push(
    "apps/web/src/components/AppShell.tsx must use tenantBrand.storeName for workspaceName",
  );
}

const dynamicShellFiles = [
  "apps/web/src/components/AppShell.tsx",
  "apps/web/src/components/ui/dashboard-sidebar.tsx",
  "apps/web/src/components/ui/dashboard-sidebar-parts.tsx",
];
const staticBrandColorPattern = /#[0-9a-fA-F]{3,8}\b/;
for (const file of dynamicShellFiles) {
  const source = read(file);
  if (!staticBrandColorPattern.test(source)) continue;
  failures.push(`${file} must not hardcode brand colors in tenant shell scope`);
}

const brandingSource = read("apps/web/src/app/tenantAdminBranding.ts");
if (!brandingSource.includes("normalizeHexColor")) {
  failures.push("tenantAdminBranding.ts must validate tenant accent colors");
}
if (!brandingSource.includes("createTenantAdminBrandStyle")) {
  failures.push("tenantAdminBranding.ts must expose the dynamic CSS variables");
}

if (failures.length > 0) {
  console.error("Tenant admin branding guardrail violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Tenant admin branding guardrails passed.");

function read(file) {
  return readFileSync(join(root, file), "utf8");
}
