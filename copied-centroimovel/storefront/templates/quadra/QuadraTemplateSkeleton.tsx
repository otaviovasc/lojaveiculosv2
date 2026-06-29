"use client";

/**
 * Skeleton loading state for Quadra home template.
 * Mirrors the layout: header, hero with corretor, featured grid, about, footer.
 */
export function QuadraTemplateSkeleton() {
  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ backgroundColor: "#FFFCF7" }}
    >
      {/* Header skeleton */}
      <header className="fixed top-0 left-0 w-full z-50 bg-transparent border-b border-transparent">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="h-6 w-36 animate-pulse rounded bg-stone-800/30" />
          <nav className="hidden md:flex gap-7">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-3 w-14 animate-pulse rounded bg-stone-800/30"
              />
            ))}
          </nav>
          <div className="h-9 w-24 animate-pulse rounded-sm bg-stone-800/40" />
        </div>
      </header>

      <main>
        {/* Hero skeleton */}
        <section className="relative min-h-[86vh] flex items-center overflow-hidden pt-20 pb-16">
          <div className="absolute inset-0 bg-[#f6f3ee] animate-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.9),_transparent_45%)]" />
          <div className="relative z-10 max-w-[1400px] mx-auto px-6 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center gap-10">
              <div className="space-y-6">
                <div className="h-1 w-12 bg-stone-300" />
                <div className="h-14 w-full max-w-xl animate-pulse rounded bg-stone-200" />
                <div className="h-5 w-3/4 animate-pulse rounded bg-stone-200" />
                <div className="flex gap-3 pt-2">
                  <div className="h-12 w-36 animate-pulse rounded-sm bg-stone-200" />
                  <div className="h-12 w-36 animate-pulse rounded-sm border-2 border-stone-200 bg-white/70" />
                </div>
              </div>
              <div className="hidden lg:flex justify-center">
                <div className="aspect-square w-64 rounded-2xl bg-stone-200 animate-pulse" />
              </div>
            </div>
          </div>
        </section>

        {/* Featured section skeleton */}
        <section className="py-16 md:py-24 bg-stone-50/60">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="mb-10">
              <div className="h-1 w-12 bg-stone-300 mb-4" />
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div className="h-12 w-64 animate-pulse rounded bg-stone-200" />
                <div className="h-4 w-36 animate-pulse rounded bg-stone-200" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-sm border border-stone-200 bg-white"
                >
                  <div className="aspect-[4/3] bg-stone-200 animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 w-full animate-pulse rounded bg-stone-200" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200/80" />
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4].map((j) => (
                        <div
                          key={j}
                          className="h-8 w-12 animate-pulse rounded bg-stone-200"
                        />
                      ))}
                    </div>
                    <div className="border-t border-stone-100 pt-4 flex justify-between">
                      <div className="h-8 w-20 animate-pulse rounded bg-stone-200" />
                      <div className="h-10 w-10 animate-pulse rounded-sm bg-stone-200" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About section skeleton */}
        <section className="py-16 md:py-24 px-6">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="aspect-video bg-stone-200 animate-pulse rounded-2xl" />
              <div className="space-y-4">
                <div className="h-1 w-12 bg-stone-300" />
                <div className="h-10 w-3/4 animate-pulse rounded bg-stone-200" />
                <div className="space-y-2 pt-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-4 w-full animate-pulse rounded bg-stone-200/80"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer skeleton */}
        <footer className="border-t border-stone-200 py-12 px-6 bg-white">
          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between gap-6">
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
      </main>
    </div>
  );
}
