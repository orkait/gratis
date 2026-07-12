"use client";
import { AppShell, ShellStatus } from "@/features/shell/components/app-shell";
import { ShellOverlays } from "@/features/shell/components/shell-overlays";
import { useShellOverlays } from "@/features/shell/hooks/use-shell-overlays";
import { useVaultForm } from "@/features/vault/hooks/use-vault-form";
import { VaultNotice } from "@/features/vault/components/vault-notice";
import { VaultUnlock } from "@/features/vault/components/vault-unlock";
import { VaultKeyForm } from "@/features/vault/components/vault-key-form";

export default function SettingsPage() {
  const {
    status,
    passphrase,
    draft,
    error,
    saved,
    setPassphrase,
    setSecret,
    submitUnlock,
    submitSave,
    lock,
    destroy,
  } = useVaultForm();
  const { helpOpen, openHelp, closeHelp } = useShellOverlays();

  const locked = status === "locked";

  return (
    <AppShell title="API keys" width="prose" actions={<ShellStatus onHelpClick={openHelp} />}>
      <p className="text-[13px] text-(--color-fg-muted)">
        Your provider keys, encrypted in this browser with your passphrase. They are sent with your
        requests and are never stored on any server.
      </p>

      <VaultNotice />

      {locked ? (
        <VaultUnlock
          passphrase={passphrase}
          error={error}
          onPassphraseChange={setPassphrase}
          onSubmit={submitUnlock}
        />
      ) : (
        <VaultKeyForm
          status={status}
          passphrase={passphrase}
          draft={draft}
          error={error}
          saved={saved}
          onPassphraseChange={setPassphrase}
          onSecretChange={setSecret}
          onSubmit={submitSave}
          onLock={lock}
          onDestroy={destroy}
        />
      )}

      <ShellOverlays helpOpen={helpOpen} onCloseHelp={closeHelp} />
    </AppShell>
  );
}
