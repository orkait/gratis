"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { Lock, LockOpen, KeyRound } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/config/routes";
import { useVaultStore } from "@/stores/vault-store";
import { useVaultStatus } from "../hooks/use-vault-status";
import { cn } from "@/lib/utils";

/** Vault state, visible on EVERY surface, with an unlock that does not make you leave the page.
 *
 * The vault is in-memory by design, so a reload locks it. Before this, nothing in the UI said so:
 * you reloaded, went to chat, typed a message, sent it, and learned from a backend 401 that your
 * keys were gone. The status is now permanent chrome, and the fix is one click from wherever you are.
 */

const WRONG_PASSPHRASE = "Wrong passphrase.";

const TONE = {
  unlocked: "text-(--color-success)",
  locked: "text-(--color-warning)",
  empty: "text-(--color-fg-subtle)",
  loading: "text-(--color-fg-subtle)",
} as const;

const LABEL = {
  unlocked: "Keys unlocked",
  locked: "Keys locked",
  empty: "No keys",
  loading: "…",
} as const;

export function VaultIndicator() {
  const status = useVaultStatus();
  const unlock = useVaultStore((s) => s.unlock);
  const lock = useVaultStore((s) => s.lock);

  const [open, setOpen] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openDialog = useCallback(() => setOpen(true), []);
  const closeDialog = useCallback(() => {
    setOpen(false);
    setPassphrase("");
    setError(null);
  }, []);

  const handlePassphrase = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassphrase(e.target.value);
  }, []);

  const handleUnlock = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      try {
        await unlock(passphrase);
        closeDialog();
      } catch {
        setError(WRONG_PASSPHRASE);
      }
    },
    [unlock, passphrase, closeDialog],
  );

  const submitUnlock = useCallback((e: React.FormEvent) => void handleUnlock(e), [handleUnlock]);

  // Base UI hands back the NEXT open state. Only act on close, or reopening would immediately shut.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) closeDialog();
    },
    [closeDialog],
  );

  // Unlocked -> clicking locks it again. Locked -> clicking offers the passphrase. Empty -> Settings.
  const handleClick = useCallback(() => {
    if (status === "unlocked") return lock();
    if (status === "locked") return openDialog();
  }, [status, lock, openDialog]);

  if (status === "loading") return null;

  if (status === "empty") {
    return (
      <Link
        href={ROUTES.settings}
        title="No API keys stored. Add one to run a model."
        className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md border border-(--color-border) bg-(--color-surface-1) text-xs text-(--color-fg-subtle) hover:bg-(--color-surface-2) transition-colors"
      >
        <KeyRound className="w-3.5 h-3.5" />
        {LABEL.empty}
      </Link>
    );
  }

  const Icon = status === "unlocked" ? LockOpen : Lock;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={status === "unlocked" ? "Keys unlocked. Click to lock." : "Keys locked. Click to unlock."}
        className={cn(
          "inline-flex items-center gap-1.5 h-7 px-2 rounded-md border border-(--color-border) bg-(--color-surface-1) text-xs hover:bg-(--color-surface-2) transition-colors cursor-pointer",
          TONE[status],
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        {LABEL[status]}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="p-5">
          <form onSubmit={submitUnlock} className="space-y-3">
            <div>
              <div className="text-base font-semibold">Unlock your keys</div>
              <div className="text-sm text-(--color-fg-muted) mt-1">
                Your keys are encrypted in this browser. They unlock for this tab only.
              </div>
            </div>

            <Input
              type="password"
              autoFocus
              value={passphrase}
              onChange={handlePassphrase}
              placeholder="Passphrase"
            />

            {error ? <div className="text-xs text-(--color-danger)">{error}</div> : null}

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit">
                <LockOpen className="w-3.5 h-3.5" /> Unlock
              </Button>
              <Button type="button" variant="ghost" onClick={closeDialog}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
