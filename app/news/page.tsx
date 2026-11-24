import type { Metadata } from "next";
import { NewsFeed } from "@/components/NewsFeed";
import { site } from "@/lib/content";

const description =
  "Cloud and security headlines from AWS, Cloudflare, CISA and security news sites, refreshed every hour.";

export const metadata: Metadata = {
  title: `Tech news — ${site.fullName}`,
  description,
  alternates: { canonical: "/news/" },
};

export default function NewsPage() {
  return (
    <main className="blog-index">
      <div className="container blog-index-inner">
        <header className="blog-index-head">
          <h1>Tech news</h1>
          <p>
            {description} Each headline links to the original article. My server collects them;
            I don’t write or edit them.
          </p>
        </header>
        <NewsFeed />
      </div>
    </main>
  );
}
