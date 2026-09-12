"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";

export default function ConfirmPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");
  const [confirmedType, setConfirmedType] = useState<string>("");

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

        if (tokenHash && queryType) {
          const result = await client.auth.verifyOtp({ token_hash: tokenHash, type: queryType });
          if (result.error) throw result.error;
        } else if (code) {
          const result = await client.auth.exchangeCodeForSession(code);
          if (result.error) throw result.error;
        } else {
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

        // Email confirmation proves ownership of the address, but we deliberately
        // do not keep the newly confirmed signup session. The user must explicitly
        // log in before accessing the application, giving the confirmation flow an
        // additional authentication boundary.
        if (queryType === "signup" || (!queryType && !code)) {
          await client.auth.signOut();
        }

        if (!cancelled) {
          setConfirmedType(queryType ?? "signup");
          setStatus("success");
        }
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
          {status === "error" ? "Confirmation link problem" : status === "success" ? "Email verified successfully" : "Confirming your UNLIVO account"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#687987]">
          {status === "error"
            ? error
            : status === "success"
              ? confirmedType === "invite"
                ? "Your UNLIVO staff invitation has been confirmed. You can now continue to your staff login."
                : "Your email address has been verified. For your security, please log in to continue."
              : "Please wait while we securely verify your email…"}
        </p>
        {status === "success" && (
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={confirmedType === "invite" ? "/reviewer/login" : "/post-property?mode=login"}
              className="inline-flex items-center justify-center rounded-xl bg-[#123b53] px-6 py-3 text-sm font-bold text-white"
            >
              {confirmedType === "invite" ? "Continue to Staff Login" : "Log in to UNLIVO"}
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-[#cfdde3] bg-white px-6 py-3 text-sm font-bold text-[#123b53]"
            >
              Go to Homepage
            </a>
          </div>
        )}
        {status === "error" && (
          <a href="/" className="mt-6 inline-flex rounded-xl bg-[#123b53] px-6 py-3 text-sm font-bold text-white">
            Return to UNLIVO
          </a>
        )}
      </div>
    </main>
  );
}
