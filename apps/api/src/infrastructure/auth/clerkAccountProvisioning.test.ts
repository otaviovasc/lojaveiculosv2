import { createClerkClient } from "@clerk/backend";
import { describe, expect, it, vi } from "vitest";
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
});
