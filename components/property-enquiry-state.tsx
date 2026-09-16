"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function PropertyEnquiryState() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname?.startsWith("/properties/")) return;

    const propertyId = pathname.split("/").filter(Boolean)[1];
    if (!propertyId || !supabase) return;

    let cancelled = false;
    let observer: MutationObserver | null = null;

    const applyState = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: enquiry } = await supabase
        .from("enquiries")
        .select("id,status")
        .eq("property_id", propertyId)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!enquiry || cancelled) return;

      const updateButton = () => {
        if (cancelled) return true;

        const buttons = Array.from(document.querySelectorAll("button"));
        const enquireButton = buttons.find((button) =>
          button.textContent?.includes("Enquire about this property"),
        ) as HTMLButtonElement | undefined;

        if (!enquireButton) return false;

        enquireButton.textContent = "Enquiry Sent";
        enquireButton.disabled = true;
        enquireButton.setAttribute("aria-disabled", "true");
        enquireButton.classList.add("opacity-60", "cursor-not-allowed");

        if (!document.querySelector("[data-unlivo-enquiry-status]")) {
          const statusLink = document.createElement("a");
          statusLink.href = "/enquiries";
          statusLink.dataset.unlivoEnquiryStatus = "true";
          statusLink.className = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#0bb89b] bg-[#f1fbf8] px-5 py-3.5 text-sm font-bold text-[#087f73] hover:bg-[#e9faf6]";
          statusLink.textContent = "Check Enquiry Status";
          enquireButton.parentElement?.appendChild(statusLink);
        }

        return true;
      };

      if (updateButton()) return;

      observer = new MutationObserver(() => {
        if (updateButton() && observer) {
          observer.disconnect();
          observer = null;
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    };

    void applyState();

    return () => {
      cancelled = true;
      observer?.disconnect();
      observer = null;
    };
  }, [pathname]);

  return null;
}
