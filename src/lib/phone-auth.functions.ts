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

/**
 * Deterministic server-side password.
 * This secret never leaves the server.
 */
function derivedSecret(phone: string) {
  const salt = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";

  return (
    "sc_" +
    createHash("sha256")
      .update(`${normalize(phone)}::${salt}`)
      .digest("hex")
  );
}

/**
 * Internal email used only by Supabase Auth.
 * Users never see or enter this email.
 */
function internalEmail(phone: string) {
  return `${normalize(phone).slice(1)}@auth.statusconnect.local`;
}

function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing");
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);

        if (
          key.startsWith("sb_") &&
          headers.get("Authorization") === `Bearer ${key}`
        ) {
          headers.delete("Authorization");
        }

        headers.set("apikey", key);

        return fetch(input, {
          ...init,
          headers,
        });
      },
    },
  });
}

/**
 * Sign in using the internal email identity.
 *
 * IMPORTANT:
 * We deliberately do NOT use Supabase phone authentication here.
 * This avoids the "Phone logins are disabled" error.
 */
async function signInWithInternalEmail(
  phone: string,
): Promise<PhoneAuthResult> {
  const email = internalEmail(phone);
  const password = derivedSecret(phone);

  const { data, error } = await publicClient().auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    console.error(
      "[phone-auth] internal email sign-in failed",
      error,
    );

    return {
      ok: false,
      error: error?.message ?? "Could not sign in",
    };
  }

  return {
    ok: true,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}

/**
 * Find a Supabase Auth user using the phone number.
 *
 * This runs only on the server using the service-role client.
 */
async function findAuthUserByPhone(phone: string) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  const targetPhone = normalize(phone).slice(1);

  let page = 1;

  while (true) {
    const { data, error } =
      await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

    if (error) {
      console.error(
        "[phone-auth] listUsers failed",
        error,
      );

      throw new Error(error.message);
    }

    const user = data.users.find(
      (user) => user.phone === targetPhone,
    );

    if (user) {
      return user;
    }

    if (data.users.length < 1000) {
      return null;
    }

    page++;
  }
}

/**
 * Converts an older phone-auth account into the internal
 * email/password authentication used by StatusConnect.
 *
 * The user still logs in using only their WhatsApp number.
 */
async function prepareAuthUser(
  phone: string,
  userId: string,
  fullName?: string,
) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  const email = internalEmail(phone);
  const password = derivedSecret(phone);

  const { error } =
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      email,
      email_confirm: true,
      password,
      phone: normalize(phone).slice(1),
      phone_confirm: true,
      ...(fullName
        ? {
            user_metadata: {
              full_name: fullName,
              phone: normalize(phone),
              country: "Nigeria",
            },
          }
        : {}),
    });

  if (error) {
    console.error(
      "[phone-auth] updateUserById failed",
      error,
    );

    throw new Error(error.message);
  }
}

const phoneRe = /^\+[1-9]\d{6,14}$/;

/**
 * REGISTER
 */
export const registerWithPhone = createServerFn({
  method: "POST",
})
  .inputValidator(
    (input: {
      full_name: string;
      phone: string;
    }) => input,
  )
  .handler(
    async ({ data }): Promise<PhoneAuthResult> => {
      const phone = normalize(data.phone);
      const fullName = data.full_name.trim();

      if (!phoneRe.test(phone)) {
        return {
          ok: false,
          error:
            "Enter a valid WhatsApp number with country code",
        };
      }

      if (fullName.length < 2 || fullName.length > 100) {
        return {
          ok: false,
          error: "Enter your full name",
        };
      }

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      /**
       * Check the application's profiles table first.
       */
      const { data: existing, error: profileError } =
        await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("phone", phone)
          .maybeSingle();

      if (profileError) {
        console.error(
          "[phone-auth] profile lookup failed",
          profileError,
        );

        return {
          ok: false,
          error: "Could not verify your registration details",
        };
      }

      if (existing) {
        return {
          ok: false,
          error:
            "This WhatsApp number is already registered. Please log in instead.",
        };
      }

      const email = internalEmail(phone);
      const password = derivedSecret(phone);

      /**
       * Create the Supabase Auth account using an internal
       * email/password identity.
       *
       * The user never sees this email or password.
       */
      const { data: created, error } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          phone: phone.slice(1),
          phone_confirm: true,
          password,
          user_metadata: {
            full_name: fullName,
            phone,
            country: "Nigeria",
          },
        });

      if (error || !created.user) {
        console.error(
          "[phone-auth] createUser failed",
          error,
        );

        if (
          error &&
          /already|registered|exists/i.test(error.message)
        ) {
          return {
            ok: false,
            error:
              "This WhatsApp number is already registered. Please log in instead.",
          };
        }

        return {
          ok: false,
          error:
            error?.message ?? "Could not create account",
        };
      }

      /**
       * Authenticate immediately after registration.
       */
      return signInWithInternalEmail(phone);
    },
  );

/**
 * LOGIN
 */
export const loginWithPhone = createServerFn({
  method: "POST",
})
  .inputValidator(
    (input: {
      phone: string;
    }) => input,
  )
  .handler(
    async ({ data }): Promise<PhoneAuthResult> => {
      const phone = normalize(data.phone);

      if (!phoneRe.test(phone)) {
        return {
          ok: false,
          error:
            "Enter a valid WhatsApp number with country code",
        };
      }

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      /**
       * Verify that the WhatsApp number exists in
       * the StatusConnect profiles table.
       */
      const { data: profile, error: profileError } =
        await supabaseAdmin
          .from("profiles")
          .select("id, full_name")
          .eq("phone", phone)
          .maybeSingle();

      if (profileError) {
        console.error(
          "[phone-auth] profile lookup failed",
          profileError,
        );

        return {
          ok: false,
          error: "Could not verify your account",
        };
      }

      if (!profile) {
        return {
          ok: false,
          error:
            "This number is not registered yet. Create an account first.",
        };
      }

      /**
       * Find the real Supabase Auth user.
       *
       * We intentionally do not assume profiles.id is the
       * Auth user ID, even though your current account happens
       * to have matching IDs.
       */
      const authUser = await findAuthUserByPhone(phone);

      if (!authUser) {
        return {
          ok: false,
          error:
            "Your Status Connect account exists, but its login account could not be found. Please contact support.",
        };
      }

      /**
       * Convert/repair older accounts that were created using
       * Supabase phone authentication.
       */
      try {
        await prepareAuthUser(
          phone,
          authUser.id,
          profile.full_name,
        );
      } catch (error) {
        console.error(
          "[phone-auth] account preparation failed",
          error,
        );

        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not prepare your account for login",
        };
      }

      /**
       * Finally authenticate using internal email/password.
       *
       * This does NOT use Supabase phone login.
       */
      return signInWithInternalEmail(phone);
    },
  );
