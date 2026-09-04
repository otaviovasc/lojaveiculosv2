// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const clerkMocks = vi.hoisted(() => ({
  cleanupPush: vi.fn(async () => undefined),
  openUserProfile: vi.fn(),
  signOut: vi.fn(async () => undefined),
}));

vi.mock("@clerk/react-router", () => ({
  useClerk: () => ({
    openUserProfile: clerkMocks.openUserProfile,
    signOut: clerkMocks.signOut,
  }),
  useUser: () => ({
    isLoaded: true,
    user: {
      fullName: "Maria Silva",
      imageUrl: "https://images.example/avatar.png",
      primaryEmailAddress: { emailAddress: "maria@example.com" },
    },
  }),
}));

vi.mock("./ClerkAuthProvider", () => ({
  useClerkAuthConfiguration: () => ({
    configured: true,
    localAuthBypass: false,
  }),
}));

vi.mock("../crm/push/logoutCleanup", () => ({
  cleanupCrmPushBeforeLogout: clerkMocks.cleanupPush,
}));

import { UserAccountButton } from "./UserAccountButton";

describe("UserAccountButton", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("disables CRM push before Clerk invalidates the session", async () => {
    render(<UserAccountButton />);

    fireEvent.click(screen.getByRole("button", { name: "Sair da conta" }));

    await waitFor(() => expect(clerkMocks.signOut).toHaveBeenCalledOnce());
    expect(clerkMocks.cleanupPush).toHaveBeenCalledOnce();
    expect(clerkMocks.cleanupPush.mock.invocationCallOrder[0]).toBeLessThan(
      clerkMocks.signOut.mock.invocationCallOrder[0] ?? 0,
    );
    expect(clerkMocks.signOut).toHaveBeenCalledWith({
      redirectUrl: "/sign-in",
    });
  });
});
