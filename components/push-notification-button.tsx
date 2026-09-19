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

    const checkSubscription = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
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
  }, []);

  if (!supported || permission === "denied") return null;

  const enableNotifications = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
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

  const sendTestNotification = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (Notification.permission !== "granted") {
        throw new Error("Please enable browser notifications first.");
      }

      const registration = await navigator.serviceWorker.register("/push-sw.js");
      await registration.update();
      await navigator.serviceWorker.ready;

      if (!registration.active) {
        throw new Error("UNLIVO notification service worker is not active yet. Please refresh the page and try again.");
      }

      const result = await new Promise<{ ok: boolean; stage?: string; error?: string; version?: string }>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          navigator.serviceWorker.removeEventListener("message", onMessage);
          reject(new Error("The UNLIVO service worker did not respond within 5 seconds. Please refresh the page and try again."));
        }, 5000);

        const onMessage = (event: MessageEvent) => {
          if (event.data?.type !== "UNLIVO_TEST_NOTIFICATION_RESULT") return;
          window.clearTimeout(timeout);
          navigator.serviceWorker.removeEventListener("message", onMessage);
          resolve(event.data);
        };

        navigator.serviceWorker.addEventListener("message", onMessage);
        registration.active?.postMessage({ type: "UNLIVO_TEST_NOTIFICATION" });
      });

      if (!result?.ok) {
        throw new Error(`Service worker notification failed${result?.stage ? ` at ${result.stage}` : ""}: ${result?.error || "Unknown error"}`);
      }

      setMessage(`Service worker v${result.version || "unknown"} successfully created the notification. If you still cannot see it, we will check Chrome/macOS notification settings next.`);
    } catch (error) {
      console.error("UNLIVO test notification failed", error);
      setMessage(error instanceof Error ? error.message : "Test notification failed.");
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

  return <div className="border-t border-[#e8eef1] px-3 py-3">
    <button onClick={enabled ? disableNotifications : enableNotifications} disabled={busy} className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#193246] transition hover:bg-[#f1f8f7] hover:text-[#087f73] disabled:cursor-wait disabled:opacity-60">
      {busy ? <Loader2 size={17} className="shrink-0 animate-spin text-[#087f73]"/> : enabled ? <Bell size={17} className="shrink-0 text-[#087f73]"/> : <BellOff size={17} className="shrink-0 text-[#087f73]"/>}
      <span>{enabled ? "Browser Notifications On" : "Enable Browser Notifications"}</span>
    </button>
    {enabled && <button onClick={sendTestNotification} disabled={busy} className="mt-1 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#193246] transition hover:bg-[#f1f8f7] hover:text-[#087f73] disabled:cursor-wait disabled:opacity-60">
      {busy ? <Loader2 size={17} className="shrink-0 animate-spin text-[#087f73]"/> : <Bell size={17} className="shrink-0 text-[#087f73]"/>}
      <span>Send Test Notification</span>
    </button>}
    {message && <p className="px-3 pt-1 text-[10px] leading-4 text-[#687987]">{message}</p>}
  </div>;
}
