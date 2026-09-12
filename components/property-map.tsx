"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export default function PropertyMap({ latitude, longitude, label }: { latitude: number | null; longitude: number | null; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (latitude == null || longitude == null || !ref.current || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({ container: ref.current, style: "mapbox://styles/mapbox/streets-v12", center: [longitude, latitude], zoom: 15 });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    new mapboxgl.Marker().setLngLat([longitude, latitude]).setPopup(new mapboxgl.Popup({ offset: 25 }).setText(label)).addTo(map);
    return () => map.remove();
  }, [latitude, longitude, label, token]);

  if (latitude == null || longitude == null || !token) {
    return <div className="flex h-72 items-center justify-center rounded-2xl bg-[#eef4f6] text-center text-sm text-[#687987]"><div><p className="font-bold text-[#102638]">Map location</p><p className="mt-1">{!token ? "Mapbox will appear here once the map service is configured." : "Location coordinates are not available for this property."}</p></div></div>;
  }

  return <div ref={ref} className="h-72 w-full overflow-hidden rounded-2xl" aria-label={`Map showing ${label}`} />;
}
