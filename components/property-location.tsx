"use client";

import { useEffect, useRef, useState } from "react";

type Place = {
  address: string;
  city: string;
  locality: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
};

type ContextItem = {
  id?: string;
  name?: string;
};

type Suggestion = {
  id: string;
  place_name?: string;
  text?: string;
  properties?: {
    full_address?: string;
    name?: string;
    context?: Record<string, ContextItem>;
  };
  center?: [number, number];
  geometry?: { coordinates?: [number, number] };
};

type Props = { value: string; onChange: (value: string) => void; onPlace: (place: Place) => void };

function contextValue(feature: Suggestion, keys: string[]) {
  const context = feature.properties?.context;
  if (!context) return "";
  for (const key of keys) {
    if (context[key]?.name) return context[key].name as string;
  }
  return "";
}

export default function PropertyLocation({ value, onChange, onPlace }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef(onChange);
  const placeRef = useRef(onPlace);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    changeRef.current = onChange;
    placeRef.current = onPlace;
  }, [onChange, onPlace]);

  useEffect(() => {
    if (!token) return;
    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: query,
          country: "in",
          language: "en",
          limit: "5",
          autocomplete: "true",
          access_token: token,
        });
        const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Location search failed");
        const data = await response.json();
        setSuggestions(data.features || []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value, token]);

  function selectSuggestion(feature: Suggestion) {
    const coordinates = feature.geometry?.coordinates || feature.center || [];
    const longitude = typeof coordinates[0] === "number" ? coordinates[0] : null;
    const latitude = typeof coordinates[1] === "number" ? coordinates[1] : null;
    const address = feature.properties?.full_address || feature.place_name || feature.text || "";

    // Mapbox Geocoding v6 stores the administrative hierarchy under properties.context.
    // Prefer the city-level place, then district; use locality/neighborhood for the
    // sub-city field and postcode for the pincode.
    const city = contextValue(feature, ["place", "district"]);
    const locality = contextValue(feature, ["locality", "neighborhood", "district"]);
    const pincode = contextValue(feature, ["postcode"]);

    changeRef.current(address);
    placeRef.current({ address, city, locality, pincode, latitude, longitude, placeId: feature.id || null });
    setSuggestions([]);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className="w-full rounded-xl border border-[#d7e3e8] bg-white px-4 py-3 text-sm text-[#102638] outline-none transition focus:border-[#0bb89b] focus:ring-2 focus:ring-[#0bb89b]/10"
        value={value}
        onChange={(event) => changeRef.current(event.target.value)}
        placeholder="Start typing the property address…"
        autoComplete="off"
        aria-autocomplete="list"
      />
      {token && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-[#d7e3e8] bg-white shadow-lg">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(suggestion)}
              className="block w-full cursor-pointer px-4 py-3 text-left text-sm text-[#102638] hover:bg-[#f1fbf8]"
            >
              <span className="block font-semibold">{suggestion.text || suggestion.properties?.name || suggestion.place_name}</span>
              <span className="mt-0.5 block text-xs text-[#687987]">{suggestion.properties?.full_address || suggestion.place_name}</span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-[#7b8c97]">
        {loading ? "Finding matching addresses…" : "Select an address from the suggestions so UNLIVO can locate it accurately."}
      </p>
    </div>
  );
}
