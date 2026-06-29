"use client";

/**
 * Skeleton loading state for Aurora home template.
 * Mirrors the layout: header, hero, featured section, about, contact, footer.
 */
export function AuroraTemplateSkeleton() {
  return (
    <div
      className="min-h-screen selection:bg-brand/20"
      style={{ backgroundColor: "#F8F5F0" }}
    >
      {/* Header skeleton */}
      <header className="fixed top-0 left-0 w-full z-50 bg-transparent border-b border-transparent">
        <div className="max-w-[1600px] mx-auto px-6 py-4 md:px-12 flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse rounded bg-white/30" />
          <nav className="hidden md:flex gap-10">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-3 w-12 animate-pulse rounded bg-white/30"
              />
            ))}
          </nav>
          <div className="h-10 w-28 animate-pulse rounded-full bg-white/40" />
        </div>
      </header>

      <main>
        {/* Hero skeleton */}
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden text-center px-6 md:px-12 -mt-16 pt-16">
          <div className="absolute inset-0 bg-[#f3f1ec] animate-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_transparent_55%)]" />
          <div className="relative z-10 max-w-5xl space-y-8">
            <div className="h-4 w-40 animate-pulse rounded mx-auto bg-stone-200" />
            <div className="h-14 w-96 max-w-full animate-pulse rounded mx-auto bg-stone-200" />
            <div className="h-6 w-72 max-w-full animate-pulse rounded mx-auto bg-stone-200" />
            <div className="flex justify-center gap-4 pt-4">
              <div className="h-12 w-40 animate-pulse rounded-full bg-stone-200" />
              <div className="h-12 w-40 animate-pulse rounded-full border-2 border-stone-200 bg-white/70" />
            </div>
          </div>
        </section>

        {/* Featured section skeleton */}
        <section className="px-6 py-24 md:py-32 md:px-12 max-w-[1600px] mx-auto">
          <div className="mb-16 flex flex-col md:flex-row items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="h-4 w-32 animate-pulse rounded bg-stone-200" />
              <div className="h-12 w-64 animate-pulse rounded bg-stone-200" />
            </div>
            <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
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
        </section>

        {/* About section skeleton */}
        <section className="px-6 py-24 md:py-32 md:px-12 max-w-[1600px] mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="aspect-video bg-stone-200 animate-pulse rounded-3xl" />
            <div className="space-y-4">
              <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
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
        </section>

        {/* Footer skeleton */}
        <footer className="border-t border-stone-200/80 py-12 px-6 md:px-12 bg-white/50">
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
      </main>
    </div>
  );
}
