import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import type { Database } from "@/integrations/supabase/types";

export type PhoneAuthResult =
  | { ok: true; access_token: string; refresh_token: string }
  | { ok: false; error: string };

function normalize(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return `+${digits}`;
}

/** Deterministic server-side secret for the account. Never leaves the server. */
function derivedSecret(phone: string) {
  const salt = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
  return "sc_" + createHash("sha256").update(`${normalize(phone)}::${salt}`).digest("hex");
}

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function signIn(phone: string): Promise<PhoneAuthResult> {
  const { data, error } = await publicClient().auth.signInWithPassword({
    phone: normalize(phone).slice(1),
    password: derivedSecret(phone),
  });
  if (error || !data.session) { console.error("[phone-auth] signIn failed", error); return { ok: false, error: error?.message ?? "Could not sign in" }; }
  return { ok: true, access_token: data.session.access_token, refresh_token: data.session.refresh_token };
}

const phoneRe = /^\+[1-9]\d{6,14}$/;

export const registerWithPhone = createServerFn({ method: "POST" })
  .inputValidator((input: { full_name: string; phone: string }) => input)
  .handler(async ({ data }): Promise<PhoneAuthResult> => {
    const phone = normalize(data.phone);
    const fullName = data.full_name.trim();
    if (!phoneRe.test(phone)) return { ok: false, error: "Enter a valid WhatsApp number with country code" };
    if (fullName.length < 2 || fullName.length > 100) return { ok: false, error: "Enter your full name" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (existing) return { ok: false, error: "This WhatsApp number is already registered. Please log in instead." };

    const { error } = await supabaseAdmin.auth.admin.createUser({
      phone: phone.slice(1),
      phone_confirm: true,
      password: derivedSecret(phone),
      user_metadata: { full_name: fullName, phone, country: "Nigeria" },
    });
    if (error) {
      console.error("[phone-auth] createUser failed", error);
      if (/already|registered|exists/i.test(error.message))
        return { ok: false, error: "This WhatsApp number is already registered. Please log in instead." };
      return { ok: false, error: error.message };
    }

    return signIn(phone);
  });

export const loginWithPhone = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string }) => input)
  .handler(async ({ data }): Promise<PhoneAuthResult> => {
    const phone = normalize(data.phone);
    if (!phoneRe.test(phone)) return { ok: false, error: "Enter a valid WhatsApp number with country code" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (!profile) return { ok: false, error: "This number is not registered yet. Create an account first." };

    const first = await signIn(phone);
    if (first.ok) return first;

    // Older accounts were created before phone-only sign-in: attach the phone
    // identity + server secret to the existing auth user, then retry.
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      phone: phone.slice(1),
      phone_confirm: true,
      password: derivedSecret(phone),
    });
    if (updErr) return { ok: false, error: updErr.message };
    return signIn(phone);
  });
