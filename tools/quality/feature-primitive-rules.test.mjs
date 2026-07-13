import { describe, expect, it } from "vitest";
import { findFeaturePrimitiveViolations } from "./feature-primitive-rules.mjs";

describe("feature primitive rules", () => {
  it("rejects exact generic feature components", () => {
    const source = `
      function EmptyState() { return <div>Nothing</div>; }
      const PageHeader = () => <header>Title</header>;
    `;

    expect(findFeaturePrimitiveViolations("Screen.tsx", source)).toEqual([
      expect.objectContaining({ name: "local generic UI EmptyState" }),
      expect.objectContaining({ name: "local generic UI PageHeader" }),
    ]);
  });

  it("rejects feature-prefixed state markup that bypassed the old name check", () => {
    const source = `
      export function SalesEmptyState() { return <div>Nothing</div>; }
      export const DashboardLoadingState = () => <section>Loading</section>;
      export function InventoryErrorState() { return <p>Error</p>; }
    `;

    expect(findFeaturePrimitiveViolations("Screen.tsx", source)).toEqual([
      expect.objectContaining({ name: "feature state SalesEmptyState" }),
      expect.objectContaining({ name: "feature state DashboardLoadingState" }),
      expect.objectContaining({ name: "feature state InventoryErrorState" }),
    ]);
  });

  it("inspects components wrapped in memo and forwardRef calls", () => {
    const source = `
      const EmptyState = memo(() => <div>Nothing</div>);
      const SalesErrorState = React.forwardRef(function ErrorContent() {
        return <p>Error</p>;
      });
    `;

    expect(findFeaturePrimitiveViolations("Screen.tsx", source)).toEqual([
      expect.objectContaining({ name: "local generic UI EmptyState" }),
      expect.objectContaining({ name: "feature state SalesErrorState" }),
    ]);
  });

  it("allows domain wrappers that render the matching shared primitives", () => {
    const source = `
      import {
        FeatureAlert,
        FeatureEmptyState as SharedEmpty,
        FeatureLoadingState,
      } from "../../components/ui/FeatureStates";

      export function SalesEmptyState() {
        return <SharedEmpty body="None" icon={() => null} title="Sales" />;
      }
      export function DashboardLoadingState() {
        return <FeatureLoadingState title="Loading" />;
      }
      export function InventoryErrorState() {
        return <FeatureAlert>Error</FeatureAlert>;
      }
    `;

    expect(findFeaturePrimitiveViolations("Screen.tsx", source)).toEqual([]);
  });

  it("supports namespace imports and shared inline alerts for empty states", () => {
    const source = `
      import * as UI from "@/components/ui/FeatureStates";
      const TableEmptyState = () => <UI.FeatureAlert>None</UI.FeatureAlert>;
    `;

    expect(findFeaturePrimitiveViolations("Screen.tsx", source)).toEqual([]);
  });

  it("ignores lower-case model helpers with state-like names", () => {
    const source = `
      export function toErrorState(error) { return { kind: "error", error }; }
    `;

    expect(findFeaturePrimitiveViolations("model.ts", source)).toEqual([]);
  });
});
