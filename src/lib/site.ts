/** Single source of truth for site identity. Edit here and it updates everywhere. */
export const SITE = {
  name: "Status Connect",
  url: "https://statusconnect.com.ng",
  email: "noahprecious06@gmail.com",
  /** City-level location shown on About / Contact / footer. Replace with your real one. */
  location: "Lagos, Nigeria",
  founder: "Noah Precious",
  founderRole: "Founder & Editor",
  founderBio:
    "Noah runs Status Connect and writes most of its guides. He focuses on practical WhatsApp marketing for Nigerian small businesses, vendors and freelancers.",
  whatsapp: ["+2348139667218", "+2349116536969"],
  logo: "/favicon.png",
  defaultImage: "/og-image.jpg",
} as const;

export const abs = (path: string) => (path.startsWith("http") ? path : `${SITE.url}${path}`);
