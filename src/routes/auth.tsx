import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit";
import { loginWithPhone, registerWithPhone } from "@/lib/phone-auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Mode = "login" | "register";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in with your WhatsApp number | Status Connect" },
      {
        name: "description",
        content:
          "Join Status Connect with just your name and WhatsApp number — no email, no password. Exchange verified WhatsApp contacts in bulk with VCF downloads.",
      },
      { property: "og:title", content: "Sign in with your WhatsApp number | Status Connect" },
      {
        property: "og:description",
        content: "Register with only your full name and WhatsApp number and start exchanging contacts.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { mode?: Mode } => ({
    mode: s.mode === "register" ? "register" : "login",
  }),
  component: AuthPage,
});

function normalizePhone(p: string) {
  const digits = p.trim().replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "";
}

function AuthPage() {
  const { mode = "login" } = Route.useSearch();
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">SC</div>
            <span className="font-semibold text-lg text-foreground">Status Connect</span>
          </Link>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          {mode === "login" ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const login = useServerFn(loginWithPhone);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = normalizePhone(phone);
      const res = await login({ data: { phone: p } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { error } = await supabase.auth.setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      });
      if (error) throw error;
      await logAudit("login", { phone: p });
      toast.success("Signed in");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Log in</h1>
      <p className="text-sm text-muted-foreground">Just your WhatsApp number — no email or password needed.</p>
      <div>
        <Label htmlFor="phone">WhatsApp number</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          placeholder="+2348012345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Log in"}</Button>
      <p className="text-sm text-center text-muted-foreground">
        New here? <Link to="/auth" search={{ mode: "register" }} className="text-primary hover:underline">Create account</Link>
      </p>
    </form>
  );
}

function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const register = useServerFn(registerWithPhone);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = normalizePhone(phone);
      const res = await register({ data: { full_name: fullName, phone: p } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { error } = await supabase.auth.setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      });
      if (error) throw error;
      await logAudit("registration", { phone: p });
      toast.success("Account created");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Create account</h1>
      <p className="text-sm text-muted-foreground rounded-md bg-primary/5 border border-primary/20 p-3">
        Please register using the phone number connected to your <strong>active WhatsApp account</strong>. This is the number other community members will receive in their downloaded contact list.
      </p>
      <div>
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="phone">WhatsApp number (with country code)</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          placeholder="+2348012345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Register"}</Button>
      <p className="text-sm text-center text-muted-foreground">
        Already have an account? <Link to="/auth" className="text-primary hover:underline">Log in</Link>
      </p>
    </form>
  );
}
