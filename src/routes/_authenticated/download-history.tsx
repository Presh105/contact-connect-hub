import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

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

function DownloadHistory() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    if (!user) return;
    supabase.from("downloads").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as Row[]) ?? []));
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Download History</h1>
        <p className="text-sm text-muted-foreground">Every contact download you've made, permanently recorded.</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Search by type or version…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="all">All types</option>
          <option value="first_community">First community</option>
          <option value="new">New contacts</option>
          <option value="complete">Complete list</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => setOrder((o) => (o === "desc" ? "asc" : "desc"))}>
          <ArrowUpDown className="h-4 w-4 mr-1" /> {order === "desc" ? "Newest" : "Oldest"}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
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
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No downloads yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
