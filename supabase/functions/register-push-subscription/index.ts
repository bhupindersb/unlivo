import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const auth = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Server configuration error" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
    const p256dh = typeof body.p256dh === "string" ? body.p256dh.trim() : "";
    const authKey = typeof body.auth === "string" ? body.auth.trim() : "";
    const userAgent = typeof body.user_agent === "string" ? body.user_agent.slice(0, 1000) : null;

    if (!endpoint || !p256dh || !authKey) {
      return json({ error: "Incomplete push subscription" }, 400);
    }

    if (!endpoint.startsWith("https://")) {
      return json({ error: "Invalid push subscription endpoint" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // A browser push subscription belongs to the current browser/service-worker
    // subscription. When a user signs out and another UNLIVO account signs in on
    // the same browser, transfer that endpoint to the newly authenticated user.
    await admin
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .neq("user_id", user.id);

    const { error: upsertError } = await admin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth: authKey,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );

    if (upsertError) {
      console.error("register-push-subscription: database error", upsertError);
      return json({ error: upsertError.message }, 500);
    }

    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not register push subscription";
    console.error("register-push-subscription: unhandled error", message);
    return json({ error: message }, 500);
  }
});
