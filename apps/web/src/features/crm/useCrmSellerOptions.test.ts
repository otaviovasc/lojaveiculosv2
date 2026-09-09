// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCrmSellerOptions } from "./useCrmSellerOptions";

describe("useCrmSellerOptions", () => {
  it("loads and formats active store members on mount", async () => {
    const loader = vi.fn().mockResolvedValue({
      members: [
        {
          email: "joao@loja.com",
          name: "João Silva",
          role: "salesman",
          userId: "user-1",
        },
        {
          email: "maria@loja.com",
          name: null,
          role: "owner",
          userId: "user-2",
        },
      ],
    });

    const { result } = renderHook(() => useCrmSellerOptions(true, loader));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.members).toEqual([
      {
        email: "joao@loja.com",
        id: "user-1",
        name: "João Silva",
        role: "salesman",
      },
      {
        email: "maria@loja.com",
        id: "user-2",
        name: "maria@loja.com",
        role: "owner",
      },
    ]);
  });

  it("handles member load failure and allows retry to succeed", async () => {
    let attempt = 0;
    const loader = vi.fn().mockImplementation(async () => {
      attempt++;
      if (attempt === 1) {
        throw new Error("Network error loading members");
      }
      return {
        members: [
          {
            email: "joao@loja.com",
            name: "João Silva",
            role: "salesman",
            userId: "user-1",
          },
        ],
      };
    });

    const { result } = renderHook(() => useCrmSellerOptions(true, loader));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Network error loading members");
    expect(result.current.members).toEqual([]);

    act(() => {
      result.current.retry();
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.members).toHaveLength(1);
    expect(result.current.members[0]?.id).toBe("user-1");
  });

  it("does not trigger load when disabled", () => {
    const loader = vi.fn();
    const { result } = renderHook(() => useCrmSellerOptions(false, loader));

    expect(result.current.isLoading).toBe(false);
    expect(loader).not.toHaveBeenCalled();
    expect(result.current.members).toEqual([]);
  });
});
