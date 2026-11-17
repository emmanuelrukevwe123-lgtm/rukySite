import type { MetadataRoute } from "next";
import { site } from "@/lib/content";

// Written once at build time, as the static export requires.
export const dynamic = "force-static";

/** Tells search engines they may read everything and where the sitemap is: served at /robots.txt. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
