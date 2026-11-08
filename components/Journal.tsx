"use client";

import Link from "next/link";
import { useState } from "react";
import type { PostSummary } from "@/lib/posts";
import { HandArrow } from "./HandArrow";

/** The homepage Blog section: latest posts with a topic filter. Full posts live at /blog/<slug>/. */
export function Journal({ posts }: { posts: PostSummary[] }) {
  const filters = ["All", ...Array.from(new Set(posts.map((p) => p.topic)))];
  const [filter, setFilter] = useState("All");
  const [openSlug, setOpenSlug] = useState<string | null>(posts[0]?.slug ?? null);

  const matches = (topic: string) => filter === "All" || topic === filter;
  const count = (f: string) => (f === "All" ? posts.length : posts.filter((p) => p.topic === f).length);

  function pick(f: string) {
    setFilter(f);
    // Close the open post if the new filter hides it.
    const open = posts.find((p) => p.slug === openSlug);
    if (open && f !== "All" && open.topic !== f) setOpenSlug(null);
  }

  return (
    <section id="journal" className="journal">
      <div className="container journal-inner">
        <div className="section-head journal-head">
          <div className="arrow-host">
            <h2 className="h2-md">Blog</h2>
            <HandArrow shape="short" className="section-arrow arrow-md" />
          </div>
          <div className="cats" role="group" aria-label="Filter posts by topic">
            {filters.map((f) => (
              <button key={f} type="button" className="cat" aria-pressed={filter === f} onClick={() => pick(f)}>
                {f} <span className="cat-count">{count(f)}</span>
              </button>
            ))}
          </div>
        </div>

        <ul className="tracklist">
          {posts.map((post) => {
            const open = openSlug === post.slug;
            const bodyId = `post-${post.slug}`;
            return (
              <li key={post.slug} className={`track${open ? " is-open" : ""}`} hidden={!matches(post.topic)}>
                <h3 className="track-h">
                  <button
                    type="button"
                    className="track-toggle"
                    aria-expanded={open}
                    aria-controls={bodyId}
                    onClick={() => setOpenSlug(open ? null : post.slug)}
                  >
                    <span className="track-meta">
                      <time dateTime={post.dateTime}>{post.date}</time>
                      <span className="track-cat">{post.topic}</span>
                    </span>
                    <span className="track-title">{post.title}</span>
                    <span className="track-len">{post.readTime}</span>
                    <span className="track-plus" aria-hidden="true">
                      +
                    </span>
                  </button>
                </h3>
                <div className="track-body" id={bodyId} inert={!open}>
                  <div className="track-body-inner">
                    <p>{post.summary}</p>
                    <Link href={`/blog/${post.slug}/`} className="track-link">
                      Read the post
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <Link href="/blog/" className="journal-all">
          See all posts
        </Link>
      </div>
    </section>
  );
}
