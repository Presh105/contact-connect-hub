import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalContacts: number;
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
  email: string | null;
  country: string;
  is_active: boolean;
  registration_date: string;
  total_contacts_received: number;
}

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard" });
  }, [loading, isAdmin, navigate]);

  async function load() {
    const nowIso = new Date().toISOString();
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [
      { count: total },
      { count: active },
      { count: contactsCount },
      { data: latestV },
      { count: downloads },
      { count: today },
      { count: week },
      { count: month },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true).not("version_id", "is", null),
      supabase.from("contact_versions").select("version_number").order("version_number", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("downloads").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("registration_date", dayAgo).lte("registration_date", nowIso),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("registration_date", weekAgo),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("registration_date", monthAgo),
    ]);

    setStats({
      totalUsers: total ?? 0,
      activeUsers: active ?? 0,
      totalContacts: contactsCount ?? 0,
      latestVersion: latestV?.version_number ?? 0,
      totalDownloads: downloads ?? 0,
      today: today ?? 0,
      thisWeek: week ?? 0,
      thisMonth: month ?? 0,
    });

    const { data } = await supabase
      .from("profiles")
      .select("id,user_code,full_name,phone,email,country,is_active,registration_date,total_contacts_received")
      .order("registration_date", { ascending: false })
      .limit(200);
    setUsers((data as UserRow[]) ?? []);
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function publish() {
    setPublishing(true);
    try {
      const { error } = await supabase.rpc("publish_new_version");
      if (error) throw error;
      await logAudit("admin_publish_version");
      toast.success("New version published");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setPublishing(false); }
  }

  async function toggleActive(u: UserRow) {
    const { error } = await supabase.from("profiles").update({ is_active: !u.is_active }).eq("id", u.id);
    if (error) return toast.error(error.message);
    await logAudit("admin_toggle_active", { target: u.id, active: !u.is_active });
    toast.success(u.is_active ? "User deactivated" : "User activated");
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
    const header = ["user_code", "full_name", "phone", "email", "country", "is_active", "registration_date", "total_contacts_received"];
    const rows = users.map((u) => header.map((h) => JSON.stringify((u as any)[h] ?? "")).join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "status-connect-users.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return u.user_code.toLowerCase().includes(s) || u.full_name.toLowerCase().includes(s) || u.phone.includes(s) || (u.email ?? "").toLowerCase().includes(s);
  });

  if (loading || !isAdmin || !stats) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <Button onClick={publish} disabled={publishing}>
          {publishing ? "Publishing…" : "Publish new contact version"}
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="Registered users" value={stats.totalUsers} />
        <Stat label="Active users" value={stats.activeUsers} />
        <Stat label="Contact records" value={stats.totalContacts} />
        <Stat label="Latest version" value={`v${stats.latestVersion}`} />
        <Stat label="Total downloads" value={stats.totalDownloads} />
        <Stat label="Today" value={stats.today} />
        <Stat label="This week" value={stats.thisWeek} />
        <Stat label="This month" value={stats.thisMonth} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-border">
          <Input placeholder="Search by code, name, phone, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
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
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-mono text-xs">{u.user_code}</td>
                  <td className="p-3">{u.full_name}</td>
                  <td className="p-3 font-mono text-xs">{u.phone}</td>
                  <td className="p-3">{u.country}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${u.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(u.registration_date).toLocaleDateString()}</td>
                  <td className="p-3 text-right space-x-2 whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(u)}>{u.is_active ? "Deactivate" : "Activate"}</Button>
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
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
