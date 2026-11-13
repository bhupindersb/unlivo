import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/reviewer/",
        "/broker/",
        "/my-properties/",
        "/my-requirements/",
        "/enquiries/",
        "/visits/",
        "/offers/",
        "/transactions/",
        "/profile/",
        "/login",
        "/signup",
        "/auth/",
      ],
    },
    sitemap: "https://www.unlivo.com/sitemap.xml",
    host: "https://www.unlivo.com",
  };
}
