"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Headlines from /news.json, which a job on the server refreshes every hour
 * (infra/news/fetch-news.py). The site itself is static, so the list is
 * loaded in the browser after the page opens.
 */

type Item = { title: string; link: string; source: string; published: string | null };
type Feed = { updated: string; sources: { name: string; ok: boolean }[]; items: Item[] };

const ALL = "All";
const PAGE = 20;

function ago(iso: string | null, now: number): string {
  if (!iso) return "";
  const mins = Math.round((now - Date.parse(iso)) / 60000);
  if (Number.isNaN(mins)) return "";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** Only ever link to http(s) pages, whatever the feed said. */
const isWebLink = (href: string) => /^https?:\/\//i.test(href);

export function NewsFeed() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState(ALL);
  const [shown, setShown] = useState(PAGE);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/news.json", { signal: controller.signal, cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: Feed) => {
        setFeed(data);
        setNow(Date.now());
      })
      .catch((e) => {
        if (e.name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, []);

  const items = useMemo(
    () => (feed?.items ?? []).filter((i) => isWebLink(i.link) && (filter === ALL || i.source === filter)),
    [feed, filter],
  );

  if (failed) {
    return <p className="news-status">The headlines couldn’t be loaded right now. Try again in a little while.</p>;
  }
  if (!feed) {
    return <p className="news-status" aria-live="polite">Loading headlines…</p>;
  }

  const sources = [ALL, ...feed.sources.map((s) => s.name).filter((n) => feed.items.some((i) => i.source === n))];
  const count = (name: string) => (name === ALL ? feed.items.length : feed.items.filter((i) => i.source === name).length);

  return (
    <>
      <div className="news-bar">
        <div className="cats" role="group" aria-label="Filter headlines by source">
          {sources.map((s) => (
            <button
              key={s}
              type="button"
              className="cat"
              aria-pressed={filter === s}
              onClick={() => {
                setFilter(s);
                setShown(PAGE);
              }}
            >
              {s} <span className="cat-count">{count(s)}</span>
            </button>
          ))}
        </div>
        <p className="news-updated">
          Updated <time dateTime={feed.updated}>{ago(feed.updated, now)}</time>
        </p>
      </div>

      <ul className="news-list">
        {items.slice(0, shown).map((item) => (
          <li key={item.link} className="news-item">
            <a href={item.link} className="news-link" rel="noopener noreferrer">
              {item.title}
            </a>
            <p className="news-meta">
              <span className="news-source">{item.source}</span>
              {item.published && <time dateTime={item.published}>{ago(item.published, now)}</time>}
            </p>
          </li>
        ))}
      </ul>

      {items.length > shown && (
        <button type="button" className="news-more" onClick={() => setShown((n) => n + PAGE)}>
          Show more
        </button>
      )}
    </>
  );
}
