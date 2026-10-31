import type { ReactNode } from "react";
import { slugify } from "@/lib/blog-posts";

/** Inline: **bold** and [text](url). */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) {
      out.push(<strong key={k++} className="font-semibold text-foreground">{t.slice(2, -2)}</strong>);
    } else {
      const [, label, href] = t.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      const external = /^https?:\/\//.test(href);
      out.push(
        <a
          key={k++}
          href={href}
          className="font-medium text-primary underline underline-offset-2"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {label}
        </a>,
      );
    }
    last = m.index! + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function BlogBody({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/);
  return (
    <div className="mt-8 space-y-5">
      {blocks.map((block, i) => {
        const b = block.trim();
        if (b.startsWith("## "))
          return (
            <h2 key={i} id={slugify(b.slice(3))} className="scroll-mt-20 pt-6 text-2xl font-bold text-foreground">
              {b.slice(3)}
            </h2>
          );
        if (b.startsWith("### "))
          return <h3 key={i} className="pt-2 text-lg font-semibold text-foreground">{b.slice(4)}</h3>;
        const img = b.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (img)
          return (
            <figure key={i} className="my-2">
              <img src={img[2]} alt={img[1]} loading="lazy" decoding="async" width={1200} height={630} className="w-full h-auto rounded-xl border border-border" />
              <figcaption className="mt-2 text-center text-xs text-muted-foreground">{img[1]}</figcaption>
            </figure>
          );
        if (b.startsWith("> "))
          return (
            <aside key={i} className="rounded-xl border-l-4 border-primary bg-primary/5 p-4 text-sm leading-7 text-foreground">
              {inline(b.replace(/^> ?/gm, "").replace(/\n/g, " "))}
            </aside>
          );
        const lines = b.split("\n");
        if (lines.every((l) => /^- /.test(l)))
          return (
            <ul key={i} className="list-disc space-y-2 pl-6 text-base leading-7 text-muted-foreground">
              {lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}
            </ul>
          );
        if (lines.every((l) => /^\d+\. /.test(l)))
          return (
            <ol key={i} className="list-decimal space-y-2 pl-6 text-base leading-7 text-muted-foreground">
              {lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\. /, ""))}</li>)}
            </ol>
          );
        return <p key={i} className="text-base leading-8 text-muted-foreground">{inline(b.replace(/\n/g, " "))}</p>;
      })}
    </div>
  );
}
