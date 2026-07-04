import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/user/$id")({
  component: UserDetail,
});

interface Profile {
  id: string;
  user_code: string;
  full_name: string;
  phone: string;
  country: string;
  status: string;
  registration_date: string;
  last_download_version_number: number;
  last_download_date: string | null;
  total_contacts_received: number;
}

interface Download {
  id: string;
  download_type: string;
  from_version: number;
  to_version: number;
  contact_count: number;
  created_at: string;
}

function UserDetail() {
  const { id } = Route.useParams();
  const { isAdmin, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [downloads, setDownloads] = useState<Download[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("profiles").select("*").eq("id", id).maybeSingle().then(({ data }) => setProfile(data as Profile | null));
    supabase.from("downloads").select("*").eq("user_id", id).order("created_at", { ascending: false })
      .then(({ data }) => setDownloads((data as Download[]) ?? []));
  }, [id, isAdmin]);

  if (loading || !isAdmin) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!profile) return <p className="text-sm text-muted-foreground">User not found</p>;

  return (
    <div className="space-y-6">
      <Link to="/admin"><Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" /> Back to admin</Button></Link>

      <div className="rounded-lg border border-border bg-card p-5">
        <h1 className="text-xl font-semibold">{profile.full_name}</h1>
        <p className="text-sm text-muted-foreground font-mono">{profile.user_code}</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <Field label="WhatsApp" value={profile.phone} />
          <Field label="Country" value={profile.country} />
          <Field label="Status" value={profile.status} />
          <Field label="Registered" value={new Date(profile.registration_date).toLocaleString()} />
          <Field label="Last download version" value={profile.last_download_version_number ? `v${profile.last_download_version_number}` : "—"} />
          <Field label="Last download date" value={profile.last_download_date ? new Date(profile.last_download_date).toLocaleString() : "—"} />
          <Field label="Total contacts received" value={profile.total_contacts_received.toString()} />
        </dl>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <div className="p-4 border-b border-border font-semibold">Download history</div>
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
            {downloads.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3">{r.download_type}</td>
                <td className="p-3 font-mono text-xs">{r.download_type === "new" ? `v${r.from_version + 1}–v${r.to_version}` : `v${r.to_version}`}</td>
                <td className="p-3 text-right font-semibold">{r.contact_count}</td>
              </tr>
            ))}
            {downloads.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No downloads yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}
