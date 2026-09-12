import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AppBootScreen } from "../components/ui";
import { DelayedFallback } from "../components/ui/DelayedFallback";
import { adminRoutePaths } from "./adminRoutePaths";
import {
  AuthenticatedRoutes,
  ClerkAuthProvider,
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
      <ClerkAuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/sign-in/*"
            element={<AuthenticatedRoutes section="sign-in" />}
          />
          <Route
            path="/sign-up/*"
            element={<AuthenticatedRoutes section="sign-up" />}
          />
          <Route
            path="/auth/session/*"
            element={<AuthenticatedRoutes section="session-bootstrap" />}
          />
          <Route
            path="/onboarding/*"
            element={<AuthenticatedRoutes section="onboarding" />}
          />
          <Route
            path="/platform/observability/*"
            element={<AuthenticatedRoutes section="platform-observability" />}
          />
          <Route
            path="/platform/admin/*"
            element={<AuthenticatedRoutes section="platform-admin" />}
          />
          <Route
            path="/agency/admin/*"
            element={<AuthenticatedRoutes section="agency-admin" />}
          />
          {adminRoutePaths
            .filter((path) => path !== "/")
            .map((path) => (
              <Route
                element={<AuthenticatedRoutes section="store-admin" />}
                key={path}
                path={`${path}/*`}
              />
            ))}
          <Route
            path="/:storeSlug/p/:pageSlug"
            element={
              <PublicStorefrontSlugGuard
                reservedFallback={<AuthenticatedRoutes section="store-admin" />}
              >
                <PublicCustomPageRoute />
              </PublicStorefrontSlugGuard>
            }
          />
          <Route
            path="/:storeSlug"
            element={
              <PublicStorefrontSlugGuard
                reservedFallback={<AuthenticatedRoutes section="store-admin" />}
              >
                <PublicStorefrontPage />
              </PublicStorefrontSlugGuard>
            }
          />
          <Route path="/p/:pageSlug" element={<PublicCustomPageRoute />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ClerkAuthProvider>
    </Suspense>
  );
}
