import { lazy } from "react";

export const AdminApp = lazy(() =>
  import("./AdminApp").then((module) => ({ default: module.AdminApp })),
);
export const AgencyLayout = lazy(() =>
  import("../features/agency/AgencyLayout").then((module) => ({
    default: module.AgencyLayout,
  })),
);
export const AgencyBillingPage = lazy(() =>
  import("../features/agency/pages/AgencyBillingPage").then((module) => ({
    default: module.AgencyBillingPage,
  })),
);
export const AgencyCreateStorePage = lazy(() =>
  import("../features/agency/pages/AgencyCreateStorePage").then((module) => ({
    default: module.AgencyCreateStorePage,
  })),
);
export const AgencyDashboardPage = lazy(() =>
  import("../features/agency/pages/AgencyDashboardPage").then((module) => ({
    default: module.AgencyDashboardPage,
  })),
);
export const AgencyStatsPage = lazy(() =>
  import("../features/agency/pages/AgencyStatsPage").then((module) => ({
    default: module.AgencyStatsPage,
  })),
);
export const LandingPage = lazy(() =>
  import("../features/marketing/LandingPage").then((module) => ({
    default: module.LandingPage,
  })),
);
export const OwnerOnboardingPage = lazy(() =>
  import("../features/account/OwnerOnboardingPage").then((module) => ({
    default: module.OwnerOnboardingPage,
  })),
);
export const PlatformAdminPage = lazy(() =>
  import("../features/account/PlatformAdminPage").then((module) => ({
    default: module.PlatformAdminPage,
  })),
);
export const PublicCustomPageRoute = lazy(() =>
  import("../features/publicSite/PublicCustomPageRoute").then((module) => ({
    default: module.PublicCustomPageRoute,
  })),
);
export const PublicStorefrontPage = lazy(() =>
  import("../features/publicSite/PublicStorefrontPage").then((module) => ({
    default: module.PublicStorefrontPage,
  })),
);
