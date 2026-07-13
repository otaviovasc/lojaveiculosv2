import { CircleAlert, LoaderCircle } from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import {
  FeatureAlert,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";

export function CrmPipelineAlert({
  error,
  fallback,
}: {
  error: Error;
  fallback: string;
}) {
  return (
    <FeatureAlert
      className="crm-note"
      icon={<CircleAlert aria-hidden="true" className="size-5 shrink-0" />}
    >
      <span>{formatApiErrorDisplay(error, fallback)}</span>
    </FeatureAlert>
  );
}

export function CrmPipelineLoading({
  body,
  title,
}: {
  body: string;
  title: string;
}) {
  return (
    <FeatureLoadingState
      className="glass-panel-branded flex items-center gap-3 text-sm font-bold text-muted"
      density="compact"
      icon={LoaderCircle}
      title={title}
    >
      <span>{body}</span>
    </FeatureLoadingState>
  );
}
