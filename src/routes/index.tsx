import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  Clock,
  Download,
  Smartphone,
  Share2,
  TrendingUp,
  Users,
  Store,
  Briefcase,
  GraduationCap,
  Megaphone,
  Video,
  ShoppingBag,
  Wrench,
  Rocket,
  Building2,
  Eye,
  Target,
  Network,
  Handshake,
  Search,
  Gift,
  Zap,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import heroImage from "@/assets/hero.jpg";

const TITLE = "Status Connect — Grow Your WhatsApp Business Network Across Nigeria";
const DESCRIPTION =
  "Status Connect is Nigeria's largest WhatsApp business networking platform. Exchange verified WhatsApp contacts to increase Status views, reach more customers, and grow your business.";

const FAQS = [
  {
    q: "What is Status Connect?",
    a: "Status Connect is Nigeria's largest WhatsApp business networking platform. We help entrepreneurs, vendors, freelancers, and business owners exchange verified WhatsApp contacts to grow their audience, increase Status views, and reach more customers.",
  },
  {
    q: "How does Status Connect work?",
    a: "Register with your active WhatsApp number, get approved as a community member, then download a verified contact list (VCF file) of other members. Save the contacts on your phone and your Status updates automatically reach thousands of Nigerian professionals.",
  },
  {
    q: "Is Status Connect free?",
    a: "Yes. Joining the Status Connect community, downloading verified WhatsApp contacts, and promoting your business inside the network is completely free.",
  },
  {
    q: "How do I download contacts?",
    a: "After your account is approved, open your dashboard and click Download. You'll receive a VCF file that imports every new verified community contact straight into your phone.",
  },
  {
    q: "Are members verified?",
    a: "Yes. Every member registers with an active WhatsApp number and is reviewed before joining, so you only connect with real Nigerian entrepreneurs, professionals, and business owners.",
  },
  {
    q: "Can I promote my business?",
    a: "Absolutely. Once thousands of members save your number, your WhatsApp Status updates, product photos, and offers reach a large targeted Nigerian audience every single day — for free.",
  },
  {
    q: "Who can join Status Connect?",
    a: "Small business owners, entrepreneurs, vendors, freelancers, students, digital marketers, content creators, online sellers, service providers, startups, SMEs — anyone in Nigeria who wants to grow their WhatsApp network can join.",
  },
  {
    q: "Is my WhatsApp number safe?",
    a: "Your number is only shared with other verified, approved members inside the Status Connect community. It is never published publicly or sold to third parties.",
  },
  {
    q: "How often are new contacts added?",
    a: "New verified members join and are approved every day. Each time a new version is published you can download only the new contacts you haven't received before.",
  },
  {
    q: "How can I invite friends?",
    a: "Use the Invite Your Friends button on the homepage to share Status Connect on WhatsApp or copy the link. The bigger the community grows, the more valuable everyone's contact network becomes.",
  },
];

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "Status Connect, WhatsApp Contacts Nigeria, WhatsApp Business Contacts, WhatsApp Marketing, WhatsApp Status Marketing, WhatsApp Status Views, Grow WhatsApp Status, WhatsApp Community, Business Networking Nigeria, Nigerian Entrepreneurs, Business Contacts Nigeria, Customer Acquisition, Free Business Promotion, SME Nigeria, Nigerian Business Network, Verified WhatsApp Contacts, WhatsApp Business Community",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "/" },
      { property: "og:image", content: "/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Status Connect — Grow your WhatsApp business network in Nigeria" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: "/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: "Status Connect",
              url: "/",
              description: DESCRIPTION,
              inLanguage: "en-NG",
              potentialAction: {
                "@type": "SearchAction",
                target: "/?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": "WebApplication",
              name: "Status Connect",
              url: "/",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Any",
              offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
              description: DESCRIPTION,
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQS.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }),
      },
    ],
  }),
});

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  async function invite() {
    const url = window.location.origin;
    const shareData = {
      title: "Status Connect",
      text: "Join Status Connect — Nigeria's largest WhatsApp business networking community.",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // fall through
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied — share it with your friends");
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="Status Connect logo" width={32} height={32} className="h-8 w-8 rounded-md" />
            <span className="font-semibold text-foreground">Status Connect</span>
          </div>
          <nav className="flex gap-2" aria-label="Primary">
            <Link to="/auth"><Button variant="ghost" size="sm">Log in</Button></Link>
            <Link to="/auth" search={{ mode: "register" }}><Button size="sm">Register</Button></Link>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-16 md:pt-16 md:pb-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="text-center md:text-left">
              <p className="sc-fade-up inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 mb-4">
                <BadgeCheck className="h-3.5 w-3.5" /> Nigeria's #1 WhatsApp Networking Community
              </p>
              <h1 className="sc-fade-up text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
                Grow Your <span className="text-primary">WhatsApp Business Network</span> Across Nigeria
              </h1>
              <p className="sc-fade-up sc-delay-1 mt-5 text-base md:text-lg text-muted-foreground max-w-xl md:mx-0 mx-auto">
                Exchange verified WhatsApp contacts with thousands of Nigerian entrepreneurs, vendors, freelancers and business owners. Increase your WhatsApp Status views, reach new customers, and grow your business — all for free.
              </p>
              <div className="sc-fade-up sc-delay-2 mt-8 flex flex-col sm:flex-row md:justify-start justify-center gap-3">
                <Link to="/auth" search={{ mode: "register" }}>
                  <Button size="lg" className="w-full sm:w-auto rounded-full px-6">Submit Your WhatsApp Number</Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-6" onClick={invite}>
                  <Share2 className="h-4 w-4 mr-2" /> Invite Your Friends
                </Button>
              </div>
              <p className="sc-fade-up sc-delay-3 mt-5 text-sm text-muted-foreground">
                Free forever · Verified members · Trusted across Nigeria
              </p>
            </div>
            <div className="sc-fade-up sc-delay-1 order-first md:order-none">
              <img
                src={heroImage}
                alt="Nigerian entrepreneurs connecting and growing their WhatsApp business network with Status Connect"
                width={1200}
                height={912}
                fetchPriority="high"
                decoding="async"
                className="w-full h-auto rounded-2xl border border-border shadow-lg"
              />
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">How Status Connect Works</h2>
              <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">Seven simple steps to grow your WhatsApp Status audience and reach more Nigerian customers.</p>
            </div>
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: UserPlus, title: "Register", body: "Sign up using your active WhatsApp number." },
                { icon: Clock, title: "Get Approved", body: "Become an approved verified community member." },
                { icon: Download, title: "Download Contacts", body: "Get the latest verified community contact list." },
                { icon: Smartphone, title: "Save Contacts", body: "Import the VCF file into your phone contacts." },
                { icon: TrendingUp, title: "Grow Status Reach", body: "Watch your WhatsApp Status audience grow daily." },
                { icon: Target, title: "Reach Customers", body: "Get discovered by thousands of new customers." },
                { icon: Handshake, title: "Build Relationships", body: "Network with entrepreneurs across Nigeria." },
              ].map((s, i) => (
                <li key={s.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">{i + 1}</div>
                    <s.icon className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <h3 className="font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* WHO IS IT FOR */}
        <section id="who" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Who Is Status Connect For?</h2>
              <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">Built for anyone in Nigeria who uses WhatsApp to grow a business, brand, or side hustle.</p>
            </div>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { icon: Store, label: "Small Businesses" },
                { icon: Rocket, label: "Entrepreneurs" },
                { icon: ShoppingBag, label: "Vendors" },
                { icon: Briefcase, label: "Freelancers" },
                { icon: GraduationCap, label: "Students" },
                { icon: Megaphone, label: "Digital Marketers" },
                { icon: Video, label: "Content Creators" },
                { icon: ShoppingBag, label: "Online Sellers" },
                { icon: Wrench, label: "Service Providers" },
                { icon: Rocket, label: "Startups" },
                { icon: Building2, label: "SMEs" },
                { icon: Users, label: "Business Owners" },
              ].map((a) => (
                <div key={a.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                  <a.icon className="h-5 w-5 text-primary" aria-hidden />
                  <span className="text-sm font-medium text-foreground">{a.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section id="benefits" className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Benefits of Joining the Community</h2>
              <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">Everything you need to grow your WhatsApp reach and win more Nigerian customers.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Eye, title: "Increase WhatsApp Status Views", body: "Get seen by thousands of new WhatsApp users every day." },
                { icon: Target, title: "Reach More Customers", body: "Put your products and services in front of buyers who need them." },
                { icon: TrendingUp, title: "Grow Your Business", body: "Turn WhatsApp Status into a real customer acquisition channel." },
                { icon: Network, title: "Expand Your Business Network", body: "Connect with founders and professionals across Nigeria." },
                { icon: Users, title: "Meet Entrepreneurs", body: "Find partners, collaborators and mentors in your industry." },
                { icon: Search, title: "Discover New Clients", body: "Get discovered by community members looking for what you sell." },
                { icon: Gift, title: "Free Business Promotion", body: "Promote your business to a large audience — completely free." },
                { icon: Handshake, title: "Business Networking", body: "Build trusted business relationships that last." },
                { icon: Zap, title: "Faster Customer Acquisition", body: "Skip cold outreach — start with an engaged, verified audience." },
                { icon: Eye, title: "Better Business Visibility", body: "Boost brand awareness across Nigerian WhatsApp users." },
                { icon: BadgeCheck, title: "Verified Community Members", body: "Only real, approved members join the network." },
                { icon: Share2, title: "Easy Contact Exchange", body: "One download imports every new contact straight into your phone." },
              ].map((b) => (
                <div key={b.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <b.icon className="h-6 w-6 text-primary mb-3" aria-hidden />
                  <h3 className="font-semibold text-foreground">{b.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-14 md:py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Frequently Asked Questions</h2>
              <p className="mt-2 text-muted-foreground">Everything you need to know about growing on WhatsApp with Status Connect.</p>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-primary text-primary-foreground">
          <div className="mx-auto max-w-4xl px-4 py-14 md:py-20 text-center">
            <h2 className="text-2xl md:text-3xl font-bold">Ready to grow your WhatsApp business network?</h2>
            <p className="mt-3 opacity-90 max-w-xl mx-auto">Join thousands of verified Nigerian entrepreneurs already using Status Connect to increase Status views and reach more customers.</p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/auth" search={{ mode: "register" }}>
                <Button size="lg" variant="secondary" className="w-full sm:w-auto rounded-full px-6">Create Free Account</Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-6 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={invite}>
                <Share2 className="h-4 w-4 mr-2" /> Invite Your Friends
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="" width={20} height={20} className="h-5 w-5 rounded" />
            <span>© {new Date().getFullYear()} Status Connect · Nigeria's WhatsApp business network</span>
          </div>
          <nav aria-label="Footer" className="flex gap-4">
            <a href="#how-it-works" className="hover:text-foreground">How it works</a>
            <a href="#benefits" className="hover:text-foreground">Benefits</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
