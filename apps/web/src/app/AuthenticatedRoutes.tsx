import { Routes, Route } from "react-router-dom";
import {
  ProtectedRoute,
  SessionBootstrapPage,
  SignInPage,
  SignUpPage,
} from "../features/account/AuthPages";
import { NotFoundPage } from "../features/system/NotFoundPage";
import {
  AgencyBillingPage,
  AgencyCreateStorePage,
  AgencyCrederePage,
  AgencyDashboardPage,
  AgencyLayout,
  AgencyStatsPage,
  ObservabilityPage,
  OwnerOnboardingPage,
  PlatformAdminPage,
} from "./AppLazyRoutes";
import { adminRoutePaths } from "./adminRoutePaths";
import { StoreAdminRoute } from "./StoreAdminRoute";

export function AuthenticatedRoutes() {
  return (
    <Routes>
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route
        path="/auth/session"
        element={
          <ProtectedRoute access="signed-in">
            <SessionBootstrapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute access="onboarding">
            <OwnerOnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/observability"
        element={
          <ProtectedRoute access="platform">
            <ObservabilityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/admin"
        element={
          <ProtectedRoute access="platform">
            <PlatformAdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agency/admin"
        element={
          <ProtectedRoute access="agency">
            <AgencyLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AgencyDashboardPage />} />
        <Route path="stats" element={<AgencyStatsPage />} />
        <Route path="unified-billing" element={<AgencyBillingPage />} />
        <Route path="credere" element={<AgencyCrederePage />} />
        <Route path="create-store" element={<AgencyCreateStorePage />} />
      </Route>
      {adminRoutePaths.map((path) => (
        <Route element={<StoreAdminRoute />} key={path} path={path} />
      ))}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
