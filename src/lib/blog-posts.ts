export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readMinutes: number;
  tags: string[];
  /** Paragraphs and headings — h2 lines start with "## ". */
  body: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-increase-whatsapp-status-views-in-nigeria",
    title: "How to Increase WhatsApp Status Views in Nigeria (Without Buying Fake Engagement)",
    description:
      "A practical guide for Nigerian business owners on growing real WhatsApp Status views: contact exchange, posting rhythm, content mix, and the mistakes that kill reach.",
    date: "2026-01-12",
    readMinutes: 7,
    tags: ["WhatsApp Status", "Marketing", "Nigeria"],
    body: [
      "WhatsApp Status only reaches people who have your number saved. That single rule explains almost everything about why some Nigerian vendors get hundreds of views per post while others get twelve.",
      "## 1. Your view count is a contact-list problem, not a content problem",
      "Before you rewrite your captions or buy a ring light, count how many people actually have your number saved. If two hundred people saved you, two hundred is your ceiling. Growing views means growing the number of phones your number sits in — which is exactly what a contact exchange community does.",
      "## 2. Exchange contacts with people who match your market",
      "Random numbers are worth very little. Traders, tailors, phone dealers, food vendors and service providers who post daily are worth a lot, because they view Status habitually and they buy from each other. Join networks where members are business people, not idle numbers.",
      "## 3. Post on a rhythm your audience can predict",
      "Three to five updates a day, spread between 7–9am, 1–2pm and 7–10pm, matches when most Nigerians scroll. Posting twenty times in one hour buries your own updates and gets you muted.",
      "## 4. Mix the content, not just the products",
      "A useful ratio is three value posts (tips, behind the scenes, customer results) to one direct sales post. People mute catalogues; they keep watching stories.",
      "## 5. Make it easy to reply",
      "Every few posts, end with a question or a clear next step: 'Reply 1 for price list'. Replies push you up the contact's Status order and signal WhatsApp that people engage with you.",
      "## 6. Save the people who saved you",
      "Reciprocity is the engine. When you save the numbers of members who saved yours, both audiences grow at the same time. Status Connect tracks confirmed saves so you can see who genuinely added you.",
      "## 7. Avoid the shortcuts",
      "Bulk-messaging apps, unofficial WhatsApp mods and bought contact lists get numbers banned. Everything here works inside WhatsApp's normal rules — you are simply exchanging contacts and importing a standard VCF file.",
      "Grow the list, keep the rhythm, respect the platform. Views follow.",
    ],
  },
  {
    slug: "vcf-file-explained-import-contacts-android-iphone",
    title: "VCF Files Explained: How to Import Hundreds of Contacts to Android and iPhone",
    description:
      "What a VCF (vCard) file is, why it is the safest way to share contacts in bulk, and step-by-step import instructions for Android, iPhone and Google Contacts.",
    date: "2026-01-19",
    readMinutes: 6,
    tags: ["VCF", "Tutorial", "Contacts"],
    body: [
      "A VCF file — short for vCard — is the standard format phones use to store contact cards. One file can hold one contact or ten thousand, and every major phone can read it without extra software.",
      "## Why VCF is the right tool for bulk contact exchange",
      "It is an open standard supported by Android, iOS, Google Contacts and Outlook. Nothing is automated inside WhatsApp, no rules are bent, and you stay in control: you can review the file before importing and delete the contacts later.",
      "## Importing on Android",
      "Download the .vcf file, open your Contacts app, tap the menu and choose Settings, then Import. Pick the .vcf file from your Downloads folder and choose the account (usually your Google account) to save into. Large files can take a minute.",
      "## Importing on iPhone",
      "Open the downloaded .vcf from Files or the Downloads banner, tap Share, then choose Contacts. iOS will offer 'Add All Contacts'. For very large files, importing through Google Contacts on a browser and syncing back is more reliable.",
      "## Importing through Google Contacts (best for large lists)",
      "Go to contacts.google.com, open the left menu, choose Import, select your .vcf file and confirm. Everything syncs to any phone signed into that Google account, and you can undo the import from the Fix & manage menu within 30 days.",
      "## Avoiding duplicates",
      "Good exchange platforms only ever send you contacts you have not received before. On top of that, Google Contacts has a Merge & fix tool that groups duplicates automatically.",
      "## Naming matters",
      "Contacts saved with a consistent naming pattern, such as 'Status Connect 000142', are easy to find, group and remove later. Random names make cleanup painful.",
      "Import once, and every one of those numbers can see your Status updates from your next post onward.",
    ],
  },
  {
    slug: "whatsapp-marketing-rules-what-is-allowed",
    title: "WhatsApp Marketing in Nigeria: What Is Allowed and What Gets You Banned",
    description:
      "A clear breakdown of safe WhatsApp promotion for small businesses — what the terms of service permit, which tools get accounts banned, and how to stay compliant while growing.",
    date: "2026-02-02",
    readMinutes: 6,
    tags: ["Compliance", "WhatsApp", "Small Business"],
    body: [
      "Plenty of Nigerian businesses lose a working WhatsApp number every week — usually to a tool that promised free growth. Here is the line between safe promotion and a ban.",
      "## What is allowed",
      "Sharing your own number, exchanging contacts with people who agree to it, importing contacts from a standard VCF file, posting Status updates, and replying to people who message you are all normal use of the app.",
      "## What gets accounts banned",
      "Modified clients (GBWhatsApp, WhatsApp Plus and similar), bulk-sending software, automated blast tools, scraping numbers from groups without consent, and messaging strangers who never opted in. WhatsApp detects the sending pattern, not just the app.",
      "## Status is the safe channel",
      "Status updates are broadcast to your saved contacts only, at their pace, and they can mute you. That is why Status marketing is durable while bulk DM blasts are not.",
      "## Consent still matters",
      "Exchanging contacts inside a community where everyone joined voluntarily is consent-based. Buying a list of numbers is not, and it also converts badly.",
      "## Protect the number you rely on",
      "Verify two-step verification is on, avoid sudden bursts of messages to new numbers, and never link your business number to an unofficial app for 'extra features'.",
      "Grow through consent and Status reach, and the account you build on stays yours.",
    ],
  },
  {
    slug: "grow-small-business-whatsapp-network-nigeria",
    title: "How Nigerian Small Businesses Grow Faster With a Bigger WhatsApp Network",
    description:
      "Why contact-list size is the most underrated growth metric for Nigerian SMEs, with a simple weekly routine to turn saved contacts into repeat customers.",
    date: "2026-02-16",
    readMinutes: 6,
    tags: ["SME", "Growth", "Networking"],
    body: [
      "Ask a Nigerian vendor how they got their last ten customers and the answer is almost always the same: someone saw a Status update, or someone referred them. Both depend on how many relevant people have your number.",
      "## Treat contacts as inventory",
      "A shop restocks weekly. Your contact list deserves the same discipline: add new, relevant numbers every week and your reach compounds instead of decaying.",
      "## A simple weekly routine",
      "Monday: download and import the week's new community contacts. Tuesday to Friday: post three Status updates a day, at least one non-promotional. Saturday: reply to every viewer who reacted. Sunday: note which posts drove messages and repeat the format.",
      "## Sell to a warm room",
      "People who already see your daily updates need far less convincing than a cold contact. This is why a network of two thousand engaged business people beats a purchased list of fifty thousand strangers.",
      "## Collaboration beats competition",
      "Fellow vendors are customers, suppliers and referral partners. A tailor and a fabric seller in the same network feed each other business for years.",
      "## Measure two numbers",
      "Track Status views per post and messages received per week. If views grow but messages do not, your content needs a clearer call to action. If both grow, keep going.",
      "Bigger relevant network, consistent posting, honest offers — that is the whole growth engine.",
    ],
  },
];

export function getPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
