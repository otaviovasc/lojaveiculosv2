import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../features/account/AuthPages";
import { NotFoundPage } from "../features/system/NotFoundPage";
import {
  AgencyBillingPage,
  AgencyCreateStorePage,
  AgencyCrederePage,
  AgencyDashboardPage,
  AgencyLayout,
  AgencyStatsPage,
  AgencyTeamAccessPage,
} from "./AppLazyRoutes";

export function AgencyAdminRoutes() {
  return (
    <Routes>
      <Route
        element={
          <ProtectedRoute access="agency">
            <AgencyLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AgencyDashboardPage />} />
        <Route path="stats" element={<AgencyStatsPage />} />
        <Route path="team-access" element={<AgencyTeamAccessPage />} />
        <Route path="unified-billing" element={<AgencyBillingPage />} />
        <Route path="credere" element={<AgencyCrederePage />} />
        <Route path="create-store" element={<AgencyCreateStorePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
