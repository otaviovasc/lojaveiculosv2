import { CircleAlert } from "lucide-react";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { AppApiError, formatApiErrorDisplay } from "../../lib/apiErrors";

export function CrmFormError({ children }: { children: string }) {
  return (
    <FeatureAlert
      className="crm-form-error"
      icon={<CircleAlert aria-hidden="true" />}
    >
      <span>{children}</span>
    </FeatureAlert>
  );
}

export function CrmFieldError({
  children,
  id,
}: {
  children: string;
  id: string;
}) {
  return (
    <span className="crm-form-field-error" id={id} role="alert">
      {children}
    </span>
  );
}

export function formatCrmSubmitError(error: unknown, fallback: string) {
  return error instanceof AppApiError
    ? formatApiErrorDisplay(error, fallback)
    : fallback;
}
