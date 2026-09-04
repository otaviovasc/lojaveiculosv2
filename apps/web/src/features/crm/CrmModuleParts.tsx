import { lazy, Suspense, type ReactNode } from "react";
import { CrmInboxSkeleton } from "./CrmSkeletons";

export const CrmInbox = lazy(() =>
  import("./CrmInbox").then((module) => ({
    default: module.CrmInbox,
  })),
);

export function CrmSurfaceBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<CrmInboxSkeleton />}>{children}</Suspense>;
}
