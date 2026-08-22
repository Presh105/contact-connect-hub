import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — Status Connect" },
      {
        name: "description",
        content:
          "Read the Terms of Service governing use of the Status Connect WhatsApp business networking platform.",
      },
    ],
  }),
});

function TermsPage() {
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
            <Link to="/contact">
              <Button variant="ghost" size="sm">
                Contact
              </Button>
            </Link>
            <Link to="/blog">
              <Button variant="ghost" size="sm">
                Blog
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        <article className="prose prose-slate max-w-none">
          <h1>Terms of Service</h1>

          <p>
            <strong>Last updated: August 22, 2026</strong>
          </p>

          <p>
            These Terms of Service govern your use of Status Connect, a
            WhatsApp business networking platform operated through the Status
            Connect website.
          </p>

          <h2>1. Acceptance of these Terms</h2>

          <p>
            By accessing or using Status Connect, you agree to comply with
            these Terms and applicable laws. If you do not agree with these
            Terms, you should not use the service.
          </p>

          <h2>2. Eligibility and registration</h2>

          <p>
            You must provide accurate information when registering. You are
            responsible for maintaining the accuracy of your account
            information and for using an active WhatsApp number associated
            with you.
          </p>

          <h2>3. Membership approval</h2>

          <p>
            Registration does not automatically guarantee community approval.
            Status Connect may review registrations and may approve, reject,
            suspend or remove accounts where necessary to protect the
            community or operate the service.
          </p>

          <h2>4. Contact networking</h2>

          <p>
            Contact exchange is a central feature of Status Connect. Approved
            members may receive community contact information for legitimate
            networking, business promotion and related purposes.
          </p>

          <p>
            You must not use community contact information for unlawful
            activity, harassment, fraud, impersonation, abusive bulk
            messaging, or other activity that violates applicable laws or
            these Terms.
          </p>

          <h2>5. Respect for other members</h2>

          <p>
            Members must interact responsibly. Do not threaten, harass,
            impersonate, deceive, defraud or intentionally abuse other members.
          </p>

          <h2>6. Account security</h2>

          <p>
            You are responsible for protecting access to your account and
            device. If you believe your account has been accessed without
            authorization, contact Status Connect as soon as possible.
          </p>

          <h2>7. Freemium and Premium membership</h2>

          <p>
            Status Connect may provide different membership levels with
            different features. Features, pricing, eligibility requirements
            and benefits may change as the service develops.
          </p>

          <p>
            Premium membership does not guarantee a particular number of
            WhatsApp Status views, customers, sales, leads, contacts or
            business results.
          </p>

          <h2>8. User content and business claims</h2>

          <p>
            You are responsible for information, promotional material and
            claims that you share through Status Connect or with other
            members. Do not publish misleading, fraudulent, unlawful or
            infringing material.
          </p>

          <h2>9. Prohibited activities</h2>

          <p>Users must not use Status Connect to:</p>

          <ul>
            <li>commit or facilitate unlawful activity;</li>
            <li>conduct fraud, scams or impersonation;</li>
            <li>harass or threaten other users;</li>
            <li>distribute malware or harmful software;</li>
            <li>attempt unauthorized access to the service;</li>
            <li>abuse or manipulate the platform;</li>
            <li>misuse another person's personal information; or</li>
            <li>violate applicable laws or regulations.</li>
          </ul>

          <h2>10. Service availability</h2>

          <p>
            We aim to keep Status Connect available and reliable, but we do
            not guarantee uninterrupted operation. Maintenance, technical
            failures, security incidents, third-party service interruptions
            and other circumstances may temporarily affect availability.
          </p>

          <h2>11. Changes to the service</h2>

          <p>
            Status Connect may modify, add or remove features as the platform
            develops. We may also update these Terms to reflect changes to
            the service or applicable requirements.
          </p>

          <h2>12. Termination</h2>

          <p>
            We may suspend or terminate access when reasonably necessary,
            including where a user violates these Terms, abuses the platform,
            creates security risks or engages in unlawful activity.
          </p>

          <h2>13. Disclaimer</h2>

          <p>
            Status Connect provides a networking platform and does not
            guarantee that membership will result in particular business
            outcomes. Results such as Status views, customers, sales,
            partnerships and leads depend on many factors outside our control.
          </p>

          <h2>14. Contact</h2>

          <p>
            Questions about these Terms can be sent to{" "}
            <a href="mailto:noahprecious06@gmail.com">
              noahprecious06@gmail.com
            </a>{" "}
            or through the official Status Connect WhatsApp support numbers.
          </p>
        </article>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Status Connect
        </div>
      </footer>
    </div>
  );
              }
