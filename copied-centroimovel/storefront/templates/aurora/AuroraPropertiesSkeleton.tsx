"use client";

/**
 * Skeleton loading state for Aurora properties/filter page.
 * Updated to match the QuintoAndar-inspired layout with sort, view toggle, and type tabs.
 */
export function AuroraPropertiesSkeleton() {
  return (
    <div
      className="min-h-screen flex flex-col selection:bg-brand/20"
      style={{ backgroundColor: "#F8F5F0" }}
    >
      {/* Header skeleton */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/90 border-b border-black/5 backdrop-blur-lg shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4 md:px-12 flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse rounded bg-stone-200" />
          <div className="h-10 w-28 animate-pulse rounded-full bg-stone-200" />
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row max-w-[1600px] mx-auto w-full pt-20 min-h-[calc(100vh-80px)]">
        {/* Sidebar skeleton */}
        <aside className="w-full md:w-72 shrink-0 md:border-r border-stone-200/80 bg-white">
          <div className="sticky top-[80px] p-6 space-y-8">
            <div className="flex justify-between items-center">
              <div className="h-6 w-36 animate-pulse rounded bg-stone-200" />
              <div className="h-4 w-12 animate-pulse rounded bg-stone-100" />
            </div>

            <div className="space-y-6">
              {/* Search */}
              <div className="h-12 w-full animate-pulse rounded-xl bg-stone-200" />

              {/* Sections */}
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="py-4 border-b border-stone-100 space-y-3"
                >
                  <div className="flex justify-between">
                    <div className="h-3 w-24 animate-pulse rounded bg-stone-100" />
                    <div className="h-3 w-3 animate-pulse rounded bg-stone-100" />
                  </div>
                  {i < 3 && (
                    <div className="h-10 w-full animate-pulse rounded-xl bg-stone-200" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Content area */}
        <div className="flex-1 p-6 md:p-10 lg:p-12">
          {/* Title & Count */}
          <div className="mb-8">
            <div className="h-10 w-48 animate-pulse rounded bg-stone-200 mb-2" />
            <div className="h-4 w-36 animate-pulse rounded bg-stone-200/80" />
          </div>

          {/* Type Tabs */}
          <div className="flex gap-2 overflow-hidden mb-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 w-24 shrink-0 animate-pulse rounded-full bg-stone-200"
              />
            ))}
          </div>

          {/* Controls Bar */}
          <div className="flex justify-between items-center mb-8">
            <div className="h-10 w-40 animate-pulse rounded-xl bg-stone-200" />
            <div className="h-10 w-28 animate-pulse rounded-xl bg-stone-200" />
          </div>

          {/* Property Grid */}
          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-4xl border border-stone-200/60 bg-white"
              >
                <div className="aspect-4/3 bg-stone-200 animate-pulse" />
                <div className="p-8 pb-10 space-y-4">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-stone-200" />
                  <div className="h-6 w-full animate-pulse rounded bg-stone-200" />
                  <div className="flex gap-4">
                    {[1, 2, 3].map((j) => (
                      <div
                        key={j}
                        className="h-4 w-10 animate-pulse rounded bg-stone-200"
                      />
                    ))}
                  </div>
                  <div className="border-t border-stone-100 pt-6 flex justify-between">
                    <div className="h-8 w-24 animate-pulse rounded bg-stone-200" />
                    <div className="h-12 w-12 animate-pulse rounded-full bg-stone-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer skeleton */}
      <footer className="border-t border-stone-200/80 py-12 px-6 md:px-12">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between gap-6">
          <div className="h-4 w-48 animate-pulse rounded bg-stone-200" />
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-8 w-8 animate-pulse rounded-full bg-stone-200"
              />
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
