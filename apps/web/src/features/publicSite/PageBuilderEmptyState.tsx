import type { LucideIcon } from "lucide-react";
import { FeatureEmptyState } from "../../components/ui/FeatureStates";

export function PageBuilderPreviewEmptyState({
  icon: Icon,
  text,
  title,
}: {
  icon: LucideIcon;
  text: string;
  title: string;
}) {
  return (
    <section className="public-storefront-shell px-4 py-10 md:px-6">
      <FeatureEmptyState
        body={text}
        className="min-h-40 border-dashed"
        icon={Icon}
        title={title}
      />
    </section>
  );
}
