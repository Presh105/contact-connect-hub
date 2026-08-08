import { phoneKey } from "@/lib/vcf";

interface PickedContact {
  tel?: string[];
}

interface ContactsManager {
  select: (props: string[], options?: { multiple?: boolean }) => Promise<PickedContact[]>;
  getProperties?: () => Promise<string[]>;
}

function manager(): ContactsManager | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & { contacts?: ContactsManager };
  return nav.contacts && typeof nav.contacts.select === "function" ? nav.contacts : null;
}

export function contactPickerSupported() {
  return manager() !== null;
}

/**
 * Asks the user for permission to read their phone contacts (Contact Picker API)
 * and returns the set of normalised phone keys already saved on the device.
 * Returns null when the user cancels or the API is unavailable.
 */
export async function readExistingPhoneKeys(): Promise<Set<string> | null> {
  const m = manager();
  if (!m) return null;
  try {
    const picked = await m.select(["tel"], { multiple: true });
    if (!picked) return null;
    const keys = new Set<string>();
    for (const c of picked) {
      for (const t of c.tel ?? []) {
        const k = phoneKey(t);
        if (k) keys.add(k);
      }
    }
    return keys;
  } catch {
    return null;
  }
}
