// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { VaultIndicator } from "./vault-indicator";
import { useVaultStore } from "@/stores/vault-store";
import { clearVault } from "../lib/vault-db";
import { ROUTES } from "@/config/routes";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => ROUTES.market,
}));

beforeEach(async () => {
  await clearVault();
  useVaultStore.setState({ status: "loading", secrets: {} });
  global.matchMedia ||= ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof matchMedia;
});

afterEach(cleanup);

describe("vault indicator", () => {
  it("tells you there are no keys instead of staying silent", async () => {
    render(<VaultIndicator />);
    // init() runs on mount from anywhere now - it used to run ONLY on the settings page, so every
    // other surface sat at "loading" forever and never knew the vault state.
    await waitFor(() => expect(screen.getByText(/no keys/i)).toBeTruthy());
  });

  it("shows LOCKED when a vault exists but is not unlocked", async () => {
    await useVaultStore.getState().save({ groq: "gsk_test" }, "pass");
    useVaultStore.getState().lock();

    render(<VaultIndicator />);
    await waitFor(() => expect(screen.getByText(/keys locked/i)).toBeTruthy());
  });

  it("unlocks in place, without navigating to settings", async () => {
    await useVaultStore.getState().save({ groq: "gsk_test" }, "correct-pass");
    useVaultStore.getState().lock();

    render(<VaultIndicator />);
    await waitFor(() => expect(screen.getByText(/keys locked/i)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /keys locked/i }));
    fireEvent.change(await screen.findByPlaceholderText(/passphrase/i), {
      target: { value: "correct-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^unlock$/i }));

    await waitFor(() => expect(useVaultStore.getState().status).toBe("unlocked"));
    await waitFor(() => expect(screen.getByText(/keys unlocked/i)).toBeTruthy());
  });

  it("rejects a wrong passphrase and stays locked", async () => {
    await useVaultStore.getState().save({ groq: "gsk_test" }, "correct-pass");
    useVaultStore.getState().lock();

    render(<VaultIndicator />);
    await waitFor(() => expect(screen.getByText(/keys locked/i)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /keys locked/i }));
    fireEvent.change(await screen.findByPlaceholderText(/passphrase/i), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^unlock$/i }));

    await waitFor(() => expect(screen.getByText(/wrong passphrase/i)).toBeTruthy());
    expect(useVaultStore.getState().status).toBe("locked");
  });
});
