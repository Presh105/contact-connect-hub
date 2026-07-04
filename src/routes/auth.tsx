import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Mode = "login" | "register" | "reset";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode } => {
    const m = s.mode;
    return { mode: m === "register" || m === "reset" ? m : "login" };
  },
  component: AuthPage,
});

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, "Include country code, e.g. +2348012345678");

const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, "Enter your full name").max(100),
    phone: phoneSchema,
    country: z.string().trim().min(2, "Enter your country").max(60),
    password: z.string().min(6, "Password must be at least 6 characters").max(72),
    confirm_password: z.string(),
  })
  .refine((v) => v.password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });

function normalizePhone(p: string) {
  return p.trim().replace(/\s+/g, "");
}

function syntheticEmail(phone: string) {
  return `${phone.replace(/[^\d]/g, "")}@statusconnect.local`;
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
          {mode === "login" && <LoginForm />}
          {mode === "register" && <RegisterForm />}
          {mode === "reset" && <ResetForm />}
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = normalizePhone(phone);
      phoneSchema.parse(p);
      const { data: emailData } = await supabase.rpc("email_for_phone", { _phone: p });
      const email = (emailData as string | null) || syntheticEmail(p);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
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
      <div>
        <Label htmlFor="phone">WhatsApp number</Label>
        <Input id="phone" placeholder="+2348012345678" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Log in"}</Button>
      <div className="flex justify-between text-sm">
        <Link to="/auth" search={{ mode: "register" }} className="text-primary hover:underline">Create account</Link>
        <Link to="/auth" search={{ mode: "reset" }} className="text-muted-foreground hover:underline">Forgot password?</Link>
      </div>
    </form>
  );
}

function RegisterForm() {
  const [form, setForm] = useState({ full_name: "", phone: "", country: "", password: "", confirm_password: "" });
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const parsed = registerSchema.parse({ ...form, phone: normalizePhone(form.phone) });
      const { data: exists } = await supabase.rpc("phone_exists", { _phone: parsed.phone });
      if (exists) {
        toast.error("This phone number is already registered. Please log in instead.");
        navigate({ to: "/auth" });
        return;
      }
      const email = syntheticEmail(parsed.phone);
      const { error } = await supabase.auth.signUp({
        email,
        password: parsed.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: parsed.full_name,
            phone: parsed.phone,
            country: parsed.country,
          },
        },
      });
      if (error) throw error;
      await logAudit("registration", { phone: parsed.phone });
      toast.success("Account created — awaiting approval");
      navigate({ to: "/dashboard" });
    } catch (err) {
      if (err instanceof z.ZodError) toast.error(err.issues[0].message);
      else toast.error(err instanceof Error ? err.message : "Registration failed");
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
        <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="phone">WhatsApp number (with country code)</Label>
        <Input id="phone" placeholder="+2348012345678" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="country">Country</Label>
        <Input id="country" value={form.country} onChange={(e) => set("country", e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={6} />
      </div>
      <div>
        <Label htmlFor="confirm_password">Confirm password</Label>
        <Input id="confirm_password" type="password" value={form.confirm_password} onChange={(e) => set("confirm_password", e.target.value)} required minLength={6} />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Register"}</Button>
      <p className="text-sm text-center text-muted-foreground">
        Already have an account? <Link to="/auth" className="text-primary hover:underline">Log in</Link>
      </p>
    </form>
  );
}

function ResetForm() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = normalizePhone(phone);
      phoneSchema.parse(p);
      const { data: emailData } = await supabase.rpc("email_for_phone", { _phone: p });
      const email = (emailData as string | null) || syntheticEmail(p);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("If an account exists for that number, a reset link has been sent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Reset password</h1>
      <p className="text-sm text-muted-foreground">Enter the WhatsApp number you registered with.</p>
      <div>
        <Label htmlFor="phone">WhatsApp number</Label>
        <Input id="phone" placeholder="+2348012345678" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
      <p className="text-sm text-center">
        <Link to="/auth" className="text-primary hover:underline">Back to login</Link>
      </p>
    </form>
  );
}
