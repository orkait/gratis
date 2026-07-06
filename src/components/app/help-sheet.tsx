"use client";
import { Dialog } from "@base-ui-components/react/dialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { X } from "lucide-react";
import { KEYBINDINGS } from "@/lib/keybindings";

export function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="fixed right-0 top-0 z-[71] flex h-dvh w-full max-w-[400px] flex-col bg-(--color-surface-1) border-l border-(--color-border) shadow-[0_0_60px_rgb(0_0_0_/_0.45)] transition-transform duration-250 ease-out data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full motion-reduce:transition-none focus:outline-none">
          <header className="flex items-center justify-between px-5 py-4 border-b border-(--color-border) shrink-0">
            <Dialog.Title className="text-[14px] font-semibold">Keyboard shortcuts</Dialog.Title>
            <Dialog.Close render={<Button variant="ghost" size="icon" aria-label="Close"><X className="w-4 h-4" /></Button>} />
          </header>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-1">
              {KEYBINDINGS.map((b) => (
                <div key={b.id} className="h-8 px-2 rounded-md flex items-center justify-between hover:bg-(--color-surface-2)">
                  <span className="text-[13px] text-(--color-fg-muted)">{b.description}</span>
                  <span className="flex gap-1">{b.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
                </div>
              ))}
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
