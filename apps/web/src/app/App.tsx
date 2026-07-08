import { Routes, Route } from "react-router-dom";
import { PublicCustomPageRoute } from "../features/publicSite/PublicCustomPageRoute";
import { PublicStorefrontPage } from "../features/publicSite/PublicStorefrontPage";
import {
  ProtectedRoute,
  SessionBootstrapPage,
  SignInPage,
  SignUpPage,
} from "../features/account/AuthPages";
import { OwnerOnboardingPage } from "../features/account/OwnerOnboardingPage";
import { PlatformAdminPage } from "../features/account/PlatformAdminPage";
import { AgencyLayout } from "../features/agency/AgencyLayout";
import { AgencyDashboardPage } from "../features/agency/pages/AgencyDashboardPage";
import { AgencyStatsPage } from "../features/agency/pages/AgencyStatsPage";
import { AgencyBillingPage } from "../features/agency/pages/AgencyBillingPage";
import { AgencyCreateStorePage } from "../features/agency/pages/AgencyCreateStorePage";
import { LandingPage } from "../features/marketing/LandingPage";
import { AdminApp } from "./AdminApp";
import { adminRoutePaths } from "./adminRoutePaths";
import { PublicStorefrontSlugGuard } from "./PublicStorefrontSlugGuard";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
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
        <Route path="create-store" element={<AgencyCreateStorePage />} />
      </Route>
      {adminRoutePaths.map((path) => (
        <Route
          element={
            <ProtectedRoute access="store">
              <AdminApp />
            </ProtectedRoute>
          }
          key={path}
          path={path}
        />
      ))}
      <Route
        path="/:storeSlug/p/:pageSlug"
        element={
          <PublicStorefrontSlugGuard>
            <PublicCustomPageRoute />
          </PublicStorefrontSlugGuard>
        }
      />
      <Route
        path="/:storeSlug"
        element={
          <PublicStorefrontSlugGuard>
            <PublicStorefrontPage />
          </PublicStorefrontSlugGuard>
        }
      />
      <Route path="/p/:pageSlug" element={<PublicCustomPageRoute />} />
      <Route
        path="*"
        element={
          <ProtectedRoute access="store">
            <AdminApp />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
