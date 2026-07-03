import { supabase } from "@/integrations/supabase/client";

export async function logAudit(action: string, meta: Record<string, unknown> = {}) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("audit_log").insert({ user_id: data.user.id, action, meta: meta as never });
}
