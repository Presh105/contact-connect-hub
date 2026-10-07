import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gateActive, loadShareImage, shareToStatus, useShareSettings } from "@/lib/share-gate";

/** Promo picture + short community note. Shows only when the admin has set it up. */
export function ShareBanner({ className = "" }: { className?: string }) {
  const s = useShareSettings();
  const [busy, setBusy] = useState(false);
  if (!s || !gateActive(s) || !s.imageUrl) return null;

  async function go() {
    if (!s) return;
    setBusy(true);
    try {
      await shareToStatus(s, await loadShareImage(s.imageUrl));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-xl border bg-card overflow-hidden grid sm:grid-cols-[220px_1fr] ${className}`}>
      <img src={s.imageUrl} alt="Status Connect" loading="lazy" className="w-full h-40 sm:h-full object-cover" />
      <div className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">{s.note}</p>
        <Button size="sm" onClick={go} disabled={busy}>
          <Share2 className="mr-2 h-4 w-4" />
          Share to WhatsApp Status
        </Button>
      </div>
    </div>
  );
}
