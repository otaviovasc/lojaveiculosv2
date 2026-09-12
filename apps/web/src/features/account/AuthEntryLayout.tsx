import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "../../components/ui/logo";

export function AuthEntryLayout({
  children,
  description,
  features,
  title,
}: {
  children: ReactNode;
  description: string;
  features?: string[];
  title: string;
}) {
  return (
    <main className="account-auth-shell">
      <div aria-hidden="true" className="account-auth-glow" />
      <div className="account-auth-grid">
        <div className="account-auth-brand">
          <div className="onboarding-logo">
            <Logo className="h-10 onboarding-logo-light" variant="full" />
            <Logo className="h-10 onboarding-logo-dark" variant="full-white" />
          </div>
          <div className="space-y-3">
            <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
              {title}
            </h1>
            <p className="text-sm lg:text-base font-medium text-muted max-w-md leading-relaxed">
              {description}
            </p>
          </div>
          {features && features.length > 0 ? (
            <ul className="account-auth-features">
              {features.map((feature) => (
                <li className="account-feature-item" key={feature}>
                  <Check aria-hidden="true" className="account-feature-icon" />
                  <span className="text-sm font-medium text-muted">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="account-auth-card">{children}</div>
      </div>
    </main>
  );
}
