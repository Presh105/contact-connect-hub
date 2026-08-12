import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  membership: "freemium" | "premium" | null;
}

const AuthCtx = createContext<AuthState>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  membership: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [membership, setMembership] = useState<"freemium" | "premium" | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s?.user) {
        // check admin role + record login (deferred to avoid blocking the auth callback)
        setTimeout(async () => {
          const { data } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", s.user.id)
            .eq("role", "admin")
            .maybeSingle();
          setIsAdmin(!!data);
          const { data: prof } = await supabase
            .from("profiles")
            .select("membership")
            .eq("id", s.user.id)
            .maybeSingle();
          setMembership(((prof?.membership as "freemium" | "premium") ?? "freemium"));
          if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
            await supabase.rpc("record_login");
            // Opportunistic sweep so inactive-user status stays fresh without an admin cron.
            await supabase.rpc("sweep_inactive_users");
          }
        }, 0);
      } else {
        setIsAdmin(false);
        setMembership(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);


  return (
    <AuthCtx.Provider value={{ session, user: session?.user ?? null, loading, isAdmin }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
