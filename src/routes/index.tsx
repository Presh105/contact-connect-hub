import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { UserPlus, Clock, Download, Smartphone, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Landing,
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
      text: "Join the Status Connect community and grow your WhatsApp network.",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // fall through to copy
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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">SC</div>
            <span className="font-semibold text-foreground">Status Connect</span>
          </div>
          <nav className="flex gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Log in</Button></Link>
            <Link to="/auth" search={{ mode: "register" }}><Button size="sm">Register</Button></Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 pt-12 pb-16 md:pt-20 md:pb-24 text-center">
          <h1 className="sc-fade-up text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            Expand Your WhatsApp Network.
            <br className="hidden sm:block" />
            <span className="text-primary"> Grow Your Business Together.</span>
          </h1>
          <p className="sc-fade-up sc-delay-1 mt-5 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Register with your active WhatsApp number and become part of the Status Connect community. Download community contacts, connect with other members, discover new customers, increase your WhatsApp Status reach, and support businesses within the community.
          </p>
          <div className="sc-fade-up sc-delay-2 mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/auth" search={{ mode: "register" }}>
              <Button size="lg" className="w-full sm:w-auto rounded-full px-6">Submit Your WhatsApp Number</Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-6" onClick={invite}>
              <Share2 className="h-4 w-4 mr-2" /> Invite Your Friends
            </Button>
          </div>
          <p className="sc-fade-up sc-delay-3 mt-6 text-sm text-muted-foreground max-w-2xl mx-auto">
            The more people who join the community, the more valuable your contact network becomes. Invite your friends, family, customers, colleagues, classmates, and business partners to help the community grow.
          </p>
        </section>

        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 py-14 md:py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">How It Works</h2>
              <p className="mt-2 text-muted-foreground">Four simple steps to start connecting.</p>
            </div>
            <ol className="grid gap-4 md:grid-cols-4">
              {[
                { icon: UserPlus, title: "Step 1", body: "Register using your active WhatsApp number." },
                { icon: Clock, title: "Step 2", body: "Wait for your account to be approved." },
                { icon: Download, title: "Step 3", body: "Download your personalized community contact list." },
                { icon: Smartphone, title: "Step 4", body: "Import the contacts into your phone and start connecting with other community members." },
              ].map((s, i) => (
                <li key={s.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">{i + 1}</div>
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Status Connect
      </footer>
    </div>
  );
}
