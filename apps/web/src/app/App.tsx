import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import {
  ProtectedRoute,
  SessionBootstrapPage,
  SignInPage,
  SignUpPage,
} from "../features/account/AuthPages";
import { AppBootScreen } from "../components/ui";
import { DelayedFallback } from "../components/ui/DelayedFallback";
import { adminRoutePaths } from "./adminRoutePaths";
import {
  AgencyBillingPage,
  AgencyCreateStorePage,
  AgencyCrederePage,
  AgencyDashboardPage,
  AgencyLayout,
  AgencyStatsPage,
  LandingPage,
  OwnerOnboardingPage,
  PlatformAdminPage,
  PublicCustomPageRoute,
  PublicStorefrontPage,
} from "./AppLazyRoutes";
import { PublicStorefrontSlugGuard } from "./PublicStorefrontSlugGuard";
import { StoreAdminRoute } from "./StoreAdminRoute";
import { NotFoundPage } from "../features/system/NotFoundPage";

export function App() {
  return (
    <Suspense
      fallback={
        <DelayedFallback>
          <AppBootScreen title="Carregando experiência" />
        </DelayedFallback>
      }
    >
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
          <Route path="credere" element={<AgencyCrederePage />} />
          <Route path="create-store" element={<AgencyCreateStorePage />} />
        </Route>
        {adminRoutePaths.map((path) => (
          <Route element={<StoreAdminRoute />} key={path} path={path} />
        ))}
        <Route
          path="/:storeSlug/p/:pageSlug"
          element={
            <PublicStorefrontSlugGuard reservedFallback={<StoreAdminRoute />}>
              <PublicCustomPageRoute />
            </PublicStorefrontSlugGuard>
          }
        />
        <Route
          path="/:storeSlug"
          element={
            <PublicStorefrontSlugGuard reservedFallback={<StoreAdminRoute />}>
              <PublicStorefrontPage />
            </PublicStorefrontSlugGuard>
          }
        />
        <Route path="/p/:pageSlug" element={<PublicCustomPageRoute />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
