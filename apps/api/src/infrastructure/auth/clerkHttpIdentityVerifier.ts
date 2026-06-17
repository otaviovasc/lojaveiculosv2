import { verifyToken } from "@clerk/backend";
import type { Context } from "hono";
import type { HttpIdentityVerifier } from "../http/httpIdentityVerifier.js";

export type CreateClerkHttpIdentityVerifierOptions = {
  audience?: string | readonly string[];
  authorizedParties?: readonly string[];
  jwtKey?: string;
  secretKey: string;
};

export function createClerkHttpIdentityVerifier(
  options: CreateClerkHttpIdentityVerifierOptions,
): HttpIdentityVerifier {
  return {
    async verify(context: Context) {
      const token = readBearerToken(context);
      if (!token) return null;

      const payload = await verifyToken(token, {
        ...(options.audience
          ? { audience: [...toArray(options.audience)] }
          : {}),
        ...(options.authorizedParties
          ? { authorizedParties: [...options.authorizedParties] }
          : {}),
        ...(options.jwtKey ? { jwtKey: options.jwtKey } : {}),
        secretKey: options.secretKey,
      });

      if (!payload.sub) {
        throw new Error("Clerk token is missing subject.");
      }

      return { clerkUserId: payload.sub };
    },
  };
}

function readBearerToken(context: Context): string | null {
  const authorization = context.req.header("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

function toArray(value: string | readonly string[]): string[] {
  return typeof value === "string" ? [value] : [...value];
}
