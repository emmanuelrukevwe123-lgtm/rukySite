import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mermaid } from "@/components/Mermaid";
import { ReadingProgress } from "@/components/ReadingProgress";
import { site } from "@/lib/content";
import { getAllPosts, getPost } from "@/lib/posts";

// Only the posts in content/posts exist; any other address is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} — ${site.fullName}`,
    description: post.summary,
    openGraph: { type: "article", title: post.title, description: post.summary, publishedTime: post.dateTime },
  };
}

const initials = site.fullName
  .split(" ")
  .map((w) => w[0])
  .join("");

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const all = getAllPosts();
  const i = all.findIndex((p) => p.slug === slug);
  const newer = all[i - 1];
  const older = all[i + 1];

  return (
    <main className="article-page">
      <ReadingProgress />
      <article className="article">
        <header className="article-head">
          <Link href="/blog/" className="article-back">
            ← All posts
          </Link>
          <p className="article-topic">{post.topic}</p>
          <h1>{post.title}</h1>
          <p className="article-summary">{post.summary}</p>
          <div className="byline">
            <span className="avatar" aria-hidden="true">
              {initials}
            </span>
            <div>
              <p className="byline-name">{site.fullName}</p>
              <p className="byline-meta">
                <time dateTime={post.dateTime}>{post.date}</time>
                <span>{post.readTime} read</span>
              </p>
            </div>
          </div>
        </header>

        <div className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />

        <footer className="article-foot">
          {post.source && (
            <p className="article-source">
              This write-up first lived in my lab notes, where the full evidence screenshots are.{" "}
              <a href={post.source} rel="noopener noreferrer">
                View the original on GitHub
              </a>
            </p>
          )}
          <nav className="article-pager" aria-label="More posts">
            {older ? (
              <Link href={`/blog/${older.slug}/`} className="pager-card">
                <span className="pager-card-label">Older</span>
                <span className="pager-card-title">{older.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {newer && (
              <Link href={`/blog/${newer.slug}/`} className="pager-card is-newer">
                <span className="pager-card-label">Newer</span>
                <span className="pager-card-title">{newer.title}</span>
              </Link>
            )}
          </nav>
        </footer>
      </article>
      <Mermaid />
    </main>
  );
}
