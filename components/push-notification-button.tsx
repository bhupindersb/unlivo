"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

const VAPID_PUBLIC_KEY = "BE30ODlsY9Du80I4oexOJUVLHgDjetPglCDhclO15WEK9s8sYO4J5n54s92NfQl-ftWh3yYrvV28b3zULmeZAmE";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PushNotificationButton() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const available = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    setSupported(available);
    if (!available) return;
    setPermission(Notification.permission);

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "UNLIVO_PUSH_DIAGNOSTIC") return;

      const diagnostic = event.data;
      console.info("UNLIVO real push diagnostic", diagnostic);

      const time = diagnostic.receivedAt
        ? new Date(diagnostic.receivedAt).toLocaleTimeString()
        : "unknown time";

      if (diagnostic.stage === "push_received" || diagnostic.stage === "payload_decoded" || diagnostic.stage === "payload_text_fallback") {
        setMessage(
          `REAL PUSH RECEIVED by service worker v${diagnostic.version || "unknown"} at ${time}. Stage: ${diagnostic.stage}.`,
        );
      } else if (diagnostic.stage === "showNotification_succeeded") {
        setMessage(
          `REAL PUSH RECEIVED and notification created by service worker v${diagnostic.version || "unknown"} at ${time}.`,
        );
      } else if (diagnostic.stage === "showNotification_failed") {
        setMessage(
          `REAL PUSH reached service worker, but showNotification failed: ${diagnostic.error || "Unknown error"}`,
        );
      }
    };

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);

    const checkSubscription = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const registration = await navigator.serviceWorker.register("/push-sw.js");
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setEnabled(false);
        return;
      }

      const { data: savedSubscription } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("endpoint", subscription.endpoint)
        .maybeSingle();

      setEnabled(Boolean(savedSubscription));
    };

    void checkSubscription().catch(() => setEnabled(false));

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, []);

  if (!supported || permission === "denied") return null;

  const enableNotifications = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setMessage("Please sign in first.");
        return;
      }

      const nextPermission = permission === "granted" ? "granted" : await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        setMessage("Notifications were not enabled.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("The browser did not return a complete push subscription.");
      }

      const { data, error } = await supabase.functions.invoke("register-push-subscription", {
        body: {
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent,
        },
      });

      if (error) {
        let detail = error.message || "Could not register the browser subscription.";
        try {
          const context = (error as { context?: Response }).context;
          if (context) {
            const body = await context.clone().json();
            if (typeof body?.error === "string") detail = body.error;
          }
        } catch {}
        throw new Error(detail);
      }

      if (!data?.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Could not register the browser subscription.");
      }

      setEnabled(true);
      setMessage("Browser notifications enabled.");
    } catch (error) {
      console.error("UNLIVO browser notification setup failed", error);
      setMessage(error instanceof Error ? error.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  };

  const disableNotifications = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        if (user) await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
      }
      setEnabled(false);
      setMessage("Browser notifications disabled.");
    } catch (error) {
      console.error("UNLIVO browser notification disable failed", error);
      setMessage(error instanceof Error ? error.message : "Could not disable notifications.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="border-t border-[#e8eef1] px-2 py-1.5">
    <button onClick={enabled ? disableNotifications : enableNotifications} disabled={busy} className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[10px] font-medium leading-4 text-[#526574] transition hover:bg-[#f1f8f7] hover:text-[#087f73] disabled:cursor-wait disabled:opacity-60">
      {busy ? <Loader2 size={14} className="shrink-0 animate-spin text-[#087f73]"/> : enabled ? <Bell size={12} className="shrink-0 text-[#087f73]"/> : <BellOff size={12} className="shrink-0 text-[#087f73]"/>}
      <span>{enabled ? "Browser Notifications On" : "Enable Browser Notifications"}</span>
    </button>
    {message && <p className="max-w-[220px] px-1 pt-1 text-[8px] leading-3 text-[#687987]">{message}</p>}
  </div>;
}
