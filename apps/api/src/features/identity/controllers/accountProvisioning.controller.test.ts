import { describe, expect, it, vi } from "vitest";
import type { InvitationSender } from "../../../domains/identity/ports/accountProvisioningRepository.js";
import {
  agencyInvitationId,
  createFeature,
  createRepository,
  invitationId,
  profile,
} from "./accountProvisioning.controller.testSupport.js";

describe("account provisioning routes", () => {
  it("bootstraps a Clerk user without requiring store scope", async () => {
    const repository = createRepository();
    const app = createFeature(repository);

    const response = await app.request("/session/bootstrap");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({ needsOnboarding: true }),
    );
    expect(repository.findSessionBootstrap).toHaveBeenCalledWith(profile);
  });

  it("creates owner first store with trial entitlements", async () => {
    const repository = createRepository();
    const app = createFeature(repository);

    const response = await app.request("/onboarding/owner-store", {
      body: JSON.stringify({
        publicSlug: "auto-prime",
        storeTradingName: "Auto Prime",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(repository.createOwnerStore).toHaveBeenCalledWith(
      expect.objectContaining({
        entitlements: [
          "analytics",
          "automation",
          "crm",
          "marketplace",
          "plate_lookup",
          "subdomain",
        ],
        publicSlug: "auto-prime",
        storeTradingName: "Auto Prime",
        user: profile,
      }),
    );
  });

  it("rejects agency creation for non-platform admins", async () => {
    const repository = createRepository({ platformAdmin: false });
    const app = createFeature(repository);

    const response = await app.request("/admin/agencies", {
      body: JSON.stringify({
        tenantSlug: "agency-one",
        tenantTradingName: "Agency One",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(403);
  });

  it("creates and sends store invitations from store-scoped context", async () => {
    const repository = createRepository();
    const invitationSender = {
      send: vi.fn(async () => ({ clerkInvitationId: "clerk_inv_1" })),
    };
    const app = createFeature(repository, invitationSender);

    const response = await app.request("/identity/invitations", {
      body: JSON.stringify({
        email: "seller@example.com",
        role: "salesman",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(invitationSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "seller@example.com",
        invitationId,
      }),
    );
    expect(repository.markInvitationSent).toHaveBeenCalledWith({
      allowedStatuses: ["pending"],
      clerkInvitationId: "clerk_inv_1",
      invitationId,
    });
  });

  it("rejects owner invitations from owner-scoped store actors", async () => {
    const repository = createRepository({ storeRole: "owner" });
    const app = createFeature(repository);

    const response = await app.request("/identity/invitations", {
      body: JSON.stringify({
        email: "owner-2@example.com",
        role: "owner",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(403);
    expect(repository.createStoreInvitation).not.toHaveBeenCalled();
  });

  it("allows agency-scoped store actors to invite store owners", async () => {
    const repository = createRepository({ storeRole: "agency" });
    const app = createFeature(repository);

    const response = await app.request("/identity/invitations", {
      body: JSON.stringify({
        email: "owner-2@example.com",
        role: "owner",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(repository.createStoreInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ role: "owner" }),
    );
  });

  it("returns send_failed store invitations when Clerk send fails", async () => {
    const repository = createRepository();
    const invitationSender = {
      send: vi.fn(async () => {
        throw new Error("Clerk unavailable");
      }),
    };
    const app = createFeature(repository, invitationSender);

    const response = await app.request("/identity/invitations", {
      body: JSON.stringify({
        email: "seller@example.com",
        role: "salesman",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(
      expect.objectContaining({ id: invitationId, status: "send_failed" }),
    );
    expect(repository.markInvitationSendFailed).toHaveBeenCalledWith({
      invitationId,
    });
    expect(repository.markInvitationSent).not.toHaveBeenCalled();
  });

  it("keeps agency creation successful when the optional invite send fails", async () => {
    const repository = createRepository();
    repository.createAgency.mockResolvedValueOnce({
      invitationId: agencyInvitationId,
      invitationStatus: "pending",
      tenantId: "tenant_agency" as never,
      tenantName: "Agency One",
      tenantSlug: "agency-one",
    });
    const invitationSender = {
      send: vi.fn(async () => {
        throw new Error("Clerk unavailable");
      }),
    };
    const app = createFeature(repository, invitationSender);

    const response = await app.request("/admin/agencies", {
      body: JSON.stringify({
        firstUser: { email: "agency@example.com" },
        tenantSlug: "agency-one",
        tenantTradingName: "Agency One",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        invitationId: agencyInvitationId,
        invitationStatus: "send_failed",
      }),
    );
    expect(repository.markInvitationSendFailed).toHaveBeenCalledWith({
      invitationId: agencyInvitationId,
    });
  });

  it("resends a failed identity invitation", async () => {
    const repository = createRepository();
    const send = vi.fn<InvitationSender["send"]>(async () => ({
      clerkInvitationId: "clerk_inv_resend",
    }));
    const invitationSender = {
      send,
    };
    const app = createFeature(repository, invitationSender);

    const response = await app.request(
      `/identity/invitations/${invitationId}/resend`,
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "seller@example.com",
        invitationId,
      }),
    );
    expect(send.mock.calls[0]?.[0].metadata).toEqual(
      expect.objectContaining({ resend: true }),
    );
    expect(repository.markInvitationSent).toHaveBeenCalledWith({
      allowedStatuses: ["expired", "pending", "send_failed", "sent"],
      clerkInvitationId: "clerk_inv_resend",
      invitationId,
    });
    expect(await response.json()).toEqual(
      expect.objectContaining({ id: invitationId, status: "sent" }),
    );
  });
});
