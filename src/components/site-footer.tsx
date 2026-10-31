import { Link } from "@tanstack/react-router";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto max-w-6xl px-4 text-sm text-muted-foreground">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="font-medium text-foreground">{SITE.name}</p>
            <p>{SITE.location} · <a className="hover:text-foreground" href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <Link to="/blog" className="hover:text-foreground">Blog</Link>
            <Link to="/about" className="hover:text-foreground">About</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
