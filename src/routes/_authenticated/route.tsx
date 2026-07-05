import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogOut, LayoutDashboard, History } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  component: ProtectedLayout,
});

// Must match ADMIN_PASSCODE / ADMIN_PHONE in src/routes/_authenticated/admin.tsx
const ADMIN_PASSCODE = "SC-ADMIN-2026";
const GATE_KEY = "sc_admin_gate_ok";

function ProtectedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [gateOpen, setGateOpen] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  }

  function trySubmit() {
    if (code === ADMIN_PASSCODE) {
      sessionStorage.setItem(GATE_KEY, "1");
      setGateOpen(false);
      setCode("");
      navigate({ to: "/admin" });
    } else {
      toast.error("Incorrect passcode");
    }
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setGateOpen(true)}
            aria-label="Open admin dashboard"
            className="flex items-center gap-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">SC</div>
            <span className="font-semibold text-foreground hidden sm:inline">Status Connect</span>
          </button>
          <nav className="flex items-center gap-1">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm"><LayoutDashboard className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Dashboard</span></Button>
            </Link>
            <Link to="/download-history">
              <Button variant="ghost" size="sm"><History className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">History</span></Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Sign out</span>
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>

      <Dialog open={gateOpen} onOpenChange={(o) => { setGateOpen(o); if (!o) setCode(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Admin dashboard</DialogTitle>
            <DialogDescription>Enter the admin passcode to continue.</DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            autoFocus
            placeholder="Passcode"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") trySubmit(); }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGateOpen(false)}>Cancel</Button>
            <Button onClick={trySubmit}>Unlock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
