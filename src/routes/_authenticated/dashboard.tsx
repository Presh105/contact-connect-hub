import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { RefreshCcw, History, Sparkles, Clock, Bell, Crown, ShieldCheck, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { generateVcf, generateNamedVcf, downloadVcf } from "@/lib/vcf";
import { logAudit } from "@/lib/audit";
import { toYouTubeEmbed } from "@/lib/youtube";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Membership = "freemium" | "premium";

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
  membership: Membership;
  registrationDate: string;
  isFirstDownload: boolean;
}

interface Downloader {
  id: string;
  downloaded_at: string;
  phone: string;
  user_code: string;
  full_name: string;
}

const MIN_CONTACTS = 5;
const ACTIVE_WINDOW_DAYS = 7;

/** A member counts as active if they logged in within the last 7 days (or just registered). */
function isRecentlyActive(row: { last_login_at?: string | null; registration_date?: string | null }) {
  const cutoff = Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const stamp = row.last_login_at ?? row.registration_date;
  if (!stamp) return false;
  return new Date(stamp).getTime() >= cutoff;
}

function maskPhone(p: string) {
  const s = p.trim();
  if (s.length <= 4) return "•••" + s;
  return s.slice(0, Math.min(4, s.length - 4)) + "••••" + s.slice(-2);
}


function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState<null | "new" | "full" | "network">(null);
  const [downloaders, setDownloaders] = useState<Downloader[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;

    const [{ data: profile }, { data: latestV }, { data: activeRows }, { data: setting }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_code,full_name,last_download_version_number,last_download_date,total_contacts_received,status,membership,registration_date")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("contact_versions").select("version_number,created_at").order("version_number", { ascending: false }).limit(1).maybeSingle(),
      supabase
        .from("profiles")
        .select("id,last_login_at,registration_date")
        .eq("status", "approved")
        .neq("id", user.id),
      supabase.from("app_settings").select("value").eq("key", "tutorial_video_url").maybeSingle(),
    ]);

    setVideoUrl(toYouTubeEmbed((setting?.value as string) ?? ""));

    const { data: delivered } = await supabase
      .from("user_downloaded_contacts")
      .select("contact_id")
      .eq("user_id", user.id);
    const deliveredIds = new Set((delivered ?? []).map((r) => r.contact_id as string));

    // Only members who logged in within the last 7 days are eligible for community VCFs.
    const eligible = (activeRows ?? []).filter((r) =>
      isRecentlyActive(r as { last_login_at?: string | null; registration_date?: string | null }),
    );
    const totalActive = eligible.length;
    const newCount = eligible.filter((r) => !deliveredIds.has(r.id as string)).length;

    setStats({
      total: totalActive,

      downloaded: profile?.total_contacts_received ?? 0,
      newAvailable: newCount,
      lastUpdate: latestV?.created_at ?? null,
      latestVersion: latestV?.version_number ?? 0,
      lastDownloadVersion: profile?.last_download_version_number ?? 0,
      lastDownloadDate: profile?.last_download_date ?? null,
      userCode: profile?.user_code ?? "",
      fullName: profile?.full_name ?? "",
      status: (profile?.status as Stats["status"]) ?? "approved",
      membership: ((profile as { membership?: Membership } | null)?.membership ?? "freemium") as Membership,
      registrationDate: profile?.registration_date ?? "",
      isFirstDownload: deliveredIds.size === 0,
    });

    // People who received / saved this user's contact
    const { data: dlRows } = await supabase
      .from("user_downloaded_contacts")
      .select("id,downloaded_at,user_id")
      .eq("contact_id", user.id)
      .order("downloaded_at", { ascending: false })
      .limit(200);
    const ids = Array.from(new Set((dlRows ?? []).map((r) => r.user_id as string)));
    let profilesById = new Map<string, { phone: string; user_code: string; full_name: string }>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,phone,user_code,full_name")
        .in("id", ids);
      profilesById = new Map(
        (profs ?? []).map((p) => [
          p.id as string,
          { phone: p.phone as string, user_code: p.user_code as string, full_name: p.full_name as string },
        ]),
      );
    }
    setDownloaders(
      (dlRows ?? []).map((r) => {
        const p = profilesById.get(r.user_id as string);
        return {
          id: r.id as string,
          downloaded_at: r.downloaded_at as string,
          phone: p?.phone ?? "",
          user_code: p?.user_code ?? "—",
          full_name: p?.full_name ?? "",
        };
      }),
    );
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_versions" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_downloaded_contacts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  async function fetchUndeliveredContacts() {
    if (!user) return [] as { id: string; contact_seq: number; phone: string }[];
    const { data: delivered } = await supabase
      .from("user_downloaded_contacts")
      .select("contact_id")
      .eq("user_id", user.id);
    const deliveredIds = (delivered ?? []).map((r) => r.contact_id as string);

    let q = supabase
      .from("profiles")
      .select("id,contact_seq,phone,last_login_at,registration_date")
      .eq("status", "approved")
      .neq("id", user.id);
    if (deliveredIds.length) {
      q = q.not("id", "in", `(${deliveredIds.join(",")})`);
    }
    const { data, error } = await q.order("contact_seq");
    if (error) throw error;
    return (data ?? [])
      .filter((r) => isRecentlyActive(r as { last_login_at?: string | null; registration_date?: string | null }))
      .map((r) => ({
        id: r.id as string,
        contact_seq: r.contact_seq as number,
        phone: r.phone as string,
      }));

  }

  async function recordDelivery(contacts: { id: string }[], kind: "first_community" | "new" | "complete") {
    if (!user || !stats || contacts.length === 0) return;
    const rows = contacts.map((c) => ({ user_id: user.id, contact_id: c.id }));
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await supabase.from("user_downloaded_contacts").upsert(rows.slice(i, i + CHUNK), {
        onConflict: "user_id,contact_id",
        ignoreDuplicates: true,
      });
    }
    await supabase.from("downloads").insert({
      user_id: user.id,
      download_type: kind,
      from_version: stats.lastDownloadVersion,
      to_version: Math.max(stats.latestVersion, stats.lastDownloadVersion),
      contact_count: contacts.length,
    });
    await supabase.from("profiles").update({
      last_download_version_number: Math.max(stats.lastDownloadVersion, stats.latestVersion),
      last_download_date: new Date().toISOString(),
      total_contacts_received: stats.downloaded + contacts.length,
    }).eq("id", user.id);
    await logAudit(`download_${kind}`, { count: contacts.length });
  }

  async function downloadNew() {
    if (!stats) return;
    setBusy("new");
    try {
      const contacts = await fetchUndeliveredContacts();
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
      await recordDelivery(contacts, kind);
      toast.success(`Downloaded ${contacts.length} new contacts — import the .vcf to your phone`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally { setBusy(null); }
  }

  /** Premium: download the reciprocal network — members who saved your number. */
  /** Premium: download the reciprocal network — members who received your number. */
  async function downloadNetwork() {
    if (!stats) return;
    setBusy("network");
    try {
      const entries = downloaders
        .filter((d) => d.phone)
        .map((d) => ({ name: `Status Connect ${d.user_code}`, phone: d.phone }));
      if (entries.length === 0) {
        toast.info("No saves yet — your reciprocal network will appear here.");
        return;
      }
      downloadVcf(`status-connect-network-${entries.length}contacts.vcf`, generateNamedVcf(entries));
      await logAudit("download_reciprocal_network", { count: entries.length });
      toast.success(`Downloaded ${entries.length} reciprocal contacts`);
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
        <h1 className="text-2xl font-semibold text-foreground">Your account is suspended</h1>
        <p className="text-sm text-muted-foreground">Please contact an administrator for more information.</p>
        <p className="text-xs text-muted-foreground">Your ID: <span className="font-mono">{stats.userCode}</span></p>
      </div>
    );
  }

  const canDownloadNew = stats.newAvailable >= MIN_CONTACTS;
  const isPremium = stats.membership === "premium";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">{stats.fullName}</h1>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${isPremium ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {isPremium ? <Crown className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {isPremium ? "Premium member" : "Freemium member"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">Your ID: <span className="font-mono">{stats.userCode}</span></p>
      </div>

      {isPremium ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-primary font-semibold">Your Reciprocal Network</p>
          <p className="text-2xl font-semibold text-foreground">
            {downloaders.length} member{downloaders.length === 1 ? "" : "s"} saved your number
          </p>
          <p className="text-xs text-muted-foreground">
            As a Premium member you download only your reciprocal contacts — the people who saved your number — so every save goes both ways.
          </p>
        </div>
      ) : (
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
      )}


      {videoUrl && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <PlayCircle className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">How to install your VCF file</h2>
          </div>
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            <iframe
              src={videoUrl}
              title="How to install the VCF file and save contacts"
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
          <p className="p-4 text-xs text-muted-foreground">
            Watch this short tutorial to import the downloaded contacts into your phone so your WhatsApp status reaches everyone.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Approved community members" value={stats.total} />
        <StatCard label="Current version" value={`v${stats.latestVersion}`} />
        <StatCard label="Your last version" value={stats.lastDownloadVersion ? `v${stats.lastDownloadVersion}` : "—"} />
        <StatCard label="New since last download" value={stats.newAvailable} accent />
        <StatCard label="Total contacts received" value={stats.downloaded} />
        <StatCard label="People who saved your number" value={downloaders.length} />
        <StatCard label="Last download" value={stats.lastDownloadDate ? new Date(stats.lastDownloadDate).toLocaleDateString() : "—"} small />
        <StatCard label="Registered" value={stats.registrationDate ? new Date(stats.registrationDate).toLocaleDateString() : "—"} small />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isPremium ? (
          <Button size="lg" onClick={downloadNetwork} disabled={busy !== null} className="sm:col-span-2 lg:col-span-2">
            <Crown className="h-4 w-4 mr-2" />
            {busy === "network" ? "Preparing…" : `Download My Reciprocal Network (${downloaders.length})`}
          </Button>
        ) : (
          <Button size="lg" onClick={downloadNew} disabled={busy !== null || !canDownloadNew} className="sm:col-span-2 lg:col-span-2">
            {stats.isFirstDownload ? <Sparkles className="h-4 w-4 mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            {busy === "new" ? "Preparing…" : `Download Community Contacts${stats.newAvailable > 0 ? ` (${stats.newAvailable})` : ""}`}
          </Button>
        )}
        <Link to="/download-history">
          <Button size="lg" variant="ghost" className="w-full">
            <History className="h-4 w-4 mr-2" /> Download History
          </Button>
        </Link>
      </div>


      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Who saved your contact</h2>
          </div>
          <span className="text-sm font-semibold text-primary">{downloaders.length}</span>
        </div>
        {downloaders.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No one has received your contact yet. Once community members save your number, you'll see them listed here.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {downloaders.map((d) => (
              <li key={d.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-mono text-foreground">{isPremium ? d.phone : maskPhone(d.phone)}</p>
                  <p className="text-xs text-muted-foreground">
                    ID {d.user_code}
                    {isPremium && d.full_name ? ` · ${d.full_name}` : ""}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(d.downloaded_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
        Import the downloaded .vcf file in your phone's Contacts app to add every approved community member. Every file also includes the two StatusConnect-Administrator numbers. Your own number is never included in your own file, and contacts you've already downloaded are never repeated.
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
