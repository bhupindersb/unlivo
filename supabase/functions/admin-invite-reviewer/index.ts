import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = new Set(["https://www.unlivo.com", "https://unlivo.com"]);
  return {
    "Access-Control-Allow-Origin": allowed.has(origin) ? origin : "https://www.unlivo.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...headers, "Content-Type": "application/json" } });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...headers, "Content-Type": "application/json" } });
    const { data: profile } = await authClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...headers, "Content-Type": "application/json" } });
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    if (!email || !email.includes("@")) return new Response(JSON.stringify({ error: "A valid email address is required" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    if (!firstName || !lastName) return new Response(JSON.stringify({ error: "First name and last name are required" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: existing, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) return new Response(JSON.stringify({ error: listError.message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    const match = existing.users.find((u) => u.email?.toLowerCase() === email);
    const fullName = `${firstName} ${lastName}`.trim();
    if (match) {
      const userMetadata = { ...(match.user_metadata ?? {}), first_name: firstName, last_name: lastName, reviewer_invite: false };
      const { error: authError } = await admin.auth.admin.updateUserById(match.id, { user_metadata: userMetadata });
      if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
      const { error } = await admin.from("profiles").upsert({ id: match.id, email, full_name: fullName, role: "reviewer", access_status: "active", updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: true, existing: true, message: "Existing account promoted to reviewer." }), { headers: { ...headers, "Content-Type": "application/json" } });
    }
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { first_name: firstName, last_name: lastName, reviewer_invite: true }, redirectTo: "https://www.unlivo.com/auth/confirm?type=invite" });
    if (inviteError) return new Response(JSON.stringify({ error: inviteError.message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    if (!invited.user) return new Response(JSON.stringify({ error: "The reviewer invitation could not be created." }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    const { error: profileError } = await admin.from("profiles").upsert({ id: invited.user.id, email, full_name: fullName, role: "reviewer", access_status: "active", updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (profileError) return new Response(JSON.stringify({ error: profileError.message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    const { error: dbError } = await admin.from("reviewer_invites").upsert({ email, invited_by: user.id, status: "pending", updated_at: new Date().toISOString() }, { onConflict: "email" });
    if (dbError) return new Response(JSON.stringify({ error: dbError.message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ success: true, existing: false, message: `Invitation sent to ${fullName}.` }), { headers: { ...headers, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
  }
});
