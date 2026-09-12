import { cx } from "../../components/ui/featureShared";

const skeletonTabs = [0, 1, 2, 3, 4, 5];
const skeletonRows = [0, 1, 2, 3];

export function AutoEntriesLoadingSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Carregando lançamentos automáticos"
      className="ae-loading-skeleton"
      role="status"
    >
      <div
        aria-hidden="true"
        className="ae-loading-skeleton__tabs animate-pulse"
      >
        {skeletonTabs.map((tab) => (
          <div className="ae-loading-skeleton__tab" key={tab}>
            <span className="block size-6 rounded-lg bg-app-elevated" />
            <span className="block h-3 w-20 rounded bg-line" />
            <span className="ml-auto block size-5 rounded-full bg-app-elevated" />
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="ae-loading-skeleton__domain">
        <div className="ae-loading-skeleton__heading animate-pulse">
          <span className="block size-11 rounded-xl bg-app-elevated" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="block h-4 w-44 rounded bg-line" />
            <span className="block h-3 w-full max-w-2xl rounded bg-app-elevated" />
          </span>
          <span className="block h-6 w-24 rounded-full bg-app-elevated" />
        </div>

        <div className="ae-loading-skeleton__cards">
          <SkeletonPanel wide />
          <SkeletonPanel />
          <SkeletonPanel />
        </div>
      </div>
    </section>
  );
}

function SkeletonPanel({ wide = false }: { wide?: boolean }) {
  return (
    <div
      className={cx(
        "glass-panel-branded ae-loading-skeleton__panel animate-pulse",
        wide && "ae-loading-skeleton__panel--wide",
      )}
    >
      <div className="ae-loading-skeleton__panel-header">
        <span className="block h-4 w-40 rounded bg-line" />
        <span className="block h-3 w-3/4 rounded bg-app-elevated" />
      </div>
      <div className="ae-loading-skeleton__panel-body">
        {skeletonRows.map((row) => (
          <div className="flex items-center gap-3" key={row}>
            <span className="block size-8 rounded-lg bg-app-elevated" />
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="block h-3 w-2/3 rounded bg-app-elevated" />
              <span className="block h-3 w-1/2 rounded bg-line" />
            </span>
          </div>
        ))}
      </div>
      <div className="ae-loading-skeleton__panel-footer">
        <span className="block h-9 w-28 rounded-lg bg-app-elevated" />
      </div>
    </div>
  );
}
