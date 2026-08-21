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
const ADMIN_PHONE = "09130762056";
const GATE_KEY = "sc_admin_gate_ok";

function AdminGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState("");

  function unlock() {
    if (code === ADMIN_PASSCODE) {
      sessionStorage.setItem(GATE_KEY, "1");
      onUnlock();
    } else {
      toast.error("Incorrect passcode");
    }
  }

  return (
    <div className="max-w-sm mx-auto py-16 space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">
        Admin access
      </h1>

      <p className="text-sm text-muted-foreground">
        Enter the admin passcode to continue.
      </p>

      <Input
        type="password"
        placeholder="Passcode"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") unlock();
        }}
      />

      <Button className="w-full" onClick={unlock}>
        Unlock
      </Button>
    </div>
  );
}

type Status =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

type Membership = "freemium" | "premium";

type PaymentStatus = "pending" | "approved" | "rejected";

interface AdminStats {
  totalUsers: number;
  approved: number;
  pending: number;
  rejected: number;
  suspended: number;
  premium: number;
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
  membership: Membership;
  registration_date: string;
  total_contacts_received: number;
}

interface Activity {
  id: string;
  action: string;
  created_at: string;
  user_id: string | null;
}

interface PaymentRequest {
  id: string;
  user_id: string;
  phone: string;
  full_name: string;
  amount: number;
  payment_description: string;
  status: PaymentStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<
    PaymentRequest[]
  >([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");

  const [publishing, setPublishing] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [savingVideo, setSavingVideo] = useState(false);

  const [processingPayment, setProcessingPayment] =
    useState<string | null>(null);

  const [unlocked, setUnlocked] = useState(() =>
    typeof window !== "undefined" &&
    sessionStorage.getItem(GATE_KEY) === "1",
  );

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [loading, user, navigate]);

  async function load() {
    if (!user) return;

    const dayAgo = new Date(
      Date.now() - 86400000,
    ).toISOString();

    const weekAgo = new Date(
      Date.now() - 7 * 86400000,
    ).toISOString();

    const monthAgo = new Date(
      Date.now() - 30 * 86400000,
    ).toISOString();

    const [
      { count: total },
      { count: approved },
      { count: pending },
      { count: rejected },
      { count: suspended },
      { count: premium },
      { data: latestV },
      { count: downloads },
      { count: today },
      { count: week },
      { count: month },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("status", "approved"),

      supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("status", "pending"),

      supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("status", "rejected"),

      supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("status", "suspended"),

      supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("membership", "premium"),

      supabase
        .from("contact_versions")
        .select("version_number")
        .order("version_number", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("downloads")
        .select("*", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .gte("registration_date", dayAgo),

      supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .gte("registration_date", weekAgo),

      supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .gte("registration_date", monthAgo),
    ]);

    setStats({
      totalUsers: total ?? 0,
      approved: approved ?? 0,
      pending: pending ?? 0,
      rejected: rejected ?? 0,
      suspended: suspended ?? 0,
      premium: premium ?? 0,
      latestVersion: latestV?.version_number ?? 0,
      totalDownloads: downloads ?? 0,
      today: today ?? 0,
      thisWeek: week ?? 0,
      thisMonth: month ?? 0,
    });

    const { data: usersData } = await supabase
      .from("profiles")
      .select(
        "id,user_code,full_name,phone,country,status,membership,registration_date,total_contacts_received",
      )
      .order("registration_date", {
        ascending: false,
      })
      .limit(300);

    setUsers((usersData as UserRow[]) ?? []);

    const { data: act } = await supabase
      .from("audit_log")
      .select(
        "id,action,created_at,user_id",
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    setActivity((act as Activity[]) ?? []);

    /*
     * Premium payment requests.
     *
     * Pending requests are shown first so the administrator
     * can review them immediately.
     */
    const { data: payments, error: paymentsError } =
      await supabase
        .from("premium_payment_requests")
        .select(
          "id,user_id,phone,full_name,amount,payment_description,status,created_at,reviewed_at,reviewed_by",
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

    if (paymentsError) {
      console.error(
        "Could not load Premium payment requests:",
        paymentsError,
      );
    }

    setPaymentRequests(
      (payments as PaymentRequest[]) ?? [],
    );

    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "tutorial_video_url")
      .maybeSingle();

    setVideoUrl(
      (setting?.value as string) ?? "",
    );
  }

  async function saveVideoUrl() {
    if (
      videoUrl.trim() &&
      !toYouTubeEmbed(videoUrl)
    ) {
      return toast.error(
        "That doesn't look like a YouTube link",
      );
    }

    setSavingVideo(true);

    const { error } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: "tutorial_video_url",
          value: videoUrl.trim(),
        },
        {
          onConflict: "key",
        },
      );

    setSavingVideo(false);

    if (error) {
      return toast.error(error.message);
    }

    await logAudit(
      "admin_set_tutorial_video",
    );

    toast.success(
      "Tutorial video saved — it now shows on every member dashboard",
    );
  }

  useEffect(() => {
    if (user && unlocked) {
      load();
    }
  }, [user?.id, unlocked]);

  async function publish() {
    setPublishing(true);

    try {
      const { error } = await supabase.rpc(
        "publish_new_version",
      );

      if (error) throw error;

      await logAudit(
        "admin_publish_version",
      );

      toast.success(
        "New contact version published",
      );

      await load();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function approvePayment(
    payment: PaymentRequest,
  ) {
    if (payment.status !== "pending") {
      toast.info(
        "This payment request has already been reviewed.",
      );
      return;
    }

    const confirmed = confirm(
      `Approve the ₦${Number(payment.amount).toLocaleString()} Premium payment from ${payment.full_name}?`,
    );

    if (!confirmed) return;

    setProcessingPayment(payment.id);

    try {
      const { error } = await supabase.rpc(
        "approve_premium_payment",
        {
          payment_id: payment.id,
        },
      );

      if (error) throw error;

      await logAudit(
        "admin_approve_premium_payment",
        {
          payment_id: payment.id,
          user_id: payment.user_id,
          amount: payment.amount,
        },
      );

      toast.success(
        `${payment.full_name} is now a Premium member for 30 days.`,
      );

      await load();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not approve payment",
      );
    } finally {
      setProcessingPayment(null);
    }
  }

  async function rejectPayment(
    payment: PaymentRequest,
  ) {
    if (payment.status !== "pending") {
      toast.info(
        "This payment request has already been reviewed.",
      );
      return;
    }

    const confirmed = confirm(
      `Reject the Premium payment notification from ${payment.full_name}?`,
    );

    if (!confirmed) return;

    setProcessingPayment(payment.id);

    try {
      const { error } = await supabase.rpc(
        "reject_premium_payment",
        {
          payment_id: payment.id,
        },
      );

      if (error) throw error;

      await logAudit(
        "admin_reject_premium_payment",
        {
          payment_id: payment.id,
          user_id: payment.user_id,
          amount: payment.amount,
        },
      );

      toast.success(
        "Premium payment request rejected.",
      );

      await load();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not reject payment",
      );
    } finally {
      setProcessingPayment(null);
    }
  }

  async function setStatus(
    u: UserRow,
    next: Status,
  ) {
    const { error } = await supabase
      .from("profiles")
      .update({
        status: next,
      })
      .eq("id", u.id);

    if (error) {
      return toast.error(error.message);
    }

    await logAudit(
      `admin_status_${next}`,
      {
        target: u.id,
      },
    );

    toast.success(
      `${u.user_code} → ${next}`,
    );

    await load();
  }

  async function setMembership(
    u: UserRow,
    next: Membership,
  ) {
    const { error } = await supabase
      .from("profiles")
      .update({
        membership: next,
      })
      .eq("id", u.id);

    if (error) {
      return toast.error(error.message);
    }

    await logAudit(
      `admin_membership_${next}`,
      {
        target: u.id,
      },
    );

    toast.success(
      `${u.user_code} → ${next}`,
    );

    await load();
  }

  async function del(u: UserRow) {
    if (
      !confirm(
        `Delete ${u.user_code} — ${u.full_name}? This removes their profile.`,
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", u.id);

    if (error) {
      return toast.error(error.message);
    }

    await logAudit(
      "admin_delete_user",
      {
        target: u.id,
      },
    );

    toast.success("User deleted");

    await load();
  }

  function exportCsv() {
    const header = [
      "user_code",
      "full_name",
      "phone",
      "country",
      "status",
      "membership",
      "registration_date",
      "total_contacts_received",
    ];

    const rows = users.map((u) =>
      header
        .map((h) =>
          JSON.stringify(
            (
              u as unknown as Record<
                string,
                unknown
              >
            )[h] ?? "",
          ),
        )
        .join(","),
    );

    const csv = [
      header.join(","),
      ...rows,
    ].join("\n");

    const blob = new Blob(
      [csv],
      {
        type: "text/csv",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;
    a.download =
      "status-connect-users.csv";

    a.click();

    URL.revokeObjectURL(url);
  }

  const filtered = users.filter((u) => {
    if (
      filter !== "all" &&
      u.status !== filter
    ) {
      return false;
    }

    if (!search) return true;

    const s =
      search.toLowerCase();

    return (
      u.user_code
        .toLowerCase()
        .includes(s) ||
      u.full_name
        .toLowerCase()
        .includes(s) ||
      u.phone.includes(s)
    );
  });

  const pendingPayments =
    paymentRequests.filter(
      (p) => p.status === "pending",
    );

  if (
    loading ||
    !user
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading…
      </p>
    );
  }

  if (!unlocked) {
    return (
      <AdminGate
        onUnlock={() =>
          setUnlocked(true)
        }
      />
    );
  }

  if (!stats) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading…
      </p>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Admin
          </h1>

          <p className="text-sm text-muted-foreground">
            Manage StatusConnect members,
            Premium payments and contact versions.
          </p>
        </div>

        <Button
          onClick={publish}
          disabled={publishing}
        >
          {publishing
            ? "Publishing…"
            : "Publish new contact version"}
        </Button>
      </div>

      {/* PREMIUM PAYMENT REQUESTS */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 overflow-hidden">

        <div className="p-4 border-b border-primary/20 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold text-foreground">
              Premium Payment Requests
            </h2>

            <p className="text-sm text-muted-foreground">
              Review members who have notified you
              about their ₦2,000 Premium payment.
            </p>
          </div>

          {pendingPayments.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-700 dark:text-yellow-400">
              {pendingPayments.length} pending
            </span>
          )}
        </div>

        {paymentRequests.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No Premium payment requests yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3">
                    Member
                  </th>

                  <th className="p-3">
                    WhatsApp
                  </th>

                  <th className="p-3">
                    Amount
                  </th>

                  <th className="p-3">
                    Description
                  </th>

                  <th className="p-3">
                    Date
                  </th>

                  <th className="p-3">
                    Status
                  </th>

                  <th className="p-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {paymentRequests.map(
                  (payment) => {
                    const processing =
                      processingPayment ===
                      payment.id;

                    return (
                      <tr
                        key={payment.id}
                        className="border-b border-border last:border-0 align-top"
                      >
                        <td className="p-3">
                          <div className="font-medium">
                            {payment.full_name}
                          </div>

                          <div className="text-xs text-muted-foreground font-mono">
                            {payment.user_id}
                          </div>
                        </td>

                        <td className="p-3 font-mono text-xs">
                          {payment.phone}
                        </td>

                        <td className="p-3 font-semibold">
                          ₦
                          {Number(
                            payment.amount,
                          ).toLocaleString()}
                        </td>

                        <td className="p-3">
                          <span className="font-mono text-xs">
                            {payment.payment_description}
                          </span>
                        </td>

                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(
                            payment.created_at,
                          ).toLocaleString()}
                        </td>

                        <td className="p-3">
                          <PaymentStatusBadge
                            status={
                              payment.status
                            }
                          />
                        </td>

                        <td className="p-3 text-right whitespace-nowrap">

                          {payment.status ===
                            "pending" && (
                            <div className="flex justify-end gap-1">

                              <Button
                                size="sm"
                                onClick={() =>
                                  approvePayment(
                                    payment,
                                  )
                                }
                                disabled={
                                  processing
                                }
                              >
                                {processing
                                  ? "Processing…"
                                  : "Approve"}
                              </Button>

                              <Button
                           
