import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const AD_SRC = "https://quge5.com/88/tag.min.js";
const AD_ZONE = "269656";

/** Loads the ad tag for everyone except Premium members (ad-free benefit). */
export function AdScript() {
  const { membership, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${AD_SRC}"]`);

    if (membership === "premium") {
      existing?.remove();
      return;
    }
    if (existing) return;

    const s = document.createElement("script");
    s.src = AD_SRC;
    s.async = true;
    s.dataset.zone = AD_ZONE;
    s.setAttribute("data-cfasync", "false");
    document.head.appendChild(s);
  }, [membership, loading]);

  return null;
}
