import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/posts";
import { site } from "@/lib/content";

export const metadata: Metadata = {
  title: `Blog — ${site.fullName}`,
  description: "Write-ups from my security and cloud labs: what I built, what broke, and how I found out.",
};

export default function BlogIndex() {
  const posts = getAllPosts();
  return (
    <main className="blog-index">
      <div className="container blog-index-inner">
        <header className="blog-index-head">
          <h1>Blog</h1>
          <p>Write-ups from my security and cloud labs: what I built, what broke, and how I found out.</p>
        </header>

        <ul className="post-list">
          {posts.map((p) => (
            <li key={p.slug} className={`post-card${p.cover ? " has-cover" : ""}`}>
              <div className="post-card-text">
                <p className="post-card-topic">{p.topic}</p>
                <h2>
                  <Link href={`/blog/${p.slug}/`} className="post-card-link">
                    {p.title}
                  </Link>
                </h2>
                <p className="post-card-summary">{p.summary}</p>
                <p className="post-card-meta">
                  <time dateTime={p.dateTime}>{p.date}</time>
                  <span>{p.readTime} read</span>
                </p>
              </div>
              {p.cover && (
                // eslint-disable-next-line @next/next/no-img-element -- static export; served as-is
                <img className="post-card-cover" src={p.cover} alt="" loading="lazy" decoding="async" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
