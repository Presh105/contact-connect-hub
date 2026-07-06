import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Download, RefreshCcw, History, Sparkles, Clock } from "lucide-react";
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
  lastDownloadDate: string | null;
  userCode: string;
  fullName: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  registrationDate: string;
  isFirstDownload: boolean;
}

const MIN_CONTACTS = 5;

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState<null | "new" | "full">(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: profile }, { data: latestV }, { count: totalApproved }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_code,full_name,last_download_version_number,last_download_date,total_contacts_received,status,registration_date")
        .eq("id", user.id)
        .single(),
      supabase.from("contact_versions").select("version_number,created_at").order("version_number", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved").neq("id", user.id),
    ]);
    const latest = latestV?.version_number ?? 0;
    const lastDl = profile?.last_download_version_number ?? 0;
    const lastDlDate = profile?.last_download_date ?? null;

    // "New" = approved contacts (excluding self) added since user's last download.
    // If the user has never downloaded, everyone approved is new.
    let newQ = supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .neq("id", user.id);
    if (lastDlDate) newQ = newQ.gt("registration_date", lastDlDate);
    const { count: newCount } = await newQ;

    setStats({
      total: totalApproved ?? 0,
      downloaded: profile?.total_contacts_received ?? 0,
      newAvailable: newCount ?? 0,
      lastUpdate: latestV?.created_at ?? null,
      latestVersion: latest,
      lastDownloadVersion: lastDl,
      lastDownloadDate: lastDlDate,
      userCode: profile?.user_code ?? "",
      fullName: profile?.full_name ?? "",
      status: (profile?.status as Stats["status"]) ?? "pending",
      registrationDate: profile?.registration_date ?? "",
      isFirstDownload: !lastDlDate,
    });
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refresh when approvals happen, new versions publish, or this user's downloads change.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_versions" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "downloads", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  async function fetchNewContacts() {
    if (!user) return [] as { contact_seq: number; phone: string }[];
    let q = supabase
      .from("profiles")
      .select("contact_seq,phone,registration_date")
      .eq("status", "approved")
      .neq("id", user.id);
    if (stats?.lastDownloadDate) q = q.gt("registration_date", stats.lastDownloadDate);
    const { data, error } = await q.order("contact_seq");
    if (error) throw error;
    return (data ?? []).map((r) => ({ contact_seq: r.contact_seq as number, phone: r.phone as string }));
  }

  async function fetchAllApproved() {
    if (!user) return [] as { contact_seq: number; phone: string }[];
    const { data, error } = await supabase
      .from("profiles")
      .select("contact_seq,phone")
      .eq("status", "approved")
      .neq("id", user.id)
      .order("contact_seq");
    if (error) throw error;
    return (data ?? []).map((r) => ({ contact_seq: r.contact_seq as number, phone: r.phone as string }));
  }

  async function recordDownload(kind: "first_community" | "new" | "complete", count: number, from: number, to: number) {
    if (!user || !stats) return;
    await supabase.from("downloads").insert({
      user_id: user.id, download_type: kind,
      from_version: from, to_version: to, contact_count: count,
    });
    await supabase.from("profiles").update({
      last_download_version_number: Math.max(stats.lastDownloadVersion, to),
      last_download_date: new Date().toISOString(),
      total_contacts_received: stats.downloaded + count,
    }).eq("id", user.id);
    await logAudit(`download_${kind}`, { count });
  }

  async function downloadNew() {
    if (!stats) return;
    setBusy("new");
    try {
      const contacts = await fetchNewContacts();
      if (contacts.length < MIN_CONTACTS) {
        toast.info(`Only ${contacts.length} new contact${contacts.length === 1 ? "" : "s"} available. We need at least ${MIN_CONTACTS} — please check back soon.`);
        return;
      }
      const kind: "first_community" | "new" = stats.isFirstDownload ? "first_community" : "new";
      const label = stats.isFirstDownload ? "community" : "new";
      downloadVcf(
        `status-connect-${label}-${contacts.length}contacts-v${stats.latestVersion}.vcf`,
        generateVcf(contacts),
      );
      await recordDownload(kind, contacts.length, stats.lastDownloadVersion, Math.max(stats.latestVersion, stats.lastDownloadVersion));
      toast.success(`Downloaded ${contacts.length} new contacts — import the .vcf to your phone`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally { setBusy(null); }
  }

  async function downloadFull() {
    if (!stats) return;
    setBusy("full");
    try {
      const contacts = await fetchAllApproved();
      if (contacts.length < MIN_CONTACTS) {
        toast.info(`Only ${contacts.length} approved contact${contacts.length === 1 ? "" : "s"} available. We need at least ${MIN_CONTACTS}.`);
        return;
      }
      downloadVcf(
        `status-connect-full-${contacts.length}contacts-v${stats.latestVersion}.vcf`,
        generateVcf(contacts),
      );
      await recordDownload("complete", contacts.length, 0, stats.latestVersion);
      toast.success(`Downloaded ${contacts.length} contacts`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally { setBusy(null); }
  }

  if (!stats) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (stats.status === "suspended") {
    return (
      <div className="max-w-xl mx-auto text-center py-10 space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Clock className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
  Your account is suspended
</h1>
        <p className="text-sm text-muted-foreground">
  Please contact an administrator for more information.
</p>
        <p className="text-xs text-muted-foreground">Your ID: <span className="font-mono">{stats.userCode}</span></p>
      </div>
    );
  }

  const canDownloadNew = stats.newAvailable >= MIN_CONTACTS;
  const noDownloadable = stats.total === 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-2xl font-semibold text-foreground">{stats.fullName}</h1>
        <p className="text-sm text-muted-foreground">Your ID: <span className="font-mono">{stats.userCode}</span></p>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-1">
        <p className="text-xs uppercase tracking-wide text-primary font-semibold">Contacts Ready to Save</p>
        {stats.newAvailable > 0 ? (
          <>
            <p className="text-2xl font-semibold text-foreground">
              {stats.newAvailable} new contact{stats.newAvailable === 1 ? "" : "s"} available
            </p>
            <p className="text-xs text-muted-foreground">
              {canDownloadNew
                ? "Tap Download Community Contacts below to add them to your phone."
                : `${MIN_CONTACTS - stats.newAvailable} more needed before your next download unlocks.`}
            </p>
          </>
        ) : (
          <p className="text-sm text-foreground">
            Please return in 30 minutes to check for newly approved community members.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Approved community members" value={stats.total} />
        <StatCard label="Current version" value={`v${stats.latestVersion}`} />
        <StatCard label="Your last version" value={stats.lastDownloadVersion ? `v${stats.lastDownloadVersion}` : "—"} />
        <StatCard label="New since last download" value={stats.newAvailable} accent />
        <StatCard label="Total contacts received" value={stats.downloaded} />
        <StatCard label="Last download" value={stats.lastDownloadDate ? new Date(stats.lastDownloadDate).toLocaleDateString() : "—"} small />
        <StatCard label="Last community update" value={stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleDateString() : "—"} small />
        <StatCard label="Registered" value={stats.registrationDate ? new Date(stats.registrationDate).toLocaleDateString() : "—"} small />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button size="lg" onClick={downloadNew} disabled={busy !== null || !canDownloadNew} className="sm:col-span-2 lg:col-span-1">
          {stats.isFirstDownload ? <Sparkles className="h-4 w-4 mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
          {busy === "new" ? "Preparing…" : `Download Community Contacts${stats.newAvailable > 0 ? ` (${stats.newAvailable})` : ""}`}
        </Button>
        <Button size="lg" variant="outline" onClick={downloadFull} disabled={busy !== null || noDownloadable}>
          <Download className="h-4 w-4 mr-2" />
          {busy === "full" ? "Preparing…" : "Download Complete List"}
        </Button>
        <Link to="/download-history">
          <Button size="lg" variant="ghost" className="w-full">
            <History className="h-4 w-4 mr-2" /> Download History
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
        Import the downloaded .vcf file in your phone's Contacts app to add every approved community member. Your own number is never included in your own file, and contacts you've already downloaded are never repeated.
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, small }: { label: string; value: number | string; accent?: boolean; small?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold text-foreground ${small ? "text-base" : "text-2xl"}`}>{value}</p>
    </div>
  );
}
