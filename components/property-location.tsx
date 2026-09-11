"use client";

import { useEffect, useRef } from "react";

declare global { interface Window { google?: any } }

type Props = { value: string; onChange: (value: string) => void; onPlace: (place: { address: string; city: string; locality: string; pincode: string; latitude: number | null; longitude: number | null; placeId: string | null }) => void };

export default function PropertyLocation({ value, onChange, onPlace }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key || !inputRef.current) return;
    const setup = () => {
      if (!window.google?.maps?.places || !inputRef.current) return;
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, { componentRestrictions: { country: "in" }, fields: ["formatted_address", "address_components", "geometry", "place_id"], types: ["address"] });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const components = place.address_components || [];
        const get = (types: string[]) => components.find((c: any) => types.some(t => c.types.includes(t)))?.long_name || "";
        const city = get(["locality", "administrative_area_level_2", "administrative_area_level_1"]);
        const locality = get(["sublocality_level_1", "sublocality", "neighborhood", "route"]);
        const pincode = get(["postal_code"]);
        const lat = place.geometry?.location?.lat?.() ?? null;
        const lng = place.geometry?.location?.lng?.() ?? null;
        onChange(place.formatted_address || "");
        onPlace({ address: place.formatted_address || "", city, locality, pincode, latitude: lat, longitude: lng, placeId: place.place_id || null });
      });
    };
    if (window.google?.maps?.places) setup();
    else {
      const existing = document.querySelector('script[data-unlivo-google-maps]');
      if (existing) { existing.addEventListener("load", setup); return () => existing.removeEventListener("load", setup); }
      const script = document.createElement("script"); script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`; script.async = true; script.defer = true; script.dataset.unlivoGoogleMaps = "true"; script.onload = setup; document.head.appendChild(script);
    }
  }, [onChange, onPlace]);
  return <div><input ref={inputRef} className="w-full rounded-xl border border-[#d7e3e8] bg-white px-4 py-3 text-sm text-[#102638] outline-none transition focus:border-[#0bb89b] focus:ring-2 focus:ring-[#0bb89b]/10" value={value} onChange={e => onChange(e.target.value)} placeholder="Start typing the property address…" autoComplete="off"/><p className="mt-2 text-xs text-[#7b8c97]">Select an address from the suggestions so UNLIVO can locate it accurately.</p></div>;
}