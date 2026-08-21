import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  RefreshCcw,
  History,
  Sparkles,
  Clock,
  Bell,
  Crown,
  ShieldCheck,
  PlayCircle,
  CreditCard,
  Copy,
  CheckCircle,
} from "lucide-react";
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
  phone: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  membership: Membership;
  registrationDate: string;
  isFirstDownload: boolean;
}

interface Downloader {
  id: string;
  user_id: string;
  downloaded_at: string;
  phone: string;
  user_code: string;
  full_name: string;
}

interface PaymentRequest {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

const MIN_CONTACTS = 5;
const ACTIVE_WINDOW_DAYS = 7;

const PREMIUM_PRICE = 2000;
const PAYMENT_BANK = "Opay";
const PAYMENT_NAME = "Noah Precious Isaac";
const PAYMENT_ACCOUNT = "9130762056";

function isRecentlyActive(row: {
  last_login_at?: string | null;
  registration_date?: string | null;
}) {
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
  const [busy, setBusy] = useState<null | "new" | "network">(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [downloaders, setDownloaders] = useState<Downloader[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;

    const [
      { data: profile },
      { data: latestV },
      { data: activeRows },
      { data: setting },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "user_code,full_name,phone,last_download_version_number,last_download_date,total_contacts_received,status,membership,registration_date",
        )
        .eq("id", user.id)
        .maybeSingle(),

      supabase
        .from("contact_versions")
        .select("version_number,created_at")
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("profiles")
        .select("id,last_login_at,registration_date")
        .eq("status", "approved")
        .neq("id", user.id),

      supabase
        .from("app_settings")
        .select("value")
        .eq("key", "tutorial_video_url")
        .maybeSingle(),
    ]);

    setVideoUrl(toYouTubeEmbed((setting?.value as string) ?? ""));

    const { data: delivered } = await supabase
      .from("user_downloaded_contacts")
      .select("contact_id")
      .eq("user_id", user.id);

    const deliveredIds = new Set(
      (delivered ?? []).map((r) => r.contact_id as string),
    );

    setSavedIds(deliveredIds);

    const eligible = (activeRows ?? []).filter((r) =>
      isRecentlyActive(
        r as {
          last_login_at?: string | null;
          registration_date?: string | null;
        },
      ),
    );

    const totalActive = eligible.length;

    const newCount = eligible.filter(
      (r) => !deliveredIds.has(r.id as string),
    ).length;

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
      phone: profile?.phone ?? "",
      status: (profile?.status as Stats["status"]) ?? "approved",
      membership:
        ((profile as { membership?: Membership } | null)?.membership ??
          "freemium") as Membership,
      registrationDate: profile?.registration_date ?? "",
      isFirstDownload: deliveredIds.size === 0,
    });

    // Get this member's latest Premium payment request.
    const { data: latestPayment } = await supabase
      .from("premium_payment_requests")
      .select("id,amount,status,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setPaymentRequest(
      latestPayment
        ? {
            id: latestPayment.id as string,
            amount: Number(latestPayment.amount),
            status: latestPayment.status as PaymentRequest["status"],
            created_at: latestPayment.created_at as string,
          }
        : null,
    );

    // People who received / saved this user's contact.
    const { data: dlRows } = await supabase
      .from("user_downloaded_contacts")
      .select("id,downloaded_at,user_id")
      .eq("contact_id", user.id)
      .order("downloaded_at", { ascending: false })
      .limit(200);

    const ids = Array.from(
      new Set((dlRows ?? []).map((r) => r.user_id as string)),
    );

    let profilesById = new Map<
      string,
      { phone: string; user_code: string; full_name: string }
    >();

    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,phone,user_code,full_name")
        .in("id", ids);

      profilesById = new Map(
        (profs ?? []).map((p) => [
          p.id as string,
          {
            phone: p.phone as string,
            user_code: p.user_code as string,
            full_name: p.full_name as string,
          },
        ]),
      );
    }

    setDownloaders(
      (dlRows ?? []).map((r) => {
        const p = profilesById.get(r.user_id as string);

        return {
          id: r.id as string,
          user_id: r.user_id as string,
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_versions" },
        () => load(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_downloaded_contacts",
        },
        () => load(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "premium_payment_requests",
        },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  async function copyAccountNumber() {
    try {
      await navigator.clipboard.writeText(PAYMENT_ACCOUNT);
      setCopied(true);
      toast.success("Account number copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy account number");
    }
  }

  async function notifyAdmin() {
    if (!user || !stats) return;

    if (!stats.phone) {
      toast.error(
        "Your registered WhatsApp number could not be found. Please contact the administrator.",
      );
      return;
    }

    if (
      paymentRequest?.status === "pending"
    ) {
      toast.info("You already have a payment notification awaiting review.");
      return;
    }

    setPaymentBusy(true);

    try {
      const { error } = await supabase
        .from("premium_payment_requests")
        .insert({
          user_id: user.id,
          full_name: stats.fullName,
          phone: stats.phone,
          amount: PREMIUM_PRICE,
          status: "pending",
        });

      if (error) throw error;

      await logAudit("premium_payment_notification", {
        amount: PREMIUM_PRICE,
        phone: stats.phone,
      });

      toast.success(
        "Payment notification sent. The administrator will verify your payment.",
      );

      await load();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not send payment notification",
      );
    } finally {
      setPaymentBusy(false);
    }
  }

  async function fetchUndeliveredContacts() {
    if (!user)
      return [] as {
        id: string;
        contact_seq: number;
        phone: string;
      }[];

    const { data: delivered } = await supabase
      .from("user_downloaded_contacts")
      .select("contact_id")
      .eq("user_id", user.id);

    const deliveredIds = (delivered ?? []).map(
      (r) => r.contact_id as string,
    );

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
      .filter((r) =>
        isRecentlyActive(
          r as {
            last_login_at?: string | null;
            registration_date?: string | null;
          },
        ),
      )
      .map((r) => ({
        id: r.id as string,
        contact_seq: r.contact_seq as number,
        phone: r.phone as string,
      }));
  }

  async function recordDelivery(
    contacts: { id: string }[],
    kind: "first_community" | "new" | "complete" | "reciprocal",
  ) {
    if (!user || !stats || contacts.length === 0) return;

    const rows = contacts.map((c) => ({
      user_id: user.id,
      contact_id: c.id,
    }));

    const CHUNK = 500;

    for (let i = 0; i < rows.length; i += CHUNK) {
      await supabase
        .from("user_downloaded_contacts")
        .upsert(rows.slice(i, i + CHUNK), {
          onConflict: "user_id,contact_id",
          ignoreDuplicates: true,
        });
    }

    await supabase.from("downloads").insert({
      user_id: user.id,
      download_type: kind,
      from_version: stats.lastDownloadVersion,
      to_version: Math.max(
        stats.latestVersion,
        stats.lastDownloadVersion,
      ),
      contact_count: contacts.length,
    });

    await supabase
      .from("profiles")
      .update({
        last_download_version_number: Math.max(
          stats.lastDownloadVersion,
          stats.latestVersion,
        ),
        last_download_date: new Date().toISOString(),
        total_contacts_received:
          stats.downloaded + contacts.length,
      })
      .eq("id", user.id);

    await logAudit(`download_${kind}`, {
      count: contacts.length,
    });
  }

  async function downloadNew() {
    if (!stats) return;

    setBusy("new");

    try {
      const contacts = await fetchUndeliveredContacts();

      if (contacts.length < MIN_CONTACTS) {
        toast.info(
          `Only ${contacts.length} new contact${
            contacts.length === 1 ? "" : "s"
          } available. We need at least ${MIN_CONTACTS} — please check back soon.`,
        );
        return;
      }

      const kind: "first_community" | "new" =
        stats.isFirstDownload ? "first_community" : "new";

      const label = stats.isFirstDownload ? "community" : "new";

      downloadVcf(
        `status-connect-${label}-${contacts.length}contacts-v${stats.latestVersion}.vcf`,
        generateVcf(contacts),
      );

      await recordDelivery(contacts, kind);

      toast.success(
        `Downloaded ${contacts.length} new contacts — import the .vcf to your phone`,
      );

      load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Download failed",
      );
    } finally {
      setBusy(null);
    }
  }

  async function downloadNetwork() {
    if (!stats) return;

    setBusy("network");

    try {
      const fresh = downloaders.filter(
        (d) => d.phone && !savedIds.has(d.user_id),
      );

      const seen = new Set<string>();

      const unique = fresh.filter((d) =>
        seen.has(d.user_id)
          ? false
          : (seen.add(d.user_id), true),
      );

      if (unique.length === 0) {
        toast.info(
          "No new reciprocal contacts — you've already saved everyone who saved you.",
        );
        return;
      }

      const entries = unique.map((d) => ({
        name: `Status Connect ${d.user_code}`,
        phone: d.phone,
      }));

      downloadVcf(
        `status-connect-network-${entries.length}contacts.vcf`,
        generateNamedVcf(entries),
      );

      await recordDelivery(
        unique.map((d) => ({ id: d.user_id })),
        "reciprocal",
      );

      toast.success(
        `Downloaded ${entries.length} reciprocal contacts`,
      );

      load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Download failed",
      );
    } finally {
      setBusy(null);
    }
  }

  if (!stats)
    return (
      <p className="text-sm text-muted-foreground">
        Loading…
      </p>
    );

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

        <p className="text-xs text-muted-foreground">
          Your ID:{" "}
          <span className="font-mono">
            {stats.userCode}
          </span>
        </p>
      </div>
    );
  }

  const canDownloadNew =
    stats.newAvailable >= MIN_CONTACTS;

  const isPremium =
    stats.membership === "premium";

  const newReciprocal = new Set(
    downloaders
      .filter(
        (d) => d.phone && !savedIds.has(d.user_id),
      )
      .map((d) => d.user_id),
  ).size;

  const paymentPending =
    paymentRequest?.status === "pending";

  const paymentApproved =
    paymentRequest?.status === "approved";

  const paymentRejected =
    paymentRequest?.status === "rejected";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Welcome back
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {stats.fullName}
          </h1>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isPremium
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isPremium ? (
              <Crown className="h-3.5 w-3.5" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}

            {isPremium
              ? "Premium member"
              : "Freemium member"}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          Your ID:{" "}
          <span className="font-mono">
            {stats.userCode}
          </span>
        </p>
      </div>

      {/* PREMIUM PAYMENT SECTION */}
      {!isPremium && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 overflow-hidden">
          <div className="p-5 border-b border-primary/20">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Upgrade to Premium
              </h2>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Get access to your reciprocal network for
              just <strong>₦2,000 for 30 days</strong>.
            </p>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <PaymentDetail
                label="Bank"
                value={PAYMENT_BANK}
              />

              <PaymentDetail
                label="Account Name"
                value={PAYMENT_NAME}
              />

              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">
                  Account Number
                </p>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="font-mono font-semibold text-foreground">
                    {PAYMENT_ACCOUNT}
                  </p>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={copyAccountNumber}
                    title="Copy account number"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-background p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <p className="font-semibold text-foreground">
                  Payment Instructions
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                Pay exactly <strong className="text-foreground">₦2,000</strong>{" "}
                to the account above.
              </p>

              <div className="mt-3 rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">
                  Payment description / narration
                </p>

                <p className="mt-1 font-mono font-semibold text-foreground break-all">
                  StatusConnect + {stats.phone}
                </p>
              </div>

              {paymentPending && (
  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
    <p className="font-semibold text-yellow-700 dark:text-yellow-400">
      Payment notification pending
    </p>
    <p className="mt-1 text-sm text-muted-foreground">
      Your payment notification has been sent to the administrator.
      Please wait for confirmation.
    </p>
  </div>
)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
              }
