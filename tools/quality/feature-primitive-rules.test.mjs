import { describe, expect, it } from "vitest";
import {
  findFeaturePrimitiveViolations,
  findFeatureSectionContractViolations,
} from "./feature-primitive-rules.mjs";

describe("feature primitive rules", () => {
  it("requires the default FeatureSection variant to provide inner padding", () => {
    expect(
      findFeatureSectionContractViolations(`
        padding === "comfortable" && "p-6",
        padding === "default" && "p-5",
        padding === "none" && "!p-0",
      `),
    ).toEqual([]);
    expect(
      findFeatureSectionContractViolations(`
        padding === "comfortable" && "p-6",
        padding === "none" && "!p-0",
      `),
    ).toEqual([
      expect.objectContaining({
        name: "FeatureSection without default inner padding",
      }),
    ]);
  });

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

  it("requires explicit padding on shared FeatureCard renders", () => {
    const source = `
      import { FeatureCard } from "../../components/ui/FeatureCards";
      export function SalesPanel() {
        return <FeatureCard className="sales-panel">Sales</FeatureCard>;
      }
    `;

    expect(findFeaturePrimitiveViolations("Screen.tsx", source)).toEqual([
      expect.objectContaining({
        name: "FeatureCard without an explicit padding prop",
        verb: "renders",
      }),
    ]);
  });

  it("rejects feature-local KPI cards that bypass shared metric primitives", () => {
    const source = `
      export function CompactKpiCard() {
        return <article className="rounded-xl p-4">R$ 10,00</article>;
      }
    `;

    expect(findFeaturePrimitiveViolations("Finance.tsx", source)).toEqual([
      expect.objectContaining({
        name: "feature KPI card CompactKpiCard",
      }),
    ]);
  });

  it("allows domain KPI wrappers that compose a shared primitive", () => {
    const source = `
      import { FeatureMetricCard } from "../../components/ui/FeatureMetrics";
      export function CashFlowKpiCard() {
        return <FeatureMetricCard />;
      }
    `;

    expect(findFeaturePrimitiveViolations("Finance.tsx", source)).toEqual([]);
  });

  it("resolves FeatureCard aliases and namespace imports", () => {
    const source = `
      import { FeatureCard as Panel } from "@/components/ui/FeatureCards";
      import * as Cards from "../../components/ui/FeatureCards";
      export function SalesPanel() {
        return <><Panel /><Cards.FeatureCard /></>;
      }
    `;

    expect(findFeaturePrimitiveViolations("Screen.tsx", source)).toEqual([
      expect.objectContaining({
        name: "Panel without an explicit padding prop",
      }),
      expect.objectContaining({
        name: "Cards.FeatureCard without an explicit padding prop",
      }),
    ]);
  });

  it("allows shared FeatureCard renders with explicit padding", () => {
    const source = `
      import { FeatureCard as Panel } from "@/components/ui";
      import * as Cards from "../../components/ui/FeatureCards";
      export function SalesPanel() {
        return (
          <>
            <Panel padding="none" />
            <Cards.FeatureCard padding="compact" />
          </>
        );
      }
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
