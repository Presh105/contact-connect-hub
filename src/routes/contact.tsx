import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact Status Connect" },
      {
        name: "description",
        content:
          "Contact Status Connect for questions, support and enquiries about the WhatsApp business networking community.",
      },
    ],
  }),
});

function ContactPage() {
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

          <nav className="flex items-center gap-2">
            <Link to="/about">
              <Button variant="ghost" size="sm">
                About
              </Button>
            </Link>
            <Link to="/blog">
              <Button variant="ghost" size="sm">
                Blog
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Log in</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-14 md:py-20">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground md:text-5xl">
            Contact Status Connect
          </h1>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-muted-foreground">
            Have a question about your account, membership, contact downloads,
            or the Status Connect community? You can contact our team using
            the official channels below.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <MessageCircle className="h-7 w-7 text-primary" />
            <h2 className="mt-4 text-xl font-semibold text-foreground">
              WhatsApp Support
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Contact the official Status Connect administrators on WhatsApp
              for community and account support.
            </p>

            <div className="mt-5 space-y-2 text-sm">
              <a
                href="https://wa.me/2348139667218"
                target="_blank"
                rel="noreferrer"
                className="block font-medium text-primary hover:underline"
              >
                WhatsApp: +234 813 966 7218
              </a>

              <a
                href="https://wa.me/2349116536969"
                target="_blank"
                rel="noreferrer"
                className="block font-medium text-primary hover:underline"
              >
                WhatsApp: +234 911 653 6969
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <Mail className="h-7 w-7 text-primary" />
            <h2 className="mt-4 text-xl font-semibold text-foreground">
              Email
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              For general enquiries and support, send us an email.
            </p>

            <a
              href="mailto:noahprecious06@gmail.com"
              className="mt-5 block font-medium text-primary hover:underline"
            >
              noahprecious06@gmail.com
            </a>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-muted/30 p-6">
          <h2 className="text-xl font-bold text-foreground">
            What can we help with?
          </h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            You can contact us about registration, account access, membership,
            contact downloads, Premium membership, community participation,
            technical problems, privacy questions, or other questions about
            Status Connect.
          </p>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Status Connect
        </div>
      </footer>
    </div>
  );
            }
