import type { MetadataRoute } from "next";

const baseUrl = "https://www.unlivo.com";

export default function sitemap(): MetadataRoute.Sitemap {
  // Keep the sitemap focused on useful public pages. Property and city landing
  // pages remain excluded until genuine public inventory is available.
  const routes = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/post-requirement", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/for-brokers", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.5, changeFrequency: "yearly" as const },
    { path: "/faqs", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/terms-of-service", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/privacy-policy", priority: 0.4, changeFrequency: "yearly" as const },
    { path: "/disclaimer", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
