export interface VcfContact {
  contact_seq: number;
  phone: string;
}

function formatName(seq: number) {
  return `Status Connect ${seq.toString().padStart(6, "0")}`;
}

// VCF 3.0 valid for Android / Google Contacts import.
export function generateVcf(contacts: VcfContact[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const c of contacts) {
    const phone = c.phone.trim();
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);
    const name = formatName(c.contact_seq);
    lines.push(
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${name};;;;`,
      `FN:${name}`,
      `TEL;TYPE=CELL:${phone}`,
      "END:VCARD",
    );
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
