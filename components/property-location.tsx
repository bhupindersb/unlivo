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

type ContextItem = { id?: string; name?: string };

type Suggestion = {
  id: string;
  place_name?: string;
  text?: string;
  properties?: {
    mapbox_id?: string;
    full_address?: string;
    place_formatted?: string;
    name?: string;
    name_preferred?: string;
    feature_type?: string;
    context?: Record<string, ContextItem>;
  };
  center?: [number, number];
  geometry?: { coordinates?: [number, number] };
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onPlace: (place: Place) => void;
};

function contextValue(feature: Suggestion, keys: string[]) {
  const context = feature.properties?.context;
  if (!context) return "";
  for (const key of keys) {
    const value = context[key]?.name;
    if (value) return value;
  }
  return "";
}

export default function PropertyLocation({ value, onChange, onPlace }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const changeRef = useRef(onChange);
  const placeRef = useRef(onPlace);
  const selectedValueRef = useRef("");
  const requestIdRef = useRef(0);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    changeRef.current = onChange;
    placeRef.current = onPlace;
  }, [onChange, onPlace]);

  useEffect(() => {
    const query = value.trim();

    // Selecting a suggestion updates the controlled input. Do not search again
    // for that exact selected value; this previously reopened the dropdown.
    if (query && query === selectedValueRef.current) {
      setSuggestions([]);
      setLoading(false);
      setSearchError("");
      return;
    }

    if (!token || query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      setSearchError("");
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: query,
          country: "in",
          worldview: "in",
          language: "en",
          limit: "6",
          types: "address,street,neighborhood,locality,place,district,postcode",
          autocomplete: "true",
          access_token: token,
        });

        const response = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`,
          { signal: controller.signal }
        );
        const data = await response.json();
        if (!response.ok) {
          const message = typeof data?.message === "string" ? data.message : "Mapbox could not complete the address search.";
          throw new Error(message);
        }
        if (requestId === requestIdRef.current) {
          setSuggestions(Array.isArray(data.features) ? data.features : []);
          setSearchError("");
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError" && requestId === requestIdRef.current) {
          setSuggestions([]);
          setSearchError((error as Error).message || "Unable to search addresses right now.");
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value, token]);

  function selectSuggestion(feature: Suggestion) {
    const coordinates = feature.geometry?.coordinates || feature.center || [];
    const longitude = typeof coordinates[0] === "number" ? coordinates[0] : null;
    const latitude = typeof coordinates[1] === "number" ? coordinates[1] : null;
    const address =
      feature.properties?.full_address ||
      feature.place_name ||
      feature.text ||
      feature.properties?.name ||
      "";

    const city = contextValue(feature, ["place", "district", "region"]);
    const locality = contextValue(feature, ["locality", "neighborhood", "district"]);
    const pincode = contextValue(feature, ["postcode"]);

    selectedValueRef.current = address.trim();
    setSuggestions([]);
    setLoading(false);
    changeRef.current(address);
    placeRef.current({
      address,
      city,
      locality,
      pincode,
      latitude,
      longitude,
      placeId: feature.properties?.mapbox_id || feature.id || null,
    });
  }

  return (
    <div className="relative">
      <input
        className="w-full rounded-xl border border-[#d7e3e8] bg-white px-4 py-3 text-sm text-[#102638] outline-none transition focus:border-[#0bb89b] focus:ring-2 focus:ring-[#0bb89b]/10"
        value={value}
        onChange={(event) => {
          selectedValueRef.current = "";
          setSuggestions([]);
          changeRef.current(event.target.value);
        }}
        placeholder="Start typing the property address…"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={suggestions.length > 0}
        role="combobox"
      />

      {token && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-[#d7e3e8] bg-white shadow-lg"
          role="listbox"
        >
          {suggestions.map((suggestion) => {
            const title =
              suggestion.properties?.name_preferred ||
              suggestion.properties?.name ||
              suggestion.text ||
              suggestion.place_name ||
              "Address";
            const detail =
              suggestion.properties?.full_address ||
              suggestion.place_name ||
              suggestion.properties?.place_formatted ||
              "";
            return (
              <button
                key={suggestion.id}
                type="button"
                role="option"
                aria-selected="false"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                className="block w-full cursor-pointer border-b border-[#edf2f4] px-4 py-3 text-left text-sm text-[#102638] last:border-0 hover:bg-[#f1fbf8]"
              >
                <span className="block font-semibold">{title}</span>
                {detail && (
                  <span className="mt-0.5 block text-xs leading-5 text-[#687987]">
                    {detail}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-2 text-xs text-[#7b8c97]">
        {loading
          ? "Finding matching addresses in India…"
          : searchError
            ? searchError
            : !token
            ? "Address suggestions are currently unavailable. You can still enter the address and location details manually."
            : "Choose the closest matching address. You can add your apartment/house number and floor separately below."}
      </p>
    </div>
  );
}
