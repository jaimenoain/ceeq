import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LogoutButton } from "../components/logout-button";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/browser";
import { SupabaseClient } from "@supabase/supabase-js";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/browser", () => ({
  createClient: vi.fn(),
}));

describe("LogoutButton", () => {
  const mockPush = vi.fn();
  const mockRefresh = vi.fn();
  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
      back: vi.fn(),
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });
    vi.mocked(createClient).mockReturnValue({
      auth: {
        signOut: mockSignOut,
      },
    } as unknown as SupabaseClient);
  });

  it("renders correctly with default text", () => {
    render(<LogoutButton />);
    expect(screen.getByRole("button", { name: "Logout" })).toBeDefined();
  });

  it("renders correctly with custom text", () => {
    render(<LogoutButton>Sign Out</LogoutButton>);
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeDefined();
  });

  it("calls signOut and redirects on click", async () => {
    render(<LogoutButton />);
    const button = screen.getByRole("button", { name: "Logout" });

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("disables button while loading", async () => {
    // Make signOut take some time
    mockSignOut.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<LogoutButton />);
    const button = screen.getByRole("button", { name: "Logout" });

    fireEvent.click(button);

    expect(button.hasAttribute("disabled")).toBe(true);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
