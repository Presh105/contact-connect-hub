import { createFileRoute, Link } from "@tanstack/react-router";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { SITE, abs } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";

const TITLE = "WhatsApp Marketing & Business Guides for Nigeria | Status Connect Blog";
const DESCRIPTION =
  "In-depth, practical guides on WhatsApp Status marketing, WhatsApp Business setup, VCF contact imports, safe payments and growing a Nigerian small business.";

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: abs("/blog") },
      { property: "og:image", content: abs(SITE.defaultImage) },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: abs("/blog") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Status Connect Blog",
          url: abs("/blog"),
          description: DESCRIPTION,
          publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
          blogPost: BLOG_POSTS.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            description: p.description,
            image: abs(p.image),
            datePublished: p.date,
            dateModified: p.updated,
            author: { "@type": "Person", name: p.author },
            url: abs(`/blog/${p.slug}`),
          })),
        }),
      },
    ],
  }),
});

function BlogIndex() {
  const [first, ...rest] = BLOG_POSTS;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.png" alt="Status Connect logo" width={32} height={32} className="h-8 w-8 rounded-md" />
            <span className="font-semibold text-foreground">Status Connect</span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Primary">
            <Link to="/about"><Button variant="ghost" size="sm">About</Button></Link>
            <Link to="/auth" search={{ mode: "register" }}><Button size="sm">Register</Button></Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">Status Connect Blog</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{DESCRIPTION}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {BLOG_POSTS.length} in-depth guides, written and maintained by {SITE.founder}.
        </p>

        {first && (
          <article className="mt-10 overflow-hidden rounded-2xl border border-border bg-card md:grid md:grid-cols-2">
            <Link to="/blog/$slug" params={{ slug: first.slug }}>
              <img src={first.image} alt={first.imageAlt} width={1200} height={630} fetchPriority="high" className="h-full w-full object-cover" />
            </Link>
            <div className="p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{first.tags[0]} · {first.readMinutes} min read</p>
              <h2 className="mt-2 text-2xl font-bold text-foreground">
                <Link to="/blog/$slug" params={{ slug: first.slug }} className="hover:text-primary">{first.title}</Link>
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{first.description}</p>
              <Link to="/blog/$slug" params={{ slug: first.slug }} className="mt-4 inline-block text-sm font-medium text-primary">Read the guide →</Link>
            </div>
          </article>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <article key={p.slug} className="overflow-hidden rounded-xl border border-border bg-card">
              <Link to="/blog/$slug" params={{ slug: p.slug }}>
                <img src={p.image} alt={p.imageAlt} width={1200} height={630} loading="lazy" className="aspect-[1200/630] w-full object-cover" />
              </Link>
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{p.tags[0]} · {p.readMinutes} min read</p>
                <h2 className="mt-2 text-lg font-semibold leading-snug text-foreground">
                  <Link to="/blog/$slug" params={{ slug: p.slug }} className="hover:text-primary">{p.title}</Link>
                </h2>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
              </div>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
