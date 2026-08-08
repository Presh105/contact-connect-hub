import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPost, BLOG_POSTS } from "@/lib/blog-posts";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  component: BlogPostPage,
  errorComponent: () => <Missing />,
  notFoundComponent: () => <Missing />,
  head: ({ params, loaderData }) => {
    const post = loaderData?.post ?? getPost(params.slug);
    const title = post ? `${post.title} — Status Connect` : "Article — Status Connect";
    const description = post?.description ?? "Status Connect article.";
    const url = `/blog/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: post
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                headline: post.title,
                description: post.description,
                datePublished: post.date,
                keywords: post.tags.join(", "),
                author: { "@type": "Organization", name: "Status Connect" },
                publisher: { "@type": "Organization", name: "Status Connect" },
                mainEntityOfPage: url,
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

function BlogPostPage() {
  const { post } = Route.useLoaderData();
  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.png" alt="Status Connect logo" width={32} height={32} className="h-8 w-8 rounded-md" />
            <span className="font-semibold text-foreground">Status Connect</span>
          </Link>
          <Link to="/auth" search={{ mode: "register" }}><Button size="sm">Register</Button></Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link to="/blog" className="text-sm text-primary">← All articles</Link>
        <p className="mt-6 text-xs uppercase tracking-wide text-muted-foreground">
          {new Date(post.date).toLocaleDateString()} · {post.readMinutes} min read
        </p>
        <h1 className="mt-2 text-3xl md:text-4xl font-bold text-foreground leading-tight">{post.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>

        <div className="mt-8 space-y-4">
          {post.body.map((para, i) =>
            para.startsWith("## ") ? (
              <h2 key={i} className="pt-4 text-xl font-semibold text-foreground">{para.slice(3)}</h2>
            ) : (
              <p key={i} className="text-base leading-relaxed text-muted-foreground">{para}</p>
            ),
          )}
        </div>

        <div className="mt-12 rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
          <h2 className="text-xl font-semibold text-foreground">Grow your WhatsApp network today</h2>
          <p className="mt-2 text-sm text-muted-foreground">Join verified Nigerian business owners exchanging contacts on Status Connect.</p>
          <Link to="/auth" search={{ mode: "register" }}>
            <Button className="mt-4 rounded-full px-6">Register free</Button>
          </Link>
        </div>

        {others.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-foreground">Keep reading</h2>
            <ul className="mt-3 space-y-2">
              {others.map((p) => (
                <li key={p.slug}>
                  <Link to="/blog/$slug" params={{ slug: p.slug }} className="text-sm text-primary">{p.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
