"use client";

import { useEffect, useRef } from "react";

declare global { interface Window { google?: any } }

export default function PropertyMap({ latitude, longitude, label }: { latitude: number | null; longitude: number | null; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (latitude == null || longitude == null || !ref.current) return;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const render = () => { if (!window.google?.maps || !ref.current) return; const map = new window.google.maps.Map(ref.current, { center: { lat: latitude, lng: longitude }, zoom: 15, mapTypeControl: false, streetViewControl: false, fullscreenControl: true }); new window.google.maps.Marker({ position: { lat: latitude, lng: longitude }, map, title: label }); };
    if (!key) return;
    if (window.google?.maps) render(); else { const script = document.querySelector('script[data-unlivo-google-maps]'); if (script) script.addEventListener("load", render); else { const s = document.createElement("script"); s.src = `https://maps.googleapis.com/maps/api/js?key=${key}`; s.async = true; s.defer = true; s.dataset.unlivoGoogleMaps = "true"; s.onload = render; document.head.appendChild(s); } }
  }, [latitude, longitude, label]);
  if (latitude == null || longitude == null || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return <div className="flex h-72 items-center justify-center rounded-2xl bg-[#eef4f6] text-center text-sm text-[#687987]"><div><p className="font-bold text-[#102638]">Map location</p><p className="mt-1">Location coordinates will appear here after Google Maps is configured.</p></div></div>;
  return <div ref={ref} className="h-72 w-full rounded-2xl overflow-hidden" aria-label={`Map showing ${label}`} />;
}