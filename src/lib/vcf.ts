export interface VcfContact {
  contact_seq: number;
  phone: string;
}

/** Status Connect administrator numbers — included in every generated VCF. */
export const ADMIN_CONTACTS: { name: string; phone: string }[] = [
  { name: "StatusConnect-Administrator", phone: "+2348139667218" },
  { name: "StatusConnect-Administrator", phone: "+2349116536969" },
];

function formatName(seq: number) {
  return `Status Connect ${seq.toString().padStart(6, "0")}`;
}

/** Digits-only comparison key so 0813..., +234813..., 234813... all match. */
export function phoneKey(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function card(name: string, phone: string) {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${name};;;;`,
    `FN:${name}`,
    `TEL;TYPE=CELL:${phone}`,
    "END:VCARD",
  ];
}

// VCF 3.0 valid for Android / Google Contacts import.
export function generateVcf(contacts: VcfContact[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];

  // Administrators always come first.
  for (const a of ADMIN_CONTACTS) {
    const key = phoneKey(a.phone);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    lines.push(...card(a.name, a.phone));
  }

  for (const c of contacts) {
    const phone = c.phone.trim();
    const key = phoneKey(phone);
    if (!phone || !key || seen.has(key)) continue;
    seen.add(key);
    lines.push(...card(formatName(c.contact_seq), phone));
  }
  return lines.join("\r\n") + "\r\n";
}

/** Named VCF (used for Premium reciprocal network exports). */
export function generateNamedVcf(entries: { name: string; phone: string }[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const a of ADMIN_CONTACTS) {
    const key = phoneKey(a.phone);
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(...card(a.name, a.phone));
  }
  for (const e of entries) {
    const key = phoneKey(e.phone);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    lines.push(...card(e.name, e.phone));
  }
  return lines.join("\r\n") + "\r\n";
}

export function downloadVcf(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
