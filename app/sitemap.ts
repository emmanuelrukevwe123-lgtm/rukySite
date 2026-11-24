import type { MetadataRoute } from "next";
import { site } from "@/lib/content";
import { getAllPosts } from "@/lib/posts";

// Written once at build time, as the static export requires.
export const dynamic = "force-static";

/** Lists every page for search engines: served at /sitemap.xml. */
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  return [
    { url: `${site.url}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/blog/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site.url}/news/`, changeFrequency: "hourly", priority: 0.5 },
    ...posts.map((post) => ({
      url: `${site.url}/blog/${post.slug}/`,
      lastModified: post.dateTime,
      priority: 0.6,
    })),
  ];
}
