import { ShieldAlert } from "lucide-react";

/** The vault's honest limits, stated where the user is about to trust it. */
export function VaultNotice() {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-md border border-(--color-border) bg-(--color-surface-1) p-3 text-[12px] text-(--color-fg-muted)">
      <ShieldAlert className="w-4 h-4 mt-px shrink-0" />
      <span>
        This is a local vault, not a login. It protects your keys at rest, on this device. Anyone who
        can run scripts on this page while it is unlocked can read them, so pick a strong passphrase
        and lock when you are done. There is no recovery: lose it and you re-enter the keys.
      </span>
    </div>
  );
}
