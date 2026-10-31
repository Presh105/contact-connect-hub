import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { getPost, getRelatedPosts, getHeadings, slugify, REDIRECTS } from "@/lib/blog-posts";
import { SITE, abs } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { BlogBody } from "@/components/blog-body";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const target = REDIRECTS[params.slug];
    if (target) throw redirect({ to: "/blog/$slug", params: { slug: target }, statusCode: 301 });
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  component: BlogPostPage,
  errorComponent: () => <Missing />,
  notFoundComponent: () => <Missing />,
  head: ({ params, loaderData }) => {
    const post = loaderData?.post ?? getPost(params.slug);
    const title = post ? `${post.title} | ${SITE.name}` : `Article | ${SITE.name}`;
    const full = post?.description ?? "Status Connect article.";
    const description = full.length > 158 ? full.slice(0, 155).replace(/\s+\S*$/, "") + "..." : full;
    const url = abs(`/blog/${params.slug}`);
    const image = post ? abs(post.image) : abs(SITE.defaultImage);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        ...(post
          ? [
              { property: "article:published_time", content: post.date },
              { property: "article:modified_time", content: post.updated },
              { property: "article:author", content: post.author },
            ]
          : []),
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: post
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": [
                  {
                    "@type": "BlogPosting",
                    headline: post.title,
                    description: post.description,
                    image: [image],
                    datePublished: post.date,
                    dateModified: post.updated,
                    wordCount: post.wordCount,
                    keywords: post.tags.join(", "),
                    inLanguage: "en-NG",
                    author: { "@type": "Person", name: post.author, url: abs("/about") },
                    publisher: {
                      "@type": "Organization",
                      name: SITE.name,
                      logo: { "@type": "ImageObject", url: abs(SITE.logo) },
                    },
                    mainEntityOfPage: url,
                  },
                  {
                    "@type": "BreadcrumbList",
                    itemListElement: [
                      { "@type": "ListItem", position: 1, name: "Home", item: abs("/") },
                      { "@type": "ListItem", position: 2, name: "Blog", item: abs("/blog") },
                      { "@type": "ListItem", position: 3, name: post.title, item: url },
                    ],
                  },
                ],
              }),
            },
          ]
        : [],
    };
  },
});

function Missing() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Article not found</h1>
      <Link to="/blog" className="mt-4 inline-block text-primary">Back to the blog</Link>
    </div>
  );
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function BlogPostPage() {
  const { post } = Route.useLoaderData();
  const others = getRelatedPosts(post.slug, 4);
  const headings = getHeadings(post.body);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.png" alt="Status Connect logo" width={32} height={32} className="h-8 w-8 rounded-md" />
            <span className="font-semibold text-foreground">Status Connect</span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Primary">
            <Link to="/blog"><Button variant="ghost" size="sm">Blog</Button></Link>
            <Link to="/auth" search={{ mode: "register" }}><Button size="sm">Register</Button></Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link> / <Link to="/blog" className="hover:text-foreground">Blog</Link>
        </nav>

        <article className="mt-6">
          <header>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {post.tags[0]} · {post.readMinutes} min read
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground md:text-4xl">{post.title}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              By <Link to="/about" className="font-medium text-foreground underline underline-offset-2">{post.author}</Link>
              {" · "}Published {fmt(post.date)}
              {post.updated !== post.date && <> · Updated {fmt(post.updated)}</>}
            </p>
          </header>

          <img
            src={post.image}
            alt={post.imageAlt}
            width={1200}
            height={630}
            fetchPriority="high"
            decoding="async"
            className="mt-6 w-full h-auto rounded-xl border border-border"
          />

          {post.takeaways.length > 0 && (
            <section className="mt-8 rounded-xl border border-border bg-card p-5" aria-label="Key takeaways">
              <h2 className="text-base font-semibold text-foreground">Key takeaways</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground">
                {post.takeaways.map((t: string) => <li key={t}>{t}</li>)}
              </ul>
            </section>
          )}

          {headings.length > 2 && (
            <nav aria-label="Table of contents" className="mt-6 text-sm">
              <h2 className="font-semibold text-foreground">In this guide</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                {headings.map((h: string) => (
                  <li key={h}><a href={`#${slugify(h)}`} className="hover:text-primary">{h}</a></li>
                ))}
              </ol>
            </nav>
          )}

          <BlogBody body={post.body} />

          {post.takeaways.length > 0 && (
            <figure className="mt-10">
              <img
                src={post.inlineImage}
                alt={`Summary graphic: ${post.takeaways.join("; ")}`}
                loading="lazy"
                decoding="async"
                width={1200}
                height={630}
                className="w-full h-auto rounded-xl border border-border"
              />
              <figcaption className="mt-2 text-center text-xs text-muted-foreground">Quick recap: {post.title}</figcaption>
            </figure>
          )}
        </article>

        <section className="mt-12 flex gap-4 rounded-xl border border-border bg-card p-5">
          <img src="/favicon.png" alt="" width={56} height={56} className="h-14 w-14 rounded-full" />
          <div>
            <p className="font-semibold text-foreground">{SITE.founder} <span className="font-normal text-muted-foreground">· {SITE.founderRole}</span></p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{SITE.founderBio} Questions? <Link to="/contact" className="text-primary underline underline-offset-2">Get in touch</Link>.</p>
          </div>
        </section>

        <div className="mt-10 rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
          <h2 className="text-xl font-semibold text-foreground">Grow your WhatsApp network today</h2>
          <p className="mt-2 text-sm text-muted-foreground">Join verified Nigerian business owners exchanging contacts on Status Connect.</p>
          <Link to="/auth" search={{ mode: "register" }}>
            <Button className="mt-4 rounded-full px-6">Register free</Button>
          </Link>
        </div>

        {others.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-foreground">Keep reading</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {others.map((p) => (
                <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="group overflow-hidden rounded-xl border border-border bg-card">
                  <img src={p.image} alt={p.imageAlt} loading="lazy" width={1200} height={630} className="aspect-[1200/630] w-full object-cover" />
                  <p className="p-3 text-sm font-medium text-foreground group-hover:text-primary">{p.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
