import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

/** One consistent menu on every public page. */
export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src="/favicon.png" alt={`${SITE.name} logo`} width={32} height={32} className="h-8 w-8 rounded-md" />
          <span className="font-semibold text-foreground">{SITE.name}</span>
        </Link>
        <nav aria-label="Main" className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "bg-muted text-foreground font-medium" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/auth" search={{ mode: "register" }}><Button size="sm">Register</Button></Link>
        </div>
      </div>
    </header>
  );
}
