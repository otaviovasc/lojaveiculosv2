import { ProtectedRoute } from "../features/account/AuthPages";
import { AdminApp } from "./AppLazyRoutes";

export function StoreAdminRoute() {
  return (
    <ProtectedRoute access="store">
      <AdminApp />
    </ProtectedRoute>
  );
}
