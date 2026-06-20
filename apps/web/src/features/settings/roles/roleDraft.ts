import type { RoleKey } from "../types";

export type OverrideMode = "allow" | "deny" | "inherit";

export type Draft = {
  overrides: Map<string, OverrideMode>;
  role: RoleKey;
};
