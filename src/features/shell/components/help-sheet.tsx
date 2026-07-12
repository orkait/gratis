"use client";
import { useCallback } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { X } from "lucide-react";
import { KEYBINDINGS } from "@/lib/keybindings";

export function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) onClose();
    },
    [onClose],
  );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-(--z-modal-backdrop) bg-black/50 backdrop-blur-overlay transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="fixed right-0 top-0 z-(--z-modal) flex h-dvh w-full max-w-popover flex-col bg-(--color-surface-1) border-l border-(--color-border) shadow-drawer transition-transform duration-250 ease-out data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full motion-reduce:transition-none focus:outline-none">
          <header className="flex items-center justify-between px-5 py-4 border-b border-(--color-border) shrink-0">
            <Dialog.Title className="text-base font-semibold">Keyboard shortcuts</Dialog.Title>
            <Dialog.Close render={<Button variant="ghost" size="icon" aria-label="Close"><X className="w-4 h-4" /></Button>} />
          </header>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-1">
              {KEYBINDINGS.map((binding) => (
                <div
                  key={binding.id}
                  className="h-8 px-2 rounded-md flex items-center justify-between hover:bg-(--color-surface-2)"
                >
                  <span className="text-sm text-(--color-fg-muted)">{binding.description}</span>
                  <span className="flex gap-1">
                    {binding.keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
