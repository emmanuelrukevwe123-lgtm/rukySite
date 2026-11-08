# rukySite

Personal site of Manuel‑Ruky. Built with Next.js (App Router) and TypeScript, exported as a static site.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
```

Checks:

```bash
npm run typecheck
npm run lint
```

## Edit content

Projects, journal notes, photos, social links and the email address all live in [`lib/content.ts`](lib/content.ts).

To add a photo, put the file in `public/images/` and reference it from `content.ts`:

```ts
{ src: "/images/harbour.jpg", alt: "Boats in the harbour at dusk", caption: "Harbour, 2026" }
```

## Write a blog post

Add a markdown file to `content/posts/`. The file name becomes the address: `content/posts/my-post.md` is published at `/blog/my-post/`.

```markdown
---
title: My post title
date: Nov 10, 2026
dateTime: 2026-11-10
topic: Cloud
summary: One or two sentences, shown in lists and under the title.
source: https://github.com/…/original.md
---

The post, in normal markdown: headings, lists, tables, code blocks, images and ```mermaid diagrams.
```

- `source` is optional. Relative links in the post (evidence screenshots, other docs) resolve against it, and links to another post's original file point to that post on this site.
- Put images in `public/blog/<post-name>/` and reference them as `/blog/<post-name>/image.png`. The first image becomes the post's thumbnail.
- Reading time is worked out from the word count. Raw HTML in a post is shown as text, never run.

## Build and deploy

```bash
npm run build      # writes the static site to out/
```

`out/` is plain HTML, CSS and JS. Serve it with any static web server, for example Caddy:

```caddyfile
yourdomain.me {
	root * /var/www/rukySite/out
	file_server
}
```

To preview the build locally: `python3 -m http.server 4173 --directory out`, then open http://localhost:4173.

## Structure

```
app/          layout (fonts, metadata, theme script, nav, footer), home page, blog pages, styles
content/      blog posts (markdown)
components/   one file per section, plus the player, theme toggle and photo frame
lib/          site content, post loader, the Web Audio sound engine, theme and media-query helpers
public/       static files (images)
```
