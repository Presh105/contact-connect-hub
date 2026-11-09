import { useMemo, useState } from "react";
import { Copy, ExternalLink, Calculator, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

/** "0813 000 0000", "+234 813…", "813…" → "2348130000000" (Nigerian numbers). */
function normalizeNg(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("234")) return d;
  if (d.startsWith("0")) return "234" + d.slice(1);
  if (d.length === 10) return "234" + d;
  return d;
}

const naira = (n: number) =>
  Number.isFinite(n) ? "₦" + Math.round(n).toLocaleString("en-NG") : "–";

function LinkGenerator() {
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("Hello, I saw your Status and I'd like to know more.");
  const num = normalizeNg(phone);
  const valid = /^234\d{10}$/.test(num);
  const link = valid ? `https://wa.me/${num}${msg.trim() ? `?text=${encodeURIComponent(msg.trim())}` : ""}` : "";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground"><Link2 className="h-5 w-5" /> WhatsApp link generator</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Make a link that opens a chat with your number and a ready-typed message. Put it in your Instagram bio, flyers, receipts or Google profile.
      </p>
      <div className="mt-4 space-y-3">
        <Input inputMode="tel" placeholder="Your number, e.g. 0813 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Textarea rows={3} placeholder="Message customers will send you" value={msg} onChange={(e) => setMsg(e.target.value)} />
        <div className="break-all rounded-md bg-muted p-3 text-sm">
          {link || <span className="text-muted-foreground">Enter a valid Nigerian number to see your link.</span>}
        </div>
        <div className="flex gap-2">
          <Button disabled={!link} onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Link copied"))}>
            <Copy className="mr-2 h-4 w-4" /> Copy link
          </Button>
          <Button variant="outline" disabled={!link} onClick={() => window.open(link, "_blank", "noopener")}>
            <ExternalLink className="mr-2 h-4 w-4" /> Test it
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProfitCalculator() {
  const [cost, setCost] = useState("");
  const [extra, setExtra] = useState("");
  const [margin, setMargin] = useState("30");
  const [price, setPrice] = useState("");

  const r = useMemo(() => {
    const c = parseFloat(cost) || 0;
    const e = parseFloat(extra) || 0;
    const total = c + e;
    const m = Math.min(Math.max(parseFloat(margin) || 0, 0), 95) / 100;
    const suggested = total > 0 ? total / (1 - m) : NaN;
    const p = parseFloat(price);
    const profit = p > 0 ? p - total : NaN;
    return { total, suggested, profit, realMargin: p > 0 ? (profit / p) * 100 : NaN, markup: total > 0 && p > 0 ? (profit / total) * 100 : NaN };
  }, [cost, extra, margin, price]);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground"><Calculator className="h-5 w-5" /> Price and profit calculator</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Work out the price that covers your real costs, or check the profit on a price you already use. Amounts are in naira.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-xs text-muted-foreground">Cost of item (₦)
          <Input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="8000" />
        </label>
        <label className="text-xs text-muted-foreground">Packaging, delivery, data (₦)
          <Input inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="1500" />
        </label>
        <label className="text-xs text-muted-foreground">Profit margin you want (%)
          <Input inputMode="decimal" value={margin} onChange={(e) => setMargin(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground">Or your selling price (₦)
          <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="13500" />
        </label>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-muted p-3"><dt className="text-xs text-muted-foreground">Total cost</dt><dd className="font-semibold">{naira(r.total)}</dd></div>
        <div className="rounded-md bg-muted p-3"><dt className="text-xs text-muted-foreground">Suggested price</dt><dd className="font-semibold">{naira(r.suggested)}</dd></div>
        <div className="rounded-md bg-muted p-3"><dt className="text-xs text-muted-foreground">Profit at your price</dt><dd className="font-semibold">{naira(r.profit)}</dd></div>
        <div className="rounded-md bg-muted p-3">
          <dt className="text-xs text-muted-foreground">Margin / markup</dt>
          <dd className="font-semibold">{Number.isFinite(r.realMargin) ? `${r.realMargin.toFixed(0)}% / ${r.markup.toFixed(0)}%` : "–"}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        Margin is profit as a share of the selling price. Markup is profit as a share of your cost. Read the full guide on <a className="underline" href="/blog/how-to-price-products-on-whatsapp-nigeria">pricing products on WhatsApp</a>.
      </p>
    </div>
  );
}

export function FreeTools() {
  return (
    <section aria-labelledby="free-tools" className="mx-auto max-w-6xl px-4 py-14">
      <h2 id="free-tools" className="text-2xl font-bold text-foreground md:text-3xl">Free tools for WhatsApp sellers</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        No sign-up needed. Both tools run on your phone and nothing you type is saved or sent to us.
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <LinkGenerator />
        <ProfitCalculator />
      </div>
    </section>
  );
}
