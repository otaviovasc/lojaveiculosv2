export function AspectThumbnail({
  type,
  active,
}: {
  type: string;
  active: boolean;
}) {
  const activeClass = active
    ? "border-accent bg-accent/15"
    : "border-muted/40 bg-muted/5 group-hover:border-muted-strong/50 group-hover:bg-muted/10";
  return (
    <div className="flex size-8 items-center justify-center" aria-hidden="true">
      {type === "wide" && (
        <div
          className={`w-6.5 h-3.5 border rounded-[3px] transition-all ${activeClass}`}
        />
      )}
      {type === "square" && (
        <div
          className={`w-4.5 h-4.5 border rounded-[3px] transition-all ${activeClass}`}
        />
      )}
      {type === "portrait" && (
        <div
          className={`w-3.5 h-6 border rounded-[3px] transition-all ${activeClass}`}
        />
      )}
      {type === "banner" && (
        <div
          className={`w-7 h-2 border rounded-[2px] transition-all ${activeClass}`}
        />
      )}
      {type === "original" && (
        <div
          className={`w-5.5 h-4.5 border border-dashed rounded-[3px] transition-all ${activeClass}`}
        />
      )}
    </div>
  );
}
