import type { MetadataRoute } from "next";

const baseUrl = "https://www.unlivo.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/properties", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/post-requirement", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/for-brokers", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/locations/mohali", priority: 0.85, changeFrequency: "daily" as const },
    { path: "/locations/zirakpur", priority: 0.8, changeFrequency: "daily" as const },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
