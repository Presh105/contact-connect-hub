import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { fetchShareSettings, type ShareSettings } from "@/lib/share-gate";

/** Shrinks a phone photo to max 1080px JPEG so uploads stay small. */
async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1080 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error("Could not read image"))), "image/jpeg", 0.85),
  );
}

export function AdminShareSettings() {
  const [s, setS] = useState<ShareSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchShareSettings().then(setS);
  }, []);

  if (!s) return null;
  const set = (p: Partial<ShareSettings>) => setS({ ...s, ...p });

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await compress(file);
      const path = `share-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("site-assets")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      set({ imageUrl: data.publicUrl });
      toast.success("Picture uploaded. Tap Save to apply.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!s) return;
    if (s.enabled && !/^https?:\/\//i.test(s.link)) {
      return toast.error("Link must start with https://");
    }
    setBusy(true);
    const rows = [
      { key: "share_enabled", value: String(s.enabled) },
      { key: "share_link", value: s.link.trim() },
      { key: "share_image_url", value: s.imageUrl.trim() },
      { key: "share_message", value: s.message.trim() },
      { key: "share_note", value: s.note.trim() },
    ];
    const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
    setBusy(false);
    if (error) return toast.error(error.message);
    await logAudit("admin_update_share_settings", { enabled: s.enabled });
    toast.success("Share settings saved");
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">WhatsApp Status share step</h2>
          <p className="text-sm text-muted-foreground">
            People must share to their WhatsApp Status before a download unlocks.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <input type="checkbox" checked={s.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          Turn on
        </label>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Link people will share</label>
        <Input placeholder="https://statusconnect.com.ng" value={s.link} onChange={(e) => set({ link: e.target.value })} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Picture (shown around the site and in the share pop-up)</label>
        {s.imageUrl && <img src={s.imageUrl} alt="" className="w-full max-w-xs rounded-lg border" />}
        <Input type="file" accept="image/*" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
        <Input placeholder="…or paste an image link" value={s.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Status message (what gets posted)</label>
        <Textarea rows={3} value={s.message} onChange={(e) => set({ message: e.target.value })} />
        <p className="text-xs text-muted-foreground">The link is added automatically under this message.</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Small note shown beside the button</label>
        <Textarea rows={4} value={s.note} onChange={(e) => set({ note: e.target.value })} />
      </div>

      <Button onClick={save} disabled={busy}>{busy ? "Working…" : "Save share settings"}</Button>
    </div>
  );
}
