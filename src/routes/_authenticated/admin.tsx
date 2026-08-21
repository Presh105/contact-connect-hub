import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { toYouTubeEmbed } from "@/lib/youtube";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

const ADMIN_PASSCODE = "SC-ADMIN-2026";
const GATE_KEY = "sc_admin_gate_ok";

type Status = "pending" | "approved" | "rejected" | "suspended";
type Membership = "freemium" | "premium";

type UserRow = {
  id: string;
  user_code: string;
  full_name: string;
  phone: string;
  country: string;
  status: Status;
  membership: Membership;
  registration_date: string;
  total_contacts_received: number;
};

type Activity = {
  id: string;
  action: string;
  created_at: string;
  user_id: string | null;
};

function AdminGate({ unlock }: { unlock: () => void }) {
  const [code, setCode] = useState("");

  const check = () => {
    if (code === ADMIN_PASSCODE) {
      sessionStorage.setItem(GATE_KEY, "1");
      unlock();
    } else toast.error("Incorrect passcode");
  };

  return (
    <div className="max-w-sm mx-auto py-16 space-y-4">
      <h1 className="text-2xl font-semibold">Admin access</h1>
      <p className="text-sm text-muted-foreground">Enter the admin passcode.</p>
      <Input
        type="password"
        placeholder="Passcode"
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={e => e.key === "Enter" && check()}
      />
      <Button className="w-full" onClick={check}>Unlock</Button>
    </div>
  );
}

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [video, setVideo] = useState("");
  const [savingVideo, setSavingVideo] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unlocked, setUnlocked] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(GATE_KEY) === "1"
  );
  const [stats, setStats] = useState({
    total: 0, approved: 0, pending: 0, rejected: 0,
    suspended: 0, premium: 0, version: 0, downloads: 0,
    today: 0, week: 0, month: 0,
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  async function load() {
    const now = Date.now();

    const ranges = {
      day: new Date(now - 86400000).toISOString(),
      week: new Date(now - 7 * 86400000).toISOString(),
      month: new Date(now - 30 * 86400000).toISOString(),
    };

    const [
      total, approved, pending, rejected, suspended, premium,
      version, downloads, today, week, month,
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "rejected"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "suspended"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("membership", "premium"),
      supabase.from("contact_versions").select("version_number")
        .order("version_number", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("downloads").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("registration_date", ranges.day),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("registration_date", ranges.week),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("registration_date", ranges.month),
    ]);

    setStats({
      total: total.count || 0,
      approved: approved.count || 0,
      pending: pending.count || 0,
      rejected: rejected.count || 0,
      suspended: suspended.count || 0,
      premium: premium.count || 0,
      version: version.data?.version_number || 0,
      downloads: downloads.count || 0,
      today: today.count || 0,
      week: week.count || 0,
      month: month.count || 0,
    });

    const { data: us } = await supabase.from("profiles")
      .select("id,user_code,full_name,phone,country,status,membership,registration_date,total_contacts_received")
      .order("registration_date", { ascending: false }).limit(300);

    setUsers((us || []) as UserRow[]);

    const { data: logs } = await supabase.from("audit_log")
      .select("id,action,created_at,user_id")
      .order("created_at", { ascending: false }).limit(20);

    setActivity((logs || []) as Activity[]);

    const { data: setting } = await supabase.from("app_settings")
      .select("value").eq("key", "tutorial_video_url").maybeSingle();

    setVideo((setting?.value as string) || "");
  }

  useEffect(() => {
    if (user && unlocked) load();
  }, [user?.id, unlocked]);

  async function publish() {
    setPublishing(true);
    try {
      const { error } = await supabase.rpc("publish_new_version");
      if (error) throw error;
      await logAudit("admin_publish_version");
      toast.success("New contact version published");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPublishing(false);
    }
  }

  async function saveVideo() {
    if (video.trim() && !toYouTubeEmbed(video))
      return toast.error("That doesn't look like a YouTube link");

    setSavingVideo(true);
    const { error } = await supabase.from("app_settings").upsert(
      { key: "tutorial_video_url", value: video.trim() },
      { onConflict: "key" }
    );
    setSavingVideo(false);

    if (error) return toast.error(error.message);

    await logAudit("admin_set_tutorial_video");
    toast.success("Tutorial video saved");
  }

  async function status(u: UserRow, next: Status) {
    const { error } = await supabase.from("profiles")
      .update({ status: next }).eq("id", u.id);

    if (error) return toast.error(error.message);

    await logAudit(`admin_status_${next}`, { target: u.id });
    toast.success(`${u.user_code} → ${next}`);
    load();
  }

  async function membership(u: UserRow) {
    const next = u.membership === "premium" ? "freemium" : "premium";

    const { error } = await supabase.from("profiles")
      .update({ membership: next }).eq("id", u.id);

    if (error) return toast.error(error.message);

    await logAudit(`admin_membership_${next}`, { target: u.id });
    toast.success(`${u.user_code} → ${next}`);
    load();
  }

  async function del(u: UserRow) {
    if (!confirm(`Delete ${u.user_code} — ${u.full_name}?`)) return;

    const { error } = await supabase.from("profiles").delete().eq("id", u.id);
    if (error) return toast.error(error.message);

    await logAudit("admin_delete_user", { target: u.id });
    toast.success("User deleted");
    load();
  }

  function exportCsv() {
    const head = [
      "user_code", "full_name", "phone", "country", "status",
      "membership", "registration_date", "total_contacts_received",
    ];

    const rows = users.map(u =>
      head.map(k => JSON.stringify((u as any)[k] ?? "")).join(",")
    );

    const blob = new Blob(
      [[head.join(","), ...rows].join("\n")],
      { type: "text/csv" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "status-connect-users.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !user) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!unlocked) return <AdminGate unlock={() => setUnlocked(true)} />;

  const filtered = users.filter(u => {
    if (filter !== "all" && u.status !== filter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return u.user_code.toLowerCase().includes(s) ||
      u.full_name.toLowerCase().includes(s) ||
      u.phone.includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <Button onClick={publish} disabled={publishing}>
          {publishing ? "Publishing…" : "Publish new contact version"}
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div>
          <h2 className="font-semibold">Tutorial video</h2>
          <p className="text-sm text-muted-foreground">
            Add a YouTube tutorial for members.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input
            value={video}
            onChange={e => setVideo(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="max-w-md"
          />
          <Button onClick={saveVideo} disabled={savingVideo}>
            {savingVideo ? "Saving…" : "Save video"}
          </Button>
        </div>

        {toYouTubeEmbed(video) && (
          <div className="relative max-w-md w-full" style={{ paddingTop: "31.6%" }}>
            <iframe
              src={toYouTubeEmbed(video)!}
              title="Tutorial preview"
              className="absolute inset-0 h-full w-full rounded-md"
              allowFullScreen
            />
          </div>
        )}
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="Total users" value={stats.total} />
        <Stat label="Approved" value={stats.approved} />
        <Stat label="Pending" value={stats.pending} accent={stats.pending > 0} />
        <Stat label="Rejected" value={stats.rejected} />
        <Stat label="Suspended" value={stats.suspended} />
        <Stat label="Premium members" value={stats.premium} />
        <Stat label="Current version" value={`v${stats.version}`} />
        <Stat label="Total downloads" value={stats.downloads} />
        <Stat label="Today / week / month" value={`${stats.today} / ${stats.week} / ${stats.month}`} />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-4 flex flex-wrap gap-2 border-b">
          <Input
            placeholder="Search by code, name, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />

          <select
            value={filter}
            onChange={e => setFilter(e.target.value as Status | "all")}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>

          <Button variant="outline" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground border-b">
              <tr>
                {["Code", "Name", "Phone", "Country", "Status", "Membership", "Joined", "Actions"].map(x =>
                  <th key={x} className="p-3">{x}</th>
                )}
              </tr>
            </thead>

            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b last:border-0 align-top">
                  <td className="p-3 font-mono text-xs">{u.user_code}</td>
                  <td className="p-3">{u.full_name}</td>
                  <td className="p-3 font-mono text-xs">{u.phone}</td>
                  <td className="p-3">{u.country}</td>
                  <td className="p-3"><Badge status={u.status} /></td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs">
                      {u.membership}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(u.registration_date).toLocaleDateString()}
                  </td>

                  <td className="p-3 text-right whitespace-nowrap space-x-1">
                    {u.status !== "approved" &&
                      <Button size="sm" variant="ghost" onClick={() => status(u, "approved")}>Approve</Button>}
                    {u.status !== "rejected" &&
                      <Button size="sm" variant="ghost" onClick={() => status(u, "rejected")}>Reject</Button>}
                    {u.status !== "suspended" &&
                      <Button size="sm" variant="ghost" onClick={() => status(u, "suspended")}>Suspend</Button>}

                    <Button size="sm" variant="ghost" onClick={() => membership(u)}>
                      {u.membership === "premium" ? "Downgrade" : "Make premium"}
                    </Button>

                    <Link to="/admin/user/$id" params={{ id: u.id }}>
                      <Button size="sm" variant="ghost">View</Button>
                    </Link>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => del(u)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    No users
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold mb-2">Recent activity</h2>
        <ul className="text-sm divide-y">
          {activity.map(a => (
            <li key={a.id} className="py-2 flex justify-between gap-3">
              <span className="font-mono text-xs text-muted-foreground">
                {new Date(a.created_at).toLocaleString()}
              </span>
              <span className="flex-1 truncate">{a.action}</span>
            </li>
          ))}
          {!activity.length &&
            <li className="py-4 text-center text-muted-foreground">No activity yet</li>}
        </ul>
      </div>
    </div>
  );
}

function Badge({ status }: { status: Status }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs capitalize ${
      status === "approved" ? "bg-primary/10 text-primary" :
      status === "pending" ? "bg-yellow-500/10 text-yellow-700" :
      status === "rejected" ? "bg-destructive/10 text-destructive" :
      "bg-muted text-muted-foreground"
    }`}>
      {status}
    </span>
  );
}

function Stat({
  label, value, accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "border-primary bg-primary/5" : "bg-card"}`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
         }
