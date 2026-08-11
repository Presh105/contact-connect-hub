/** Converts any common YouTube link into an embeddable URL. Returns null when unusable. */
export function toYouTubeEmbed(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{6,})/i,
    /(?:youtu\.be\/)([\w-]{6,})/i,
    /(?:youtube\.com\/embed\/)([\w-]{6,})/i,
    /(?:youtube\.com\/shorts\/)([\w-]{6,})/i,
    /(?:youtube\.com\/live\/)([\w-]{6,})/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}
