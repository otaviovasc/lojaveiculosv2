import { Routes, Route } from "react-router-dom";
import { PublicCustomPageRoute } from "../features/publicSite/PublicCustomPageRoute";
import { PublicStorefrontPage } from "../features/publicSite/PublicStorefrontPage";
import { AgencyLayout } from "../features/agency/AgencyLayout";
import { AgencyDashboardPage } from "../features/agency/pages/AgencyDashboardPage";
import { AgencyStatsPage } from "../features/agency/pages/AgencyStatsPage";
import { AgencyTeamAccessPage } from "../features/agency/pages/AgencyTeamAccessPage";
import { AgencyBillingPage } from "../features/agency/pages/AgencyBillingPage";
import { AgencyCreateStorePage } from "../features/agency/pages/AgencyCreateStorePage";
import { AdminApp } from "./AdminApp";
import { adminRoutePaths } from "./adminRoutePaths";

export function App() {
  return (
    <Routes>
      <Route path="/agency/admin" element={<AgencyLayout />}>
        <Route index element={<AgencyDashboardPage />} />
        <Route path="stats" element={<AgencyStatsPage />} />
        <Route path="team-access" element={<AgencyTeamAccessPage />} />
        <Route path="unified-billing" element={<AgencyBillingPage />} />
        <Route path="create-store" element={<AgencyCreateStorePage />} />
      </Route>
      {adminRoutePaths.map((path) => (
        <Route element={<AdminApp />} key={path} path={path} />
      ))}
      <Route
        path="/:storeSlug/p/:pageSlug"
        element={<PublicCustomPageRoute />}
      />
      <Route path="/:storeSlug" element={<PublicStorefrontPage />} />
      <Route path="/p/:pageSlug" element={<PublicCustomPageRoute />} />
      <Route path="*" element={<AdminApp />} />
    </Routes>
  );
}
