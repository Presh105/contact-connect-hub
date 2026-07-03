import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Users, Download, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

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

      <main className="mx-auto max-w-5xl px-4 py-12 md:py-20">
        <section className="text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Exchange WhatsApp contacts in bulk
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Register once, then download versioned VCF files containing every community member's number — ready to import into your phone contacts.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth" search={{ mode: "register" }}>
              <Button size="lg">Get started</Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">I already have an account</Button>
            </Link>
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            { icon: Users, title: "Join the community", body: "Add your number once. Every member becomes reachable to every other member." },
            { icon: Download, title: "Download VCF files", body: "Grab only the new contacts since your last download, or the full list any time." },
            { icon: Shield, title: "Safe & compliant", body: "No WhatsApp automation. You import contacts into your phone — nothing more." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border border-border p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Status Connect
      </footer>
    </div>
  );
}
