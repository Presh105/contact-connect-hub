import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  BadgeCheck,
  Handshake,
  Network,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      {
        title: "About Status Connect — WhatsApp Business Networking in Nigeria",
      },
      {
        name: "description",
        content:
          "Learn about Status Connect, a Nigerian WhatsApp business networking platform helping entrepreneurs, vendors, freelancers and professionals expand their business network.",
      },
    ],
  }),
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/favicon.png"
              alt="Status Connect logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-md"
            />
            <span className="font-semibold text-foreground">
              Status Connect
            </span>
          </Link>

          <nav className="flex items-center gap-2" aria-label="Primary">
            <Link to="/blog">
              <Button variant="ghost" size="sm">
                Blog
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link to="/auth" search={{ mode: "register" }}>
              <Button size="sm">Register</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 py-14 md:py-20">
          <div className="text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <BadgeCheck className="h-3.5 w-3.5" />
              About Status Connect
            </p>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Helping Nigerians build stronger WhatsApp business networks
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Status Connect is a Nigerian WhatsApp business networking
              platform created to help entrepreneurs, vendors, freelancers,
              students, professionals and business owners expand their reach
              through verified community connections.
            </p>
          </div>

          <div className="mt-12 space-y-8 text-foreground">
            <section>
              <h2 className="text-2xl font-bold">What is Status Connect?</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Status Connect brings people who use WhatsApp for business,
                promotion and professional networking into one community.
                Approved members can access verified community contacts and
                use those connections to increase the potential audience for
                their WhatsApp Status updates.
              </p>
              <p className="mt-3 leading-7 text-muted-foreground">
                The platform is designed around a simple idea: a useful
                business network becomes more valuable as more genuine,
                relevant people participate in it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">Our purpose</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Our purpose is to make business networking more accessible to
                Nigerians who already use WhatsApp as an important channel for
                communication, marketing and customer relationships.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">How the community works</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Members register with an active WhatsApp number and are
                reviewed before becoming approved community members. Approved
                members can download the latest available community contact
                list and import the contacts into their phones.
              </p>
              <p className="mt-3 leading-7 text-muted-foreground">
                Freemium and Premium membership options provide different
                contact-download features while keeping the core community
                accessible to people who want to participate without paying.
              </p>
            </section>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Network,
                title: "Networking",
                text: "Connect with entrepreneurs and professionals across Nigeria.",
              },
              {
                icon: TrendingUp,
                title: "Business Growth",
                text: "Use WhatsApp Status as an additional channel for reaching customers.",
              },
              {
                icon: Users,
                title: "Community",
                text: "Build relationships with people who use WhatsApp for business.",
              },
              {
                icon: ShieldCheck,
                title: "Responsible Sharing",
                text: "Community access is designed around approved members and clear rules.",
              },
              {
                icon: Handshake,
                title: "Relationships",
                text: "Create opportunities for partnerships, referrals and collaboration.",
              },
              {
                icon: BadgeCheck,
                title: "Verified Members",
                text: "Members are reviewed before joining the community.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <item.icon className="h-6 w-6 text-primary" aria-hidden />
                <h2 className="mt-3 font-semibold text-foreground">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-border bg-muted/30 p-6 text-center">
            <h2 className="text-xl font-bold text-foreground">
              Explore Status Connect
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Learn how the platform works, read our WhatsApp growth guides,
              or join the community.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link to="/">
                <Button>How Status Connect Works</Button>
              </Link>
              <Link to="/blog">
                <Button variant="outline">Read Our Blog</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Status Connect · Nigeria's WhatsApp
          business network
        </div>
      </footer>
    </div>
  );
    }
