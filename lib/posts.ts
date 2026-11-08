import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Marked, type Tokens } from "marked";

/**
 * Blog posts live in content/posts/*.md, each with a small frontmatter block:
 *
 *   ---
 *   title: …
 *   date: Nov 3, 2026          (shown to readers)
 *   dateTime: 2026-11-03       (for sorting and <time>)
 *   topic: Cloud
 *   summary: One or two sentences for lists and previews.
 *   source: https://github.com/…/original.md   (optional: where the write-up first lived)
 *   ---
 *
 * Everything is read at build time; the site ships as plain HTML.
 */

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const WORDS_PER_MINUTE = 200;

export type PostSummary = {
  slug: string;
  title: string;
  date: string;
  dateTime: string;
  topic: string;
  summary: string;
  readTime: string;
  source?: string;
  /** First image in the post, used as a thumbnail in lists. */
  cover?: string;
};

export type Post = PostSummary & { html: string };

type Raw = { slug: string; meta: Record<string, string>; body: string };

function readRaw(): Raw[] {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const text = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
      const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
      const meta: Record<string, string> = {};
      if (match) {
        for (const line of match[1].split("\n")) {
          const i = line.indexOf(":");
          if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
        }
      }
      return { slug: file.replace(/\.md$/, ""), meta, body: match ? text.slice(match[0].length) : text };
    });
}

function readTime(body: string): string {
  const prose = body.replace(/```[\s\S]*?```/g, " ");
  const words = prose.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))} min`;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function toSummary(r: Raw): PostSummary {
  const cover = /!\[[^\]]*\]\((\/[^)\s]+)\)/.exec(r.body)?.[1];
  return {
    slug: r.slug,
    title: r.meta.title ?? r.slug,
    date: r.meta.date ?? "",
    dateTime: r.meta.dateTime ?? "",
    topic: r.meta.topic ?? "Notes",
    summary: r.meta.summary ?? "",
    readTime: readTime(r.body),
    source: r.meta.source,
    cover,
  };
}

/** Newest first. Posts from the same day fall back to the original file name (later case numbers first). */
function sortPosts(a: Raw, b: Raw) {
  const byDate = (b.meta.dateTime ?? "").localeCompare(a.meta.dateTime ?? "");
  return byDate || (b.meta.source ?? b.slug).localeCompare(a.meta.source ?? a.slug);
}

export function getAllPosts(): PostSummary[] {
  return readRaw().sort(sortPosts).map(toSummary);
}

/** Renders markdown to HTML, rewriting links so they keep working on this site. */
function render(r: Raw, all: Raw[]): string {
  // Links to another write-up (by its original file name) go to that post's page here.
  const bySourceFile = new Map(
    all.filter((p) => p.meta.source).map((p) => [path.basename(new URL(p.meta.source).pathname), p.slug]),
  );

  const resolve = (href: string): { href: string; external: boolean } => {
    if (/^(https?:|mailto:|#|\/)/.test(href)) return { href, external: /^https?:/.test(href) };
    const file = path.basename(href.split("#")[0]);
    const slug = bySourceFile.get(file);
    if (slug) return { href: `/blog/${slug}/`, external: false };
    // Anything else relative (evidence screenshots, other docs) points at the original repo.
    if (r.meta.source) return { href: new URL(href, r.meta.source).href, external: true };
    return { href, external: false };
  };

  const md = new Marked({
    gfm: true,
    renderer: {
      // Raw HTML in a post is shown as text, never executed.
      html({ text }: Tokens.HTML | Tokens.Tag) {
        return escapeHtml(text);
      },
      link({ href, title, tokens }: Tokens.Link) {
        const { href: url, external } = resolve(href);
        const label = this.parser.parseInline(tokens);
        const t = title ? ` title="${escapeHtml(title)}"` : "";
        const rel = external ? ` rel="noopener noreferrer"` : "";
        return `<a href="${escapeHtml(url)}"${t}${rel}>${label}</a>`;
      },
      image({ href, text }: Tokens.Image) {
        const { href: url } = resolve(href);
        return `<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(text)}" loading="lazy" decoding="async">${
          text ? `<figcaption>${escapeHtml(text)}</figcaption>` : ""
        }</figure>`;
      },
      code({ text, lang }: Tokens.Code) {
        if (lang === "mermaid") return `<pre class="mermaid">${escapeHtml(text)}</pre>`;
        const cls = lang ? ` class="language-${escapeHtml(lang)}"` : "";
        return `<pre><code${cls}>${escapeHtml(text)}</code></pre>`;
      },
    },
  });

  // Keep "**Label:** value" lines (What / Why / Date / Outcome …) on their own lines.
  const body = r.body.replace(/([^\n])\n(?=\*\*[^*\n]{1,40}:\*\*)/g, "$1  \n");
  const html = md.parse(body, { async: false });
  // Wide tables scroll sideways on small screens instead of breaking the layout.
  return html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
}

export function getPost(slug: string): Post | undefined {
  const all = readRaw();
  const raw = all.find((p) => p.slug === slug);
  if (!raw) return undefined;
  return { ...toSummary(raw), html: render(raw, all) };
}
