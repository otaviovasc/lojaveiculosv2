import { ProtectedRoute } from "../features/account/AuthPages";
import { AdminApp } from "./AppLazyRoutes";
import { AuthenticatedCrmDeepLinkHandoff } from "./AuthenticatedCrmDeepLinkHandoff";

export function StoreAdminRoute() {
  return (
    <ProtectedRoute access="store">
      <AuthenticatedCrmDeepLinkHandoff>
        <AdminApp />
      </AuthenticatedCrmDeepLinkHandoff>
    </ProtectedRoute>
  );
}
