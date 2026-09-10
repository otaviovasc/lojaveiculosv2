import { createClerkClient } from "@clerk/backend";
import { describe, expect, it, vi } from "vitest";
import {
  AccountProvisioningProviderError,
  providerErrorLogFields,
} from "../../domains/identity/services/AccountProvisioningService/serviceSupport.js";
import { createClerkInvitationSender } from "./clerkAccountProvisioning.js";

vi.mock("@clerk/backend", () => ({
  createClerkClient: vi.fn(),
}));

describe("createClerkInvitationSender", () => {
  it("requests Clerk delivery and preserves the secure acceptance URL", async () => {
    const createInvitation = vi.fn(async () => ({
      id: "inv_clerk_1",
      url: "https://example.accounts.dev/sign-up?__clerk_ticket=ticket_1",
    }));
    vi.mocked(createClerkClient).mockReturnValue({
      invitations: { createInvitation },
    } as never);
    const sender = createClerkInvitationSender({
      redirectUrl: "https://app.example.com/auth/session",
      secretKey: "sk_test_example",
    });

    await expect(
      sender.send({
        email: "seller@example.com",
        invitationId: "invitation_1",
        metadata: { role: "salesman" },
      }),
    ).resolves.toEqual({
      acceptUrl: "https://example.accounts.dev/sign-up?__clerk_ticket=ticket_1",
      clerkInvitationId: "inv_clerk_1",
    });
    expect(createInvitation).toHaveBeenCalledWith({
      emailAddress: "seller@example.com",
      notify: true,
      publicMetadata: { role: "salesman" },
      redirectUrl: "https://app.example.com/auth/session",
    });
  });

  it("wraps Clerk rejections with safe provider details", async () => {
    const clerkError = Object.assign(new Error("request failed"), {
      clerkTraceId: "trace_123",
      errors: [
        {
          code: "duplicate_record",
          message: "seller@example.com already has an invitation",
        },
      ],
      status: 422,
    });
    const createInvitation = vi.fn(async () => {
      throw clerkError;
    });
    vi.mocked(createClerkClient).mockReturnValue({
      invitations: { createInvitation },
    } as never);
    const sender = createClerkInvitationSender({
      secretKey: "sk_test_example",
    });

    const failure = await sender
      .send({
        email: "seller@example.com",
        invitationId: "invitation_1",
        metadata: { role: "salesman" },
      })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AccountProvisioningProviderError);
    const providerError = failure as AccountProvisioningProviderError;
    expect(providerError.details).toEqual({
      clerkTraceId: "trace_123",
      providerErrorCodes: ["duplicate_record"],
      providerStatus: 422,
    });
    expect(providerError.message).toContain("duplicate_record");
    expect(providerError.message).not.toContain("seller@example.com");
    expect(providerErrorLogFields(providerError)).toEqual({
      clerkTraceId: "trace_123",
      providerErrorCodes: ["duplicate_record"],
      providerStatus: 422,
    });
  });
});
