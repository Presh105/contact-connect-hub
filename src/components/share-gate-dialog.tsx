import { useEffect, useState } from "react";
import { Share2, Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { loadShareImage, shareToStatus, type ShareSettings } from "@/lib/share-gate";

const WAIT = 6; // seconds before the download unlocks after sharing

export function ShareGateDialog({
  open,
  onOpenChange,
  settings,
  onContinue,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  settings: ShareSettings;
  onContinue: () => void;
}) {
  const [image, setImage] = useState<File | null>(null);
  const [left, setLeft] = useState<number | null>(null); // null = not shared yet

  // Preload picture while the dialog opens so the share tap is instant
  useEffect(() => {
    if (!open) {
      setLeft(null);
      return;
    }
    let alive = true;
    loadShareImage(settings.imageUrl).then((f) => alive && setImage(f));
    return () => {
      alive = false;
    };
  }, [open, settings.imageUrl]);

  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = setTimeout(() => setLeft((x) => (x === null ? x : x - 1)), 1000);
    return () => clearTimeout(t);
  }, [left]);

  async function share() {
    const r = await shareToStatus(settings, image);
    if (r !== "cancelled") setLeft(WAIT);
  }

  const unlocked = left === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> One quick step
          </DialogTitle>
          <DialogDescription>Share to your WhatsApp Status, then download.</DialogDescription>
        </DialogHeader>

        {settings.imageUrl && (
          <img
            src={settings.imageUrl}
            alt="Status Connect"
            className="w-full rounded-lg border object-cover max-h-56"
          />
        )}

        <p className="text-sm text-muted-foreground leading-relaxed">{settings.note}</p>

        <div className="space-y-2">
          <Button className="w-full" size="lg" onClick={share} disabled={left !== null && left > 0}>
            <Share2 className="mr-2 h-4 w-4" />
            {left === null ? "Share to WhatsApp Status" : "Share again"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            In the share menu choose <b>WhatsApp → My status</b>.
          </p>

          <Button
            className="w-full"
            size="lg"
            variant={unlocked ? "default" : "secondary"}
            disabled={!unlocked}
            onClick={() => {
              onOpenChange(false);
              onContinue();
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            {left === null
              ? "Share first to unlock download"
              : left > 0
                ? `Unlocking in ${left}s…`
                : "Download my contacts"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
