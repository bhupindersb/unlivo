import type { MetadataRoute } from "next";

const baseUrl = "https://www.unlivo.com";

export default function sitemap(): MetadataRoute.Sitemap {
  // Keep the initial sitemap focused on useful public pages.
  // Property and city landing pages are added back when genuine inventory is live.
  const routes = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/post-requirement", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/for-brokers", priority: 0.7, changeFrequency: "monthly" as const },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
