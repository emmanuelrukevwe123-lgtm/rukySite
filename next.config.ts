import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build to plain HTML/CSS/JS in `out/` so any static server (Caddy on Oracle) can host it.
  output: "export",
  // The default image optimizer needs a Node server; a static export serves images as-is.
  images: { unoptimized: true },
  // Emit /blog/post/index.html, so plain static servers serve clean URLs without extra rules.
  trailingSlash: true,
};

export default nextConfig;
