import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AppBootScreen } from "../components/ui";
import { DelayedFallback } from "../components/ui/DelayedFallback";
import { adminRoutePaths } from "./adminRoutePaths";
import {
  AuthenticatedRoutes,
  LandingPage,
  PublicCustomPageRoute,
  PublicStorefrontPage,
} from "./AppLazyRoutes";
import { PublicStorefrontSlugGuard } from "./PublicStorefrontSlugGuard";
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
        <Route path="/sign-in/*" element={<AuthenticatedRoutes />} />
        <Route path="/sign-up/*" element={<AuthenticatedRoutes />} />
        <Route path="/auth/session/*" element={<AuthenticatedRoutes />} />
        <Route path="/onboarding/*" element={<AuthenticatedRoutes />} />
        <Route
          path="/platform/observability/*"
          element={<AuthenticatedRoutes />}
        />
        <Route path="/platform/admin/*" element={<AuthenticatedRoutes />} />
        <Route path="/agency/admin/*" element={<AuthenticatedRoutes />} />
        {adminRoutePaths
          .filter((path) => path !== "/")
          .map((path) => (
            <Route
              element={<AuthenticatedRoutes />}
              key={path}
              path={`${path}/*`}
            />
          ))}
        <Route
          path="/:storeSlug/p/:pageSlug"
          element={
            <PublicStorefrontSlugGuard
              reservedFallback={<AuthenticatedRoutes />}
            >
              <PublicCustomPageRoute />
            </PublicStorefrontSlugGuard>
          }
        />
        <Route
          path="/:storeSlug"
          element={
            <PublicStorefrontSlugGuard
              reservedFallback={<AuthenticatedRoutes />}
            >
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
