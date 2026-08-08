import { createFileRoute, Link } from "@tanstack/react-router";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { Button } from "@/components/ui/button";

const TITLE = "Status Connect Blog — WhatsApp Growth Guides for Nigerian Businesses";
const DESCRIPTION =
  "Practical guides on WhatsApp Status marketing, VCF contact imports, and growing a Nigerian small business network the safe, compliant way.";

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/blog" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Status Connect Blog",
          description: DESCRIPTION,
          blogPost: BLOG_POSTS.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            description: p.description,
            datePublished: p.date,
            url: `/blog/${p.slug}`,
          })),
        }),
      },
    ],
  }),
});

function BlogIndex() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.png" alt="Status Connect logo" width={32} height={32} className="h-8 w-8 rounded-md" />
            <span className="font-semibold text-foreground">Status Connect</span>
          </Link>
          <Link to="/auth" search={{ mode: "register" }}><Button size="sm">Register</Button></Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Status Connect Blog</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">{DESCRIPTION}</p>

        <div className="mt-10 grid gap-4">
          {BLOG_POSTS.map((p) => (
            <article key={p.slug} className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {new Date(p.date).toLocaleDateString()} · {p.readMinutes} min read
              </p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">
                <Link to="/blog/$slug" params={{ slug: p.slug }} className="hover:text-primary">
                  {p.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
              <Link to="/blog/$slug" params={{ slug: p.slug }} className="mt-3 inline-block text-sm font-medium text-primary">
                Read article →
              </Link>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
