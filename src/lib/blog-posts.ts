import { SITE } from "./site";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  /** First published (YYYY-MM-DD). */
  date: string;
  /** Last substantially updated (YYYY-MM-DD). */
  updated: string;
  readMinutes: number;
  tags: string[];
  /** Short key points, also drawn into the inline infographic. */
  takeaways: string[];
  /** Markdown-lite body: ## / ### headings, "- " lists, "> " callouts, images, **bold**, [links](url). */
  body: string;
  image: string;
  imageAlt: string;
  inlineImage: string;
  author: string;
  wordCount: number;
  category: string;
}

/** Retired thin posts → the long guide that now covers the topic (301). */
export const REDIRECTS: Record<string, string> = {
  "whatsapp-not-showing-new-contacts-fix": "fix-vcf-import-not-working-android",
  "remove-duplicate-contacts-android-iphone": "fix-vcf-import-not-working-android",
  "delete-imported-contacts-after-vcf-import": "fix-vcf-import-not-working-android",
  "back-up-contacts-android-iphone-google": "vcf-file-explained-import-contacts-android-iphone",
  "how-many-contacts-can-you-save-on-your-phone": "vcf-file-explained-import-contacts-android-iphone",
  "why-cant-i-see-whatsapp-status-views": "how-to-check-who-viewed-whatsapp-status",
  "whatsapp-status-privacy-settings-explained": "how-to-check-who-viewed-whatsapp-status",
  "whatsapp-status-captions-that-sell": "whatsapp-status-content-ideas-for-vendors",
  "short-videos-for-whatsapp-status-that-people-watch": "product-photos-with-your-phone-for-whatsapp-status",
  "quick-replies-and-labels-whatsapp-business": "whatsapp-business-catalog-guide",
  "whatsapp-broadcast-list-vs-status-vs-groups": "whatsapp-business-app-setup-nigeria",
  "whatsapp-account-restricted-or-banned-what-to-do": "whatsapp-marketing-rules-what-is-allowed",
  "handle-customer-complaints-on-whatsapp": "whatsapp-business-catalog-guide",
};

export const CATEGORIES = [
  "WhatsApp Status",
  "WhatsApp Business",
  "Contacts & VCF",
  "Security & Privacy",
  "Selling & Money",
] as const;

const CATEGORY_BY_SLUG: Record<string, (typeof CATEGORIES)[number]> = {
  "how-to-increase-whatsapp-status-views-in-nigeria": "WhatsApp Status",
  "how-to-check-who-viewed-whatsapp-status": "WhatsApp Status",
  "best-time-to-post-whatsapp-status-nigeria": "WhatsApp Status",
  "whatsapp-status-content-ideas-for-vendors": "WhatsApp Status",
  "product-photos-with-your-phone-for-whatsapp-status": "WhatsApp Status",
  "how-to-save-whatsapp-status-photos-and-videos": "WhatsApp Status",
  "whatsapp-business-app-setup-nigeria": "WhatsApp Business",
  "whatsapp-business-catalog-guide": "WhatsApp Business",
  "whatsapp-business-vs-whatsapp-messenger": "WhatsApp Business",
  "how-to-create-whatsapp-channel-nigeria": "WhatsApp Business",
  "whatsapp-groups-vs-communities-which-to-use": "WhatsApp Business",
  "whatsapp-click-to-chat-link-and-qr-code": "WhatsApp Business",
  "vcf-file-explained-import-contacts-android-iphone": "Contacts & VCF",
  "fix-vcf-import-not-working-android": "Contacts & VCF",
  "grow-small-business-whatsapp-network-nigeria": "Contacts & VCF",
  "move-whatsapp-chats-to-new-phone": "Contacts & VCF",
  "recover-deleted-whatsapp-messages": "Contacts & VCF",
  "spot-whatsapp-scams-nigeria": "Security & Privacy",
  "two-step-verification-whatsapp-business-number": "Security & Privacy",
  "nigeria-data-protection-act-whatsapp-contacts": "Security & Privacy",
  "whatsapp-marketing-rules-what-is-allowed": "Security & Privacy",
  "whatsapp-web-and-linked-devices-safely": "Security & Privacy",
};

const raw = import.meta.glob("../content/posts/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function parse(file: string, text: string): BlogPost {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`Bad frontmatter in ${file}`);
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const slug = file.split("/").pop()!.replace(/\.md$/, "");
  const body = m[2].trim();
  const wordCount = body.split(/\s+/).length;
  return {
    slug,
    title: meta.title,
    description: meta.description,
    date: meta.date,
    updated: meta.updated || meta.date,
    readMinutes: Math.max(3, Math.round(wordCount / 200)),
    tags: (meta.tags || "").split(",").map((s) => s.trim()).filter(Boolean),
    takeaways: (meta.takeaways || "").split("|").map((s) => s.trim()).filter(Boolean),
    body,
    image: `/blog/${slug}.jpg`,
    imageAlt: meta.imageAlt || meta.title,
    inlineImage: `/blog/${slug}-key-points.jpg`,
    author: meta.author || SITE.founder,
    wordCount,
    category: CATEGORY_BY_SLUG[slug] ?? "Selling & Money",
  };
}

export const BLOG_POSTS: BlogPost[] = Object.entries(raw)
  .map(([f, t]) => parse(f, t))
  .sort((a, b) => b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title));

/** Related posts ranked by shared tags, then newest first. */
export function getRelatedPosts(slug: string, limit = 3) {
  const current = BLOG_POSTS.find((p) => p.slug === slug);
  if (!current) return [];
  return BLOG_POSTS.filter((p) => p.slug !== slug)
    .map((p) => ({ p, score: p.tags.filter((t) => current.tags.includes(t)).length }))
    .sort((a, b) => b.score - a.score || b.p.updated.localeCompare(a.p.updated))
    .slice(0, limit)
    .map((x) => x.p);
}

export function getPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getHeadings(body: string) {
  return body
    .split("\n")
    .filter((l) => l.startsWith("## "))
    .map((l) => l.slice(3).trim());
}

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
