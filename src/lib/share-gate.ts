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

/**
 * Opens WhatsApp directly with the predefined message (no browser share menu).
 * WhatsApp has no link that jumps straight into the Status composer, so the
 * person picks "My status" at the top of WhatsApp's share screen, then taps send.
 * If the WhatsApp app is not installed / does not open, falls back to WhatsApp web link.
 */
export function shareToStatus(s: ShareSettings): void {
  const text = encodeURIComponent(buildStatusText(s));
  const web = `https://api.whatsapp.com/send?text=${text}`;

  if (typeof window === "undefined") return;

  const mobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!mobile) {
    window.open(web, "_blank");
    return;
  }

  // Try the app first; if the page is still visible shortly after, use the web link.
  window.location.href = `whatsapp://send?text=${text}`;
  window.setTimeout(() => {
    if (document.visibilityState === "visible") window.location.href = web;
  }, 1500);
}
