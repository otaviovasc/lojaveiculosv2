"use client";

interface StepContentProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function StepContent({
  icon: Icon,
  title,
  description,
  children,
}: StepContentProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand border border-brand/20 shadow-sm">
          <Icon className="size-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold font-display">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-3xl p-6 md:p-10 shadow-sm shadow-black/2">
        {children}
      </div>
    </div>
  );
}
