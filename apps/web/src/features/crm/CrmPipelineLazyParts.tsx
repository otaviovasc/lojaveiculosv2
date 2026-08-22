import { lazy } from "react";

export const CrmPipelineModule = lazy(() =>
  import("./CrmPipelineModule").then((module) => ({
    default: module.CrmPipelineModule,
  })),
);
