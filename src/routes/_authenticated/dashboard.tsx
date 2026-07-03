import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Download, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { generateVcf, downloadVcf } from "@/lib/vcf";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

interface Stats {
  total: number;
  downloaded: number;
  newAvailable: number;
  lastUpdate: string | null;
  latestVersion: number;
  lastDownloadVersion: number;
  userCode: string;
  fullName: string;
}

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState<null | "new" | "full">(null);

  async function load() {
    if (!user) return;
    const [{ data: profile }, { data: latestV }, { count: totalActive }] = await Promise.all([
      supabase.from("profiles").select("user_code,full_name,last_download_version_number,total_contacts_received").eq("id", user.id).single(),
      supabase.from("contact_versions").select("version_number,created_at").order("version_number", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true).not("version_id", "is", null),
    ]);
    const latest = latestV?.version_number ?? 0;
    const lastDl = profile?.last_download_version_number ?? 0;
    let newAvailable = 0;
    if (latest > lastDl) {
      const { count } = await supabase
        .from("profiles")
        .select("id,contact_versions!inner(version_number)", { count: "exact", head: true })
        .eq("is_active", true)
        .gt("contact_versions.version_number", lastDl);
      newAvailable = count ?? 0;
    }
    setStats({
      total: totalActive ?? 0,
      downloaded: profile?.total_contacts_received ?? 0,
      newAvailable,
      lastUpdate: latestV?.created_at ?? null,
      latestVersion: latest,
      lastDownloadVersion: lastDl,
      userCode: profile?.user_code ?? "",
      fullName: profile?.full_name ?? "",
    });
  }

  useEffect(() => { load(); }, [user?.id]);

  async function downloadNew() {
    if (!user || !stats) return;
    setBusy("new");
    try {
      if (stats.latestVersion <= stats.lastDownloadVersion) {
        toast.info("You already have the latest contacts");
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("user_code,phone,contact_versions!inner(version_number)")
        .eq("is_active", true)
        .gt("contact_versions.version_number", stats.lastDownloadVersion)
        .order("contact_seq");
      if (error) throw error;
      const contacts = (data ?? []).map((r) => ({ user_code: r.user_code, phone: r.phone }));
      if (contacts.length === 0) {
        toast.info("No new contacts");
        return;
      }
      const vcf = generateVcf(contacts);
      downloadVcf(`status-connect-new-v${stats.lastDownloadVersion + 1}-to-v${stats.latestVersion}.vcf`, vcf);
      await supabase.from("profiles").update({
        last_download_version_number: stats.latestVersion,
        last_download_date: new Date().toISOString(),
        total_contacts_received: stats.downloaded + contacts.length,
      }).eq("id", user.id);
      await supabase.from("downloads").insert({
        user_id: user.id, download_type: "new",
        from_version: stats.lastDownloadVersion, to_version: stats.latestVersion,
        contact_count: contacts.length,
      });
      await logAudit("download_new", { count: contacts.length });
      toast.success(`Downloaded ${contacts.length} new contacts`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally { setBusy(null); }
  }

  async function downloadFull() {
    if (!user || !stats) return;
    setBusy("full");
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_code,phone")
        .eq("is_active", true)
        .not("version_id", "is", null)
        .order("contact_seq");
      if (error) throw error;
      const contacts = data ?? [];
      if (contacts.length === 0) { toast.info("No contacts yet"); return; }
      const vcf = generateVcf(contacts);
      downloadVcf(`status-connect-full-v${stats.latestVersion}.vcf`, vcf);
      await supabase.from("downloads").insert({
        user_id: user.id, download_type: "complete",
        from_version: 0, to_version: stats.latestVersion,
        contact_count: contacts.length,
      });
      await logAudit("download_complete", { count: contacts.length });
      toast.success(`Downloaded ${contacts.length} contacts`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally { setBusy(null); }
  }

  if (!stats) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-2xl font-semibold text-foreground">{stats.fullName}</h1>
        <p className="text-sm text-muted-foreground">Your ID: <span className="font-mono">{stats.userCode}</span></p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Community contacts" value={stats.total} />
        <StatCard label="You've downloaded" value={stats.downloaded} />
        <StatCard label="New since last download" value={stats.newAvailable} accent />
        <StatCard label="Last contact update" value={stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleDateString() : "—"} small />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button size="lg" onClick={downloadNew} disabled={busy !== null || stats.newAvailable === 0}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          {busy === "new" ? "Preparing…" : `Download New Contacts${stats.newAvailable > 0 ? ` (${stats.newAvailable})` : ""}`}
        </Button>
        <Button size="lg" variant="outline" onClick={downloadFull} disabled={busy !== null || stats.total === 0}>
          <Download className="h-4 w-4 mr-2" />
          {busy === "full" ? "Preparing…" : "Download Complete Contact List"}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <p><strong className="text-foreground">Latest version:</strong> v{stats.latestVersion}</p>
        <p><strong className="text-foreground">Your last download:</strong> v{stats.lastDownloadVersion || "—"}</p>
        <p className="mt-2 text-xs">Import the downloaded .vcf file in your phone's Contacts app to add every member.</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, small }: { label: string; value: number | string; accent?: boolean; small?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold text-foreground ${small ? "text-lg" : "text-2xl"}`}>{value}</p>
    </div>
  );
}
