import type { Context } from "hono";

export type VerifiedHttpIdentity = {
  clerkUserId: string;
  userId?: string;
};

export type HttpIdentityVerifier = {
  verify: (context: Context) => Promise<VerifiedHttpIdentity | null>;
};
