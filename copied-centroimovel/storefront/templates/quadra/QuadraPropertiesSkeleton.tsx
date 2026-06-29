"use client";

/**
 * Skeleton loading state for Quadra properties/filter page.
 * Updated to match the QuintoAndar-inspired layout with sub-header type tabs and list cards.
 */
export function QuadraPropertiesSkeleton() {
  return (
    <div
      className="min-h-screen flex flex-col selection:bg-brand/10"
      style={{ backgroundColor: "#FFFCF7" }}
    >
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-black/5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between px-5 py-3.5 md:px-10">
          <div className="flex items-center gap-4">
            <div className="h-9 w-9 animate-pulse rounded-full bg-stone-200" />
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-stone-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-stone-200 hidden sm:block" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-24 animate-pulse rounded-full bg-stone-200 lg:hidden" />
            <div className="h-10 w-36 animate-pulse rounded-full bg-stone-200 hidden md:block" />
          </div>
        </div>

        {/* Type Tabs Skeleton */}
        <div className="max-w-[1600px] mx-auto px-5 md:px-10 pb-3 overflow-hidden">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-7 w-20 shrink-0 animate-pulse rounded-full bg-stone-100"
              />
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full">
        {/* Sidebar filter skeleton */}
        <aside className="hidden lg:block w-[300px] shrink-0 border-r border-stone-100 bg-white">
          <div className="sticky top-[106px] p-6 space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div className="h-6 w-32 animate-pulse rounded bg-stone-200" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-stone-100" />
            </div>

            {/* Search */}
            <div className="h-10 w-full animate-pulse rounded-xl bg-stone-100" />

            {/* Sections */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-2 w-16 animate-pulse rounded bg-stone-100" />
                <div className="h-10 w-full animate-pulse rounded-xl bg-stone-100" />
              </div>
            ))}
          </div>
        </aside>

        {/* Results area */}
        <div className="flex-1 min-w-0 p-5 md:p-8 lg:p-10">
          {/* Results header */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex justify-between items-end gap-4">
              <div className="space-y-2">
                <div className="h-6 w-24 animate-pulse rounded-full bg-stone-100" />
                <div className="h-10 w-64 animate-pulse rounded bg-stone-200" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-32 animate-pulse rounded-xl bg-stone-100" />
                <div className="h-9 w-20 animate-pulse rounded-xl bg-stone-100" />
              </div>
            </div>
          </div>

          {/* List Cards Skeleton */}
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex overflow-hidden rounded-2xl bg-white border border-stone-100 shadow-sm h-48"
              >
                <div className="w-44 sm:w-56 shrink-0 bg-stone-200 animate-pulse" />
                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-stone-100" />
                    <div className="h-6 w-3/4 animate-pulse rounded bg-stone-200" />
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((j) => (
                        <div
                          key={j}
                          className="h-7 w-16 animate-pulse rounded-lg bg-stone-100"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-end pt-4 border-t border-stone-50">
                    <div className="space-y-1">
                      <div className="h-2 w-12 animate-pulse rounded bg-stone-100" />
                      <div className="h-6 w-32 animate-pulse rounded bg-stone-200" />
                    </div>
                    <div className="h-9 w-9 animate-pulse rounded-full bg-stone-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
