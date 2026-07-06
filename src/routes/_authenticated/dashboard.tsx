import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState<null | "first" | "new" | "full">(null);

  async function load() {
    if (!user) return;
    const [{ data: profile }, { data: latestV }, { count: totalApproved }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_code,full_name,last_download_version_number,last_download_date,total_contacts_received,status,registration_date")
        .eq("id", user.id)
        .single(),
      supabase.from("contact_versions").select("version_number,created_at").order("version_number", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
    ]);
    const latest = latestV?.version_number ?? 0;
    const lastDl = profile?.last_download_version_number ?? 0;
    let newAvailable = 0;
    if (lastDl === 0) {
      // Never downloaded — all approved contacts (except self) are new
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved")
        .neq("id", user.id);
      newAvailable = count ?? 0;
    } else if (latest > lastDl) {
      const { count } = await supabase
        .from("profiles")
        .select("id,contact_versions!inner(version_number)", { count: "exact", head: true })
        .eq("status", "approved")
        .gt("contact_versions.version_number", lastDl)
        .neq("id", user.id);
      newAvailable = count ?? 0;
    }
    setStats({
      total: totalApproved ?? 0,
      downloaded: profile?.total_contacts_received ?? 0,
      newAvailable,
      lastUpdate: latestV?.created_at ?? null,
      latestVersion: latest,
      lastDownloadVersion: lastDl,
      lastDownloadDate: profile?.last_download_date ?? null,
      userCode: profile?.user_code ?? "",
      fullName: profile?.full_name ?? "",
      status: (profile?.status as Stats["status"]) ?? "pending",
      registrationDate: profile?.registration_date ?? "",
      isFirstDownload: lastDl === 0,
    });
  }

  useEffect(() => { load(); }, [user?.id]);

  async function fetchApprovedContacts(opts: { minVersionGt?: number } = {}) {
    if (!user) return [] as { contact_seq: number; phone: string }[];
    // If filtering by version, use inner join; otherwise return all approved profiles
    // regardless of whether a contact_version has been published.
    if (opts.minVersionGt !== undefined && opts.minVersionGt > 0) {
      const { data, error } = await supabase
        .from("profiles")
        .select("contact_seq,phone,contact_versions!inner(version_number)")
        .eq("status", "approved")
        .neq("id", user.id)
        .gt("contact_versions.version_number", opts.minVersionGt)
        .order("contact_seq");
      if (error) throw error;
      return (data ?? []).map((r) => ({ contact_seq: r.contact_seq as number, phone: r.phone as string }));
    }
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

  const MIN_CONTACTS = 10;

  function tooFew(count: number) {
    toast.info(
      `Only ${count} approved contact${count === 1 ? "" : "s"} available. We need at least ${MIN_CONTACTS} before your VCF is ready — please check back in a few minutes as more members get approved.`,
    );
  }

  async function downloadFirst() {
    if (!stats) return;
    setBusy("first");
    try {
      const contacts = await fetchApprovedContacts();
      if (contacts.length < MIN_CONTACTS) { tooFew(contacts.length); return; }
      downloadVcf(
        `status-connect-community-${contacts.length}contacts-v${stats.latestVersion}.vcf`,
        generateVcf(contacts),
      );
      await recordDownload("first_community", contacts.length, 0, stats.latestVersion);
      toast.success(`Downloaded ${contacts.length} community contacts — import the .vcf to your phone`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally { setBusy(null); }
  }

  async function downloadNew() {
    if (!stats) return;
    setBusy("new");
    try {
      if (stats.latestVersion <= stats.lastDownloadVersion) { toast.info("You already have the latest contacts"); return; }
      const contacts = await fetchApprovedContacts({ minVersionGt: stats.lastDownloadVersion });
      if (contacts.length < MIN_CONTACTS) { tooFew(contacts.length); return; }
      downloadVcf(
        `status-connect-new-${contacts.length}contacts-v${stats.lastDownloadVersion + 1}-to-v${stats.latestVersion}.vcf`,
        generateVcf(contacts),
      );
      await recordDownload("new", contacts.length, stats.lastDownloadVersion, stats.latestVersion);
      toast.success(`Downloaded ${contacts.length} new contacts`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally { setBusy(null); }
  }

  async function downloadFull() {
    if (!stats) return;
    setBusy("full");
    try {
      const contacts = await fetchApprovedContacts();
      if (contacts.length < MIN_CONTACTS) { tooFew(contacts.length); return; }
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

  if (stats.status !== "approved") {
    return (
      <div className="max-w-xl mx-auto text-center py-10 space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Clock className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          {stats.status === "pending" && "Your account is awaiting approval"}
          {stats.status === "rejected" && "Your account was not approved"}
          {stats.status === "suspended" && "Your account is suspended"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {stats.status === "pending" && "An administrator will review your registration shortly. You'll be able to download community contacts once you're approved."}
          {stats.status !== "pending" && "Please contact an administrator for more information."}
        </p>
        <p className="text-xs text-muted-foreground">Your ID: <span className="font-mono">{stats.userCode}</span></p>
      </div>
    );
  }

  const noDownloadable = stats.total === 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-2xl font-semibold text-foreground">{stats.fullName}</h1>
        <p className="text-sm text-muted-foreground">Your ID: <span className="font-mono">{stats.userCode}</span></p>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {stats.newAvailable > 0
            ? `🎉 ${stats.newAvailable} new contact${stats.newAvailable === 1 ? "" : "s"} waiting for you!`
            : stats.total < 10
              ? `We're growing — ${stats.total} member${stats.total === 1 ? "" : "s"} approved so far`
              : "You're all caught up — for now"}
        </p>
        <p className="text-xs text-muted-foreground">
          {stats.newAvailable > 0
            ? "Download now to add them to your phone. New members join every day — come back tomorrow for even more."
            : "New members are being approved every day. Come back soon to download more WhatsApp contacts and grow your network."}
        </p>
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
        {stats.isFirstDownload ? (
          <Button size="lg" onClick={downloadFirst} disabled={busy !== null || noDownloadable} className="sm:col-span-2 lg:col-span-1">
            <Sparkles className="h-4 w-4 mr-2" />
            {busy === "first" ? "Preparing…" : "Download Community Contacts"}
          </Button>
        ) : (
          <Button size="lg" onClick={downloadNew} disabled={busy !== null || stats.newAvailable === 0}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            {busy === "new" ? "Preparing…" : `Download New${stats.newAvailable > 0 ? ` (${stats.newAvailable})` : ""}`}
          </Button>
        )}
        <Button size="lg" variant="outline" onClick={downloadFull} disabled={busy !== null || noDownloadable}>
          <Download className="h-4 w-4 mr-2" />
          {busy === "full" ? "Preparing…" : "Download Complete List"}
        </Button>
        {!stats.isFirstDownload && (
          <Button size="lg" variant="outline" onClick={downloadNew} disabled={busy !== null || stats.newAvailable === 0}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            New contacts
          </Button>
        )}
        <Link to="/download-history">
          <Button size="lg" variant="ghost" className="w-full">
            <History className="h-4 w-4 mr-2" /> Download History
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
        Import the downloaded .vcf file in your phone's Contacts app to add every approved community member. Your own number is never included in your own file.
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
