import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Download, FileDown, Users, CalendarClock, Sparkles, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/download-history")({
  component: DownloadHistory,
});

interface Row {
  id: string;
  download_type: string;
  from_version: number;
  to_version: number;
  contact_count: number;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  first_community: "First Community Download",
  new: "New Contacts",
  complete: "Complete Contact List",
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function DownloadHistory() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [latestVersion, setLatestVersion] = useState(0);
  const [myVersion, setMyVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("downloads").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("contact_versions").select("version_number").order("version_number", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("profiles").select("last_download_version_number").eq("id", user.id).maybeSingle(),
    ]).then(([d, v, p]) => {
      setRows((d.data as Row[]) ?? []);
      setLatestVersion(v.data?.version_number ?? 0);
      setMyVersion(p.data?.last_download_version_number ?? 0);
      setLoaded(true);
    });
  }, [user?.id]);

  const filtered = useMemo(() => {
    let r = rows;
    if (type !== "all") r = r.filter((x) => x.download_type === type);
    if (search) {
      const s = search.toLowerCase();
      r = r.filter((x) => (TYPE_LABEL[x.download_type] ?? x.download_type).toLowerCase().includes(s) || `v${x.to_version}`.includes(s));
    }
    r = [...r].sort((a, b) => order === "desc"
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return r;
  }, [rows, search, type, order]);

  const totalContacts = rows.reduce((n, r) => n + (r.contact_count || 0), 0);
  const last = rows[0];
  const behind = Math.max(0, latestVersion - myVersion);

  function exportCsv() {
    const lines = ["Date,Type,Version,Contacts"];
    for (const r of filtered) {
      const ver = r.download_type === "new" ? `v${r.from_version + 1}-v${r.to_version}` : `v${r.to_version}`;
      lines.push([new Date(r.created_at).toISOString(), TYPE_LABEL[r.download_type] ?? r.download_type, ver, r.contact_count].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "status-connect-download-history.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Download History</h1>
        <p className="text-sm text-muted-foreground">Your record of every contact file you've downloaded, so you always know what you already have and what's new.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <Download className="h-4 w-4 text-primary" />
          <p className="mt-2 text-2xl font-semibold text-foreground">{rows.length}</p>
          <p className="text-xs text-muted-foreground">Downloads</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <Users className="h-4 w-4 text-primary" />
          <p className="mt-2 text-2xl font-semibold text-foreground">{totalContacts.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Contacts received</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <CalendarClock className="h-4 w-4 text-primary" />
          <p className="mt-2 text-lg font-semibold text-foreground">{last ? fmtDate(last.created_at) : "—"}</p>
          <p className="text-xs text-muted-foreground">Last download</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="mt-2 text-lg font-semibold text-foreground">v{myVersion} of v{latestVersion}</p>
          <p className="text-xs text-muted-foreground">Your version</p>
        </div>
      </div>

      {loaded && behind > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            <strong>{behind} newer contact {behind === 1 ? "version is" : "versions are"} available.</strong>{" "}
            Download them from your dashboard, then save the file to your phone so your Status reaches more people.
          </p>
          <Link to="/dashboard"><Button size="sm">Go to dashboard</Button></Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search by type or version…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="all">All types</option>
          <option value="first_community">First community</option>
          <option value="new">New contacts</option>
          <option value="complete">Complete list</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => setOrder((o) => (o === "desc" ? "asc" : "desc"))}>
          <ArrowUpDown className="mr-1 h-4 w-4" /> {order === "desc" ? "Newest" : "Oldest"}
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
          <FileDown className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Type</th>
              <th className="p-3">Version</th>
              <th className="p-3 text-right">Contacts</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3">{TYPE_LABEL[r.download_type] ?? r.download_type}</td>
                <td className="p-3 font-mono text-xs">
                  {r.download_type === "new" ? `v${r.from_version + 1}–v${r.to_version}` : `v${r.to_version}`}
                </td>
                <td className="p-3 text-right font-semibold">{r.contact_count}</td>
              </tr>
            ))}
            {loaded && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  {rows.length === 0 ? (
                    <>
                      You haven't downloaded any contacts yet.{" "}
                      <Link to="/dashboard" className="font-medium text-primary underline underline-offset-2">Download your first list</Link>
                    </>
                  ) : "No downloads match your filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><BookOpen className="h-4 w-4" /> After you download</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          <li>• <a className="text-primary underline underline-offset-2" href="/blog/vcf-file-explained-import-contacts-android-iphone">How to import your VCF file on Android or iPhone</a></li>
          <li>• <a className="text-primary underline underline-offset-2" href="/blog/fix-vcf-import-not-working-android">Import not working or contacts missing in WhatsApp? Fix it</a></li>
          <li>• <a className="text-primary underline underline-offset-2" href="/blog/how-to-increase-whatsapp-status-views-in-nigeria">Turn your new contacts into more Status views</a></li>
        </ul>
      </div>
    </div>
  );
}
