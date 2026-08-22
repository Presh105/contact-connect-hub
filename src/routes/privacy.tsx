import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Status Connect" },
      {
        name: "description",
        content:
          "Read the Status Connect Privacy Policy covering account information, WhatsApp numbers, contact downloads, cookies, advertising and data protection.",
      },
    ],
  }),
});

function PrivacyPage() {
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
          <h1>Privacy Policy</h1>

          <p>
            <strong>Last updated: August 22, 2026</strong>
          </p>

          <p>
            Status Connect ("Status Connect", "we", "us", or "our") respects
            your privacy. This Privacy Policy explains what information we
            collect, why we collect it, how it is used, and the choices
            available to you when you use the Status Connect website and
            services.
          </p>

          <h2>1. Information we collect</h2>

          <p>
            When you register for Status Connect, we may collect information
            needed to create and manage your account, including your name and
            WhatsApp phone number.
          </p>

          <p>
            We may also collect information associated with your membership,
            account status, contact-download activity, Premium membership
            requests, and interactions with the service.
          </p>

          <h2>2. Phone contacts and contact checking</h2>

          <p>
            Some Status Connect download features may allow you to compare
            community numbers with contacts already stored on your device.
            This feature is intended to help avoid downloading numbers that
            you already have.
          </p>

          <p>
            When your browser provides a contact-picker capability, the
            comparison is performed through the device/browser feature. Status
            Connect does not need to upload your entire personal phone book to
            provide this comparison feature.
          </p>

          <h2>3. How we use information</h2>

          <p>We may use information to:</p>

          <ul>
            <li>create and manage Status Connect accounts;</li>
            <li>review and approve community membership;</li>
            <li>provide contact-download and membership features;</li>
            <li>provide customer and technical support;</li>
            <li>communicate important service information;</li>
            <li>protect the service against abuse, fraud and unauthorized activity;</li>
            <li>improve the website and user experience; and</li>
            <li>comply with applicable legal obligations.</li>
          </ul>

          <h2>4. WhatsApp numbers and community contact sharing</h2>

          <p>
            Status Connect is a business networking service based on WhatsApp
            contacts. An approved member's WhatsApp number may therefore be
            included in the community contact lists made available to other
            approved members.
          </p>

          <p>
            By joining the community, you understand that this contact-sharing
            functionality is a core part of the service. We do not sell
            member contact information as a standalone data product.
          </p>

          <h2>5. Service providers</h2>

          <p>
            Status Connect uses third-party technology providers to operate
            parts of the service. These may include hosting, database,
            authentication, payment-related, analytics, security and
            advertising providers.
          </p>

          <p>
            These providers may process information as necessary to provide
            their services, subject to their own terms and privacy policies
            and applicable requirements.
          </p>

          <h2>6. Cookies and similar technologies</h2>

          <p>
            Status Connect and its service providers may use cookies, local
            storage, pixels, web beacons, IP addresses and similar technologies
            for functions such as authentication, security, preferences,
            analytics and advertising.
          </p>

          <h2>7. Google AdSense and advertising cookies</h2>

          <p>
            Status Connect may use Google AdSense and other Google advertising
            technologies to display advertisements.
          </p>

          <p>
            Third-party vendors, including Google, may use cookies to serve
            advertisements based on a user's previous visits to this website
            or other websites. Google's use of advertising cookies may enable
            Google and its partners to serve advertisements based on a user's
            visit to Status Connect and/or other sites on the Internet.
          </p>

          <p>
            Google and its advertising partners may use cookies, web beacons,
            IP addresses or other identifiers as part of advertising and
            measurement technologies.
          </p>

          <p>
            Users may manage or opt out of personalized advertising through
            Google's Ads Settings. Users may also use available industry
            controls for managing personalized advertising.
          </p>

          <p>
            For information about how Google uses data when you use our
            partners' sites or apps, please consult Google's published privacy
            information.
          </p>

          <h2>8. Data security</h2>

          <p>
            We use reasonable technical and organizational measures intended
            to protect information from unauthorized access, alteration,
            disclosure or destruction. However, no internet-based service can
            guarantee absolute security.
          </p>

          <h2>9. Data retention</h2>

          <p>
            We retain information for as long as reasonably necessary to
            provide the service, maintain legitimate business records,
            resolve disputes, enforce agreements, prevent abuse, and comply
            with applicable obligations.
          </p>

          <h2>10. Your choices</h2>

          <p>
            Depending on the information and circumstances, you may contact us
            to ask about your personal information, request correction of
            inaccurate information, or ask questions about how your
            information is being used.
          </p>

          <h2>11. Children's privacy</h2>

          <p>
            Status Connect is intended for users who are legally able to use
            the service. We do not knowingly collect personal information from
            children in violation of applicable law.
          </p>

          <h2>12. Changes to this Privacy Policy</h2>

          <p>
            We may update this Privacy Policy when the service, technology,
            legal requirements or advertising arrangements change. The
            updated version will be published on this page with a revised
            "Last updated" date.
          </p>

          <h2>13. Contact us</h2>

          <p>
            If you have questions about this Privacy Policy or our privacy
            practices, contact Status Connect at:
          </p>

          <p>
            <strong>Email:</strong>{" "}
            <a href="mailto:noahprecious06@gmail.com">
              noahprecious06@gmail.com
            </a>
          </p>

          <p>
            <strong>WhatsApp:</strong> +234 813 966 7218 or +234 911 653 6969
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
