import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ShareSettings = {
  enabled: boolean;
  link: string;
  imageUrl: string;
  message: string;
  note: string;
};

export const SHARE_KEYS = [
  "share_enabled",
  "share_link",
  "share_image_url",
  "share_message",
  "share_note",
] as const;

const DEFAULTS: ShareSettings = {
  enabled: false,
  link: "",
  imageUrl: "",
  message:
    "Get 1000+ quality status viewers on Status Connect 🔥 Join now if you really want to boost your WhatsApp status 👇",
  note:
    "Quick favour 🤝 Status Connect only works because members show up for each other. Please share this to your WhatsApp Status before you download. The more of us who share, the more people join, and the more contacts everyone gets to save. Do it honestly, it keeps the community growing for you too.",
};

export async function fetchShareSettings(): Promise<ShareSettings> {
  const { data } = await supabase
    .from("app_settings")
    .select("key,value")
    .in("key", [...SHARE_KEYS]);
  const m = new Map((data || []).map((r) => [r.key, r.value ?? ""]));
  const get = (k: string, d: string) => (m.get(k)?.trim() ? (m.get(k) as string) : d);
  return {
    enabled: m.get("share_enabled") === "true",
    link: (m.get("share_link") || "").trim(),
    imageUrl: (m.get("share_image_url") || "").trim(),
    message: get("share_message", DEFAULTS.message),
    note: get("share_note", DEFAULTS.note),
  };
}

export function useShareSettings() {
  const [s, setS] = useState<ShareSettings | null>(null);
  useEffect(() => {
    let alive = true;
    fetchShareSettings().then((x) => alive && setS(x)).catch(() => alive && setS(DEFAULTS));
    return () => {
      alive = false;
    };
  }, []);
  return s;
}

/** The gate only applies once the admin has switched it on AND saved a link. */
export const gateActive = (s: ShareSettings | null) => !!s && s.enabled && !!s.link;

export function buildStatusText(s: ShareSettings) {
  const m = s.message.trim();
  return m.includes(s.link) ? m : `${m}\n${s.link}`;
}

/** Downloads the promo picture so it can be attached to the share. */
export async function loadShareImage(url: string): Promise<File | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) return null;
    const b = await r.blob();
    const ext = b.type.includes("png") ? "png" : "jpg";
    return new File([b], `status-connect.${ext}`, { type: b.type || "image/jpeg" });
  } catch {
    return null;
  }
}

/**
 * Opens the phone's share sheet (or WhatsApp) with the predefined message.
 * WhatsApp has no link that opens "My status" directly, so on Android the
 * person picks WhatsApp -> "My status" in the share sheet.
 *  - "shared"    share sheet completed
 *  - "cancelled" person closed the share sheet
 *  - "fallback"  opened WhatsApp via link (cannot tell if they posted)
 */
export async function shareToStatus(
  s: ShareSettings,
  image: File | null,
): Promise<"shared" | "cancelled" | "fallback"> {
  const text = buildStatusText(s);
  const nav = typeof navigator !== "undefined" ? (navigator as any) : null;

  try {
    if (nav?.share) {
      if (image && nav.canShare?.({ files: [image] })) {
        await nav.share({ files: [image], text });
        return "shared";
      }
      await nav.share({ text });
      return "shared";
    }
  } catch (e: any) {
    if (e?.name === "AbortError") return "cancelled";
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  return "fallback";
}
