"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";

export default function ConfirmPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setError("Authentication is temporarily unavailable. Please try again.");
      setStatus("error");
      return;
    }

    let cancelled = false;

    const finish = async () => {
      try {
        const query = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const tokenHash = query.get("token_hash");
        const queryType = query.get("type") as "signup" | "email" | "recovery" | "invite" | "email_change" | null;
        const code = query.get("code");
        const hashError = hash.get("error_description") || hash.get("error");

        if (hashError) {
          throw new Error(decodeURIComponent(hashError.replace(/\+/g, " ")));
        }

        // Support the token-hash confirmation template when it is configured.
        if (tokenHash && queryType) {
          const result = await client.auth.verifyOtp({ token_hash: tokenHash, type: queryType });
          if (result.error) throw result.error;
        } else if (code) {
          // Support PKCE-style confirmation redirects as well.
          const result = await client.auth.exchangeCodeForSession(code);
          if (result.error) throw result.error;
        } else {
          // For the client-side implicit flow, Supabase's browser client consumes
          // the access/refresh tokens from the URL hash automatically.
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        const sessionResult = await client.auth.getSession();
        const user = sessionResult.data.session?.user;
        if (!user) {
          throw new Error("We could not establish your session. Please request a new confirmation email and try again.");
        }

        await client.from("profiles").upsert(
          { id: user.id, email: user.email ?? null },
          { onConflict: "id", ignoreDuplicates: true }
        );

        if (!cancelled) setStatus("success");
        window.location.replace("/post-property?confirmed=1");
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "This confirmation link is incomplete or has expired.");
        setStatus("error");
      }
    };

    finish();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7fafb] px-6 text-[#102638]">
      <div className="w-full max-w-md rounded-3xl border border-[#dfe9ed] bg-white p-8 text-center shadow-sm">
        <img src="/unlivo-logo.svg" alt="UNLIVO" className="mx-auto w-[210px]" />
        <div className="mx-auto mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-[#e9faf6] text-[#0b8f79]">
          {status === "error" ? <span className="text-xl">!</span> : <CheckCircle2 size={30} />}
        </div>
        <h1 className="mt-5 text-2xl font-extrabold">
          {status === "error" ? "Confirmation link problem" : "Confirming your UNLIVO account"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#687987]">
          {status === "error" ? error : "Please wait while we securely verify your email…"}
        </p>
        {status === "error" && (
          <a href="/post-property" className="mt-6 inline-flex rounded-xl bg-[#123b53] px-6 py-3 text-sm font-bold text-white">
            Return to UNLIVO
          </a>
        )}
      </div>
    </main>
  );
}
