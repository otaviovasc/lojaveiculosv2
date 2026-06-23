import type { ReactNode } from "react";
import type { DashboardContentEntryOptions } from "../features/analytics/dashboardHomeAnimation";
import { getDashboardContentEntryConfig } from "../features/analytics/dashboardHomeAnimation";
import AnimatedContent from "./ui/AnimatedContent";

type DashboardHomeEntryProps = DashboardContentEntryOptions & {
  children: ReactNode;
  className?: string;
  delay: number;
  trigger?: "mount" | "scroll";
};

export function DashboardHomeEntry({
  children,
  className,
  delay,
  trigger = "mount",
  ...options
}: DashboardHomeEntryProps) {
  return (
    <AnimatedContent
      {...getDashboardContentEntryConfig(delay, options)}
      className={className}
      trigger={trigger}
    >
      {children}
    </AnimatedContent>
  );
}
