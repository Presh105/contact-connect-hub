import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  RefreshCcw, History, Sparkles, Clock, Bell, Crown,
  ShieldCheck, PlayCircle
} from "lucide-react";
import { toast } from "sonner";
import { generateVcf, generateNamedVcf, downloadVcf } from "@/lib/vcf";
import { logAudit } from "@/lib/audit";
import { toYouTubeEmbed } from "@/lib/youtube";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Membership = "freemium" | "premium";
type Status = "pending" | "approved" | "rejected" | "suspended";

type Stats = {
  total: number;
  downloaded: number;
  newAvailable: number;
  latestVersion: number;
  lastDownloadVersion: number;
  lastDownloadDate: string | null;
  userCode: string;
  fullName: string;
  status: Status;
  membership: Membership;
  registrationDate: string;
  isFirstDownload: boolean;
};

type Downloader = {
  id: string;
  user_id: string;
  downloaded_at: string;
  phone: string;
  user_code: string;
  full_name: string;
};

const MIN = 5;
const ACTIVE_DAYS = 7;

const active = (r: {
  last_login_at?: string | null;
  registration_date?: string | null;
}) => {
  const t = r.last_login_at || r.registration_date;
  return !!t && new Date(t).getTime() >= Date.now() - ACTIVE_DAYS * 86400000;
};

const mask = (p: string) =>
  p.length <= 4 ? "•••" + p : p.slice(0, 4) + "••••" + p.slice(-2);

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [downloaders, setDownloaders] = useState<Downloader[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [video, setVideo] = useState<string | null>(null);
  const [busy, setBusy] = useState<"new" | "network" | null>(null);

  const load = useCallback(async () => {
    if (!user) return;

    const [
      { data: p },
      { data: v },
      { data: members },
      { data: setting },
      { data: delivered },
    ] = await Promise.all([
      supabase.from("profiles").select(
        "user_code,full_name,last_download_version_number,last_download_date,total_contacts_received,status,membership,registration_date"
      ).eq("id", user.id).maybeSingle(),
      supabase.from("contact_versions").select("version_number,created_at")
        .order("version_number", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("profiles").select("id,last_login_at,registration_date")
        .eq("status", "approved").neq("id", user.id),
      supabase.from("app_settings").select("value")
        .eq("key", "tutorial_video_url").maybeSingle(),
      supabase.from("user_downloaded_contacts").select("contact_id")
        .eq("user_id", user.id),
    ]);

    setVideo(toYouTubeEmbed((setting?.value as string) || ""));

    const savedIds = new Set((delivered || []).map(x => x.contact_id as string));
    setSaved(savedIds);

    const eligible = (members || []).filter(active);
    const fresh = eligible.filter(x => !savedIds.has(x.id as string));

    setStats({
      total: eligible.length,
      downloaded: p?.total_contacts_received || 0,
      newAvailable: fresh.length,
      latestVersion: v?.version_number || 0,
      lastDownloadVersion: p?.last_download_version_number || 0,
      lastDownloadDate: p?.last_download_date || null,
      userCode: p?.user_code || "",
      fullName: p?.full_name || "",
      status: (p?.status as Status) || "approved",
      membership: (p?.membership as Membership) || "freemium",
      registrationDate: p?.registration_date || "",
      isFirstDownload: savedIds.size === 0,
    });

    const { data: rows } = await supabase
      .from("user_downloaded_contacts")
      .select("id,downloaded_at,user_id")
      .eq("contact_id", user.id)
      .order("downloaded_at", { ascending: false })
      .limit(200);

    const ids = [...new Set((rows || []).map(x => x.user_id as string))];
    let map = new Map<string, { phone: string; user_code: string; full_name: string }>();

    if (ids.length) {
      const { data } = await supabase.from("profiles")
        .select("id,phone,user_code,full_name").in("id", ids);

      map = new Map((data || []).map(x => [
        x.id as string,
        {
          phone: x.phone as string,
          user_code: x.user_code as string,
          full_name: x.full_name as string,
        },
      ]));
    }

    setDownloaders((rows || []).map(x => {
      const p = map.get(x.user_id as string);
      return {
        id: x.id as string,
        user_id: x.user_id as string,
        downloaded_at: x.downloaded_at as string,
        phone: p?.phone || "",
        user_code: p?.user_code || "—",
        full_name: p?.full_name || "",
      };
    }));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const c = supabase.channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_versions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_downloaded_contacts" }, load)
      .subscribe();

    return () => { supabase.removeChannel(c); };
  }, [user, load]);

  async function getContacts() {
    if (!user) return [];

    const { data: old } = await supabase.from("user_downloaded_contacts")
      .select("contact_id").eq("user_id", user.id);

    const ids = (old || []).map(x => x.contact_id as string);

    let q = supabase.from("profiles")
      .select("id,contact_seq,phone,last_login_at,registration_date")
      .eq("status", "approved").neq("id", user.id);

    if (ids.length) q = q.not("id", "in", `(${ids.join(",")})`);

    const { data, error } = await q.order("contact_seq");
    if (error) throw error;

    return (data || []).filter(active);
  }

  async function record(ids: string[], type: "first_community" | "new" | "reciprocal") {
    if (!user || !stats || !ids.length) return;

    for (let i = 0; i < ids.length; i += 500) {
      await supabase.from("user_downloaded_contacts").upsert(
        ids.slice(i, i + 500).map(id => ({ user_id: user.id, contact_id: id })),
        { onConflict: "user_id,contact_id", ignoreDuplicates: true }
      );
    }

    await supabase.from("downloads").insert({
      user_id: user.id,
      download_type: type,
      from_version: stats.lastDownloadVersion,
      to_version: Math.max(stats.latestVersion, stats.lastDownloadVersion),
      contact_count: ids.length,
    });

    await supabase.from("profiles").update({
      last_download_version_number: Math.max(stats.lastDownloadVersion, stats.latestVersion),
      last_download_date: new Date().toISOString(),
      total_contacts_received: stats.downloaded + ids.length,
    }).eq("id", user.id);

    await logAudit(`download_${type}`, { count: ids.length });
  }

  async function downloadNew() {
    if (!stats) return;
    setBusy("new");

    try {
      const contacts = await getContacts();

      if (contacts.length < MIN) {
        toast.info(`Only ${contacts.length} new contact${contacts.length === 1 ? "" : "s"} available. We need at least ${MIN}.`);
        return;
      }

      const type = stats.isFirstDownload ? "first_community" : "new";
      const label = stats.isFirstDownload ? "community" : "new";

      downloadVcf(
        `status-connect-${label}-${contacts.length}contacts-v${stats.latestVersion}.vcf`,
        generateVcf(contacts)
      );

      await record(contacts.map(x => x.id as string), type);
      toast.success(`Downloaded ${contacts.length} new contacts`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(null);
    }
  }

  async function downloadNetwork() {
    if (!stats) return;
    setBusy("network");

    try {
      const fresh = downloaders.filter(x => x.phone && !saved.has(x.user_id));
      const unique = [...new Map(fresh.map(x => [x.user_id, x])).values()];

      if (!unique.length) {
        toast.info("No new reciprocal contacts.");
        return;
      }

      downloadVcf(
        `status-connect-network-${unique.length}contacts.vcf`,
        generateNamedVcf(unique.map(x => ({
          name: `Status Connect ${x.user_code}`,
          phone: x.phone,
        })))
      );

      await record(unique.map(x => x.user_id), "reciprocal");
      toast.success(`Downloaded ${unique.length} reciprocal contacts`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(null);
    }
  }

  if (!stats) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (stats.status === "suspended") {
    return (
      <div className="max-w-xl mx-auto text-center py-10 space-y-4">
        <Clock className="mx-auto h-10 w-10 text-primary" />
        <h1 className="text-2xl font-semibold">Your account is suspended</h1>
        <p className="text-sm text-muted-foreground">
          Please contact an administrator for more information.
        </p>
        <p className="text-xs">Your ID: <span className="font-mono">{stats.userCode}</span></p>
      </div>
    );
  }

  const premium = stats.membership === "premium";
  const canDownload = stats.newAvailable >= MIN;
  const reciprocal = new Set(
    downloaders.filter(x => x.phone && !saved.has(x.user_id)).map(x => x.user_id)
  ).size;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{stats.fullName}</h1>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${
            premium ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            {premium ? <Crown className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {premium ? "Premium member" : "Freemium member"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Your ID: <span className="font-mono">{stats.userCode}</span>
        </p>
      </header>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <p className="text-xs uppercase tracking-wide text-primary font-semibold">
          {premium ? "Your Reciprocal Network" : "Contacts Ready to Save"}
        </p>
        {premium ? (
          <>
            <p className="text-2xl font-semibold">{downloaders.length} member{downloaders.length === 1 ? "" : "s"} saved your number</p>
            <p className="text-xs text-muted-foreground">
              Premium members download the contacts of people who received their number.
            </p>
          </>
        ) : stats.newAvailable ? (
          <>
            <p className="text-2xl font-semibold">{stats.newAvailable} new contact{stats.newAvailable === 1 ? "" : "s"} available</p>
            <p className="text-xs text-muted-foreground">
              {canDownload ? "You can download them now." : `${MIN - stats.newAvailable} more needed before download unlocks.`}
            </p>
          </>
        ) : (
          <p className="text-sm">Please return in 30 minutes to check for newly approved members.</p>
        )}
      </div>

      {video && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b">
            <PlayCircle className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">How to install your VCF file</h2>
          </div>
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            <iframe
              src={video}
              title="How to install the VCF file"
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
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
        {premium ? (
          <Button size="lg" onClick={downloadNetwork} disabled={!!busy} className="sm:col-span-2">
            <Crown className="h-4 w-4 mr-2" />
            {busy === "network" ? "Preparing…" : `Download My Reciprocal Network (${reciprocal})`}
          </Button>
        ) : (
          <Button size="lg" onClick={downloadNew} disabled={!!busy || !canDownload} className="sm:col-span-2">
            {stats.isFirstDownload ? <Sparkles className="h-4 w-4 mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            {busy === "new" ? "Preparing…" : `Download Community Contacts${stats.newAvailable ? ` (${stats.newAvailable})` : ""}`}
          </Button>
        )}

        <Link to="/download-history">
          <Button size="lg" variant="ghost" className="w-full">
            <History className="h-4 w-4 mr-2" /> Download History
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Who saved your contact</h2>
          </div>
          <span className="text-sm font-semibold text-primary">{downloaders.length}</span>
        </div>

        {!downloaders.length ? (
          <p className="p-4 text-sm text-muted-foreground">
            No one has received your contact yet.
          </p>
        ) : (
          <ul className="divide-y">
            {downloaders.map(x => (
              <li key={x.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-mono">{premium ? x.phone : mask(x.phone)}</p>
                  <p className="text-xs text-muted-foreground">
                    ID {x.user_code}{premium && x.full_name ? ` · ${x.full_name}` : ""}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(x.downloaded_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 text-xs text-muted-foreground">
        Import the downloaded .vcf file in your phone's Contacts app. Your own number is never included and contacts already downloaded are never repeated.
      </div>
    </div>
  );
}

function StatCard({
  label, value, accent, small,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? "border-primary bg-primary/5" : "bg-card"}`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold ${small ? "text-base" : "text-2xl"}`}>{value}</p>
    </div>
  );
                                                  }
