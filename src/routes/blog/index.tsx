import { createFileRoute, Link } from "@tanstack/react-router";
import { BLOG_POSTS, CATEGORIES } from "@/lib/blog-posts";
import { SITE, abs } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const TITLE = "WhatsApp Marketing & Business Guides for Nigeria | Status Connect Blog";
const DESCRIPTION =
  "In-depth, practical guides on WhatsApp Status marketing, WhatsApp Business setup, VCF contact imports, safe payments and growing a Nigerian small business.";

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
  validateSearch: (s: Record<string, unknown>): { category?: string } => ({
    category: typeof s.category === "string" && (CATEGORIES as readonly string[]).includes(s.category) ? s.category : undefined,
  }),
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
  const { category } = Route.useSearch();
  const list = category ? BLOG_POSTS.filter((p) => p.category === category) : BLOG_POSTS;
  const [first, ...rest] = list;
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">Status Connect Blog</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{DESCRIPTION}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {BLOG_POSTS.length} in-depth guides, written and maintained by {SITE.founder}.
        </p>

        <nav aria-label="Blog categories" className="mt-6 flex flex-wrap gap-2">
          <Link to="/blog" search={{}} className={`rounded-full border px-4 py-1.5 text-sm ${!category ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
            All ({BLOG_POSTS.length})
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c} to="/blog" search={{ category: c }} className={`rounded-full border px-4 py-1.5 text-sm ${category === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {c} ({BLOG_POSTS.filter((p) => p.category === c).length})
            </Link>
          ))}
        </nav>

        {first && (
          <article className="mt-10 overflow-hidden rounded-2xl border border-border bg-card md:grid md:grid-cols-2">
            <Link to="/blog/$slug" params={{ slug: first.slug }}>
              <img src={first.image} alt={first.imageAlt} width={1200} height={630} fetchPriority="high" className="h-full w-full object-cover" />
            </Link>
            <div className="p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{first.category} · {first.readMinutes} min read</p>
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
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{p.category} · {p.readMinutes} min read</p>
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
