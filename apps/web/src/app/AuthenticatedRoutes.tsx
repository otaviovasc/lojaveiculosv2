import {
  ProtectedRoute,
  SessionBootstrapPage,
  SignInPage,
  SignUpPage,
} from "../features/account/AuthPages";
import { NotFoundPage } from "../features/system/NotFoundPage";
import {
  ObservabilityPage,
  OwnerOnboardingPage,
  PlatformAdminPage,
} from "./AppLazyRoutes";
import { AgencyAdminRoutes } from "./AgencyAdminRoutes";
import type { AuthenticatedRouteSection } from "./AuthenticatedRoutes.types";
import { StoreAdminRoute } from "./StoreAdminRoute";

export function AuthenticatedRoutes({
  section,
}: {
  section: AuthenticatedRouteSection;
}) {
  switch (section) {
    case "sign-in":
      return <SignInPage />;
    case "sign-up":
      return <SignUpPage />;
    case "session-bootstrap":
      return (
        <ProtectedRoute access="signed-in">
          <SessionBootstrapPage />
        </ProtectedRoute>
      );
    case "onboarding":
      return (
        <ProtectedRoute access="onboarding">
          <OwnerOnboardingPage />
        </ProtectedRoute>
      );
    case "platform-observability":
      return (
        <ProtectedRoute access="platform">
          <ObservabilityPage />
        </ProtectedRoute>
      );
    case "platform-admin":
      return (
        <ProtectedRoute access="platform">
          <PlatformAdminPage />
        </ProtectedRoute>
      );
    case "agency-admin":
      return <AgencyAdminRoutes />;
    case "store-admin":
      return <StoreAdminRoute />;
  }
}
