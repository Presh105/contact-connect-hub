import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

// Change this passcode any time — it is required in addition to being the admin phone.
const ADMIN_PASSCODE = "SC-ADMIN-2026";
const ADMIN_PHONE = "09130762056";
const GATE_KEY = "sc_admin_gate_ok";

function AdminGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState("");
  return (
    <div className="max-w-sm mx-auto py-16 space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Admin access</h1>
      <p className="text-sm text-muted-foreground">Enter the admin passcode to continue.</p>
      <Input
        type="password"
        placeholder="Passcode"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (code === ADMIN_PASSCODE) {
              sessionStorage.setItem(GATE_KEY, "1");
              onUnlock();
            } else toast.error("Incorrect passcode");
          }
        }}
      />
      <Button
        className="w-full"
        onClick={() => {
          if (code === ADMIN_PASSCODE) {
            sessionStorage.setItem(GATE_KEY, "1");
            onUnlock();
          } else toast.error("Incorrect passcode");
        }}
      >
        Unlock
      </Button>
    </div>
  );
}

type Status = "pending" | "approved" | "rejected" | "suspended";

interface AdminStats {
  totalUsers: number;
  approved: number;
  pending: number;
  rejected: number;
  suspended: number;
  latestVersion: number;
  totalDownloads: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

interface UserRow {
  id: string;
  user_code: string;
  full_name: string;
  phone: string;
  country: string;
  status: Status;
  registration_date: string;
  total_contacts_received: number;
}

interface Activity {
  id: string;
  action: string;
  created_at: string;
  user_id: string | null;
}

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [publishing, setPublishing] = useState(false);
  const [unlocked, setUnlocked] = useState(() =>
    typeof window !== "undefined" && sessionStorage.getItem(GATE_KEY) === "1",
  );

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);



  async function load() {
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [
      { count: total },
      { count: approved },
      { count: pending },
      { count: rejected },
      { count: suspended },
      { data: latestV },
      { count: downloads },
      { count: today },
      { count: week },
      { count: month },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "rejected"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "suspended"),
      supabase.from("contact_versions").select("version_number").order("version_number", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("downloads").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("registration_date", dayAgo),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("registration_date", weekAgo),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("registration_date", monthAgo),
    ]);

    setStats({
      totalUsers: total ?? 0,
      approved: approved ?? 0,
      pending: pending ?? 0,
      rejected: rejected ?? 0,
      suspended: suspended ?? 0,
      latestVersion: latestV?.version_number ?? 0,
      totalDownloads: downloads ?? 0,
      today: today ?? 0,
      thisWeek: week ?? 0,
      thisMonth: month ?? 0,
    });

    const { data: usersData } = await supabase
      .from("profiles")
      .select("id,user_code,full_name,phone,country,status,registration_date,total_contacts_received")
      .order("registration_date", { ascending: false })
      .limit(300);
    setUsers((usersData as UserRow[]) ?? []);

    const { data: act } = await supabase
      .from("audit_log")
      .select("id,action,created_at,user_id")
      .order("created_at", { ascending: false })
      .limit(20);
    setActivity((act as Activity[]) ?? []);
  }

  useEffect(() => { if (user && unlocked) load(); }, [user?.id, unlocked]);

  async function publish() {
    setPublishing(true);
    try {
      const { error } = await supabase.rpc("publish_new_version");
      if (error) throw error;
      await logAudit("admin_publish_version");
      toast.success("New contact version published");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setPublishing(false); }
  }

  async function setStatus(u: UserRow, next: Status) {
    const { error } = await supabase.from("profiles").update({ status: next }).eq("id", u.id);
    if (error) return toast.error(error.message);
    await logAudit(`admin_status_${next}`, { target: u.id });
    toast.success(`${u.user_code} → ${next}`);
    load();
  }

  async function del(u: UserRow) {
    if (!confirm(`Delete ${u.user_code} — ${u.full_name}? This removes their profile.`)) return;
    const { error } = await supabase.from("profiles").delete().eq("id", u.id);
    if (error) return toast.error(error.message);
    await logAudit("admin_delete_user", { target: u.id });
    toast.success("User deleted");
    load();
  }

  function exportCsv() {
    const header = ["user_code", "full_name", "phone", "country", "status", "registration_date", "total_contacts_received"];
    const rows = users.map((u) => header.map((h) => JSON.stringify((u as unknown as Record<string, unknown>)[h] ?? "")).join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "status-connect-users.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = users.filter((u) => {
    if (filter !== "all" && u.status !== filter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return u.user_code.toLowerCase().includes(s) || u.full_name.toLowerCase().includes(s) || u.phone.includes(s);
  });

  if (loading || !isAdmin) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (myPhone !== null && myPhone !== ADMIN_PHONE) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3">
        <h1 className="text-xl font-semibold text-foreground">Not authorized</h1>
        <p className="text-sm text-muted-foreground">This admin dashboard is restricted.</p>
      </div>
    );
  }
  if (!unlocked) return <AdminGate onUnlock={() => setUnlocked(true)} />;
  if (!stats) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <Button onClick={publish} disabled={publishing}>
          {publishing ? "Publishing…" : "Publish new contact version"}
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="Total users" value={stats.totalUsers} />
        <Stat label="Approved" value={stats.approved} />
        <Stat label="Pending" value={stats.pending} accent={stats.pending > 0} />
        <Stat label="Rejected" value={stats.rejected} />
        <Stat label="Suspended" value={stats.suspended} />
        <Stat label="Current version" value={`v${stats.latestVersion}`} />
        <Stat label="Total downloads" value={stats.totalDownloads} />
        <Stat label="Today / week / month" value={`${stats.today} / ${stats.thisWeek} / ${stats.thisMonth}`} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-border">
          <Input placeholder="Search by code, name, phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <select value={filter} onChange={(e) => setFilter(e.target.value as Status | "all")} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
          <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Country</th>
                <th className="p-3">Status</th>
                <th className="p-3">Joined</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 align-top">
                  <td className="p-3 font-mono text-xs">{u.user_code}</td>
                  <td className="p-3">{u.full_name}</td>
                  <td className="p-3 font-mono text-xs">{u.phone}</td>
                  <td className="p-3">{u.country}</td>
                  <td className="p-3"><StatusBadge status={u.status} /></td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(u.registration_date).toLocaleDateString()}</td>
                  <td className="p-3 text-right whitespace-nowrap space-x-1">
                    {u.status !== "approved" && <Button size="sm" variant="ghost" onClick={() => setStatus(u, "approved")}>Approve</Button>}
                    {u.status !== "rejected" && <Button size="sm" variant="ghost" onClick={() => setStatus(u, "rejected")}>Reject</Button>}
                    {u.status !== "suspended" && <Button size="sm" variant="ghost" onClick={() => setStatus(u, "suspended")}>Suspend</Button>}
                    <Link to="/admin/user/$id" params={{ id: u.id }}><Button size="sm" variant="ghost">View</Button></Link>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(u)}>Delete</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No users</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-semibold mb-2">Recent activity</h2>
        <ul className="text-sm divide-y divide-border">
          {activity.map((a) => (
            <li key={a.id} className="py-2 flex justify-between gap-3">
              <span className="font-mono text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              <span className="flex-1 truncate">{a.action}</span>
            </li>
          ))}
          {activity.length === 0 && <li className="py-4 text-center text-muted-foreground text-sm">No activity yet</li>}
        </ul>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    approved: "bg-primary/10 text-primary",
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    rejected: "bg-destructive/10 text-destructive",
    suspended: "bg-muted text-muted-foreground",
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs capitalize ${map[status]}`}>{status}</span>;
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
