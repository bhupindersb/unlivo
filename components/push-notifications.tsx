"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function PushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const available = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    setSupported(available);
    if (available) setPermission(Notification.permission);
  }, []);

  const enable = async () => {
    if (!supported || !supabase) return;
    setBusy(true);
    setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in first.");
      const next = await Notification.requestPermission();
      setPermission(next);
      if (next !== "granted") {
        setMessage("Browser notifications are not enabled.");
        return;
      }
      setMessage("Push notifications are enabled for this browser. The notification delivery service will be connected next.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return null;

  return <button onClick={permission === "granted" ? undefined : enable} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-[#cbdde3] bg-white px-4 py-2.5 text-sm font-bold text-[#123b53] disabled:opacity-50" title={permission === "granted" ? "Browser notifications enabled" : "Enable browser notifications"}>
    {permission === "granted" ? <Bell size={16}/> : <BellOff size={16}/>} {permission === "granted" ? "Notifications On" : busy ? "Enabling…" : "Enable Notifications"}
    {message && <span className="sr-only" aria-live="polite">{message}</span>}
  </button>;
}
