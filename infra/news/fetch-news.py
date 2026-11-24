#!/usr/bin/env python3
"""
Fetch tech and security headlines from a few RSS/Atom feeds and write them to
one small JSON file that the site's /news/ page loads in the browser.

    python3 fetch-news.py /var/www/rukysite/news/news.json

Runs every hour from news-fetch.timer (see setup-news.sh). Only headlines,
links and dates are kept; articles stay on their own sites.

A feed that fails keeps its headlines from the previous run, so one site
being down never empties the page. Uses only Python's standard library.
"""

import email.utils
import html
import json
import os
import re
import sys
import tempfile
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

FEEDS = [
    ("AWS", "https://aws.amazon.com/about-aws/whats-new/recent/feed/"),
    ("Cloudflare", "https://blog.cloudflare.com/rss/"),
    ("Krebs on Security", "https://krebsonsecurity.com/feed/"),
    ("The Hacker News", "https://feeds.feedburner.com/TheHackersNews"),
    ("BleepingComputer", "https://www.bleepingcomputer.com/feed/"),
    ("CISA", "https://www.cisa.gov/cybersecurity-advisories/all.xml"),
]

PER_SOURCE = 8            # newest headlines kept from each feed
MAX_BYTES = 5 * 1024**2   # refuse feeds larger than 5 MB
TIMEOUT = 20              # seconds per feed
USER_AGENT = "rukysite-news/1.0 (+https://manuelruky.dev/news/)"
ATOM = "{http://www.w3.org/2005/Atom}"


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5",
    })
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        data = resp.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError("feed is larger than 5 MB")
    return data


def clean_title(text: str | None) -> str:
    """Plain text only: no tags, entities decoded, whitespace squeezed, length capped."""
    text = html.unescape(re.sub(r"<[^>]+>", " ", text or ""))
    text = re.sub(r"\s+", " ", text).strip()
    return text[:200]


def safe_link(link: str | None) -> str | None:
    link = (link or "").strip()
    return link if re.match(r"^https?://", link) else None


def parse_date(text: str | None) -> str | None:
    """RSS uses RFC 822 dates, Atom uses ISO 8601. Return ISO 8601 in UTC."""
    if not text:
        return None
    text = text.strip()
    try:
        dt = email.utils.parsedate_to_datetime(text)
    except (TypeError, ValueError):
        try:
            dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds")


def parse(data: bytes, source: str) -> list[dict]:
    # ElementTree does not fetch external entities, and the expat parser
    # bundled with Python limits entity expansion ("billion laughs").
    root = ET.fromstring(data)
    items = []
    if root.tag == "rss" or root.find("channel") is not None:
        for it in root.iter("item"):
            items.append({
                "title": clean_title(it.findtext("title")),
                "link": safe_link(it.findtext("link")),
                "published": parse_date(it.findtext("pubDate") or it.findtext("{http://purl.org/dc/elements/1.1/}date")),
            })
    elif root.tag == f"{ATOM}feed":
        for entry in root.iter(f"{ATOM}entry"):
            link = None
            for el in entry.findall(f"{ATOM}link"):
                if el.get("rel", "alternate") == "alternate":
                    link = el.get("href")
                    break
            items.append({
                "title": clean_title(entry.findtext(f"{ATOM}title")),
                "link": safe_link(link),
                "published": parse_date(entry.findtext(f"{ATOM}published") or entry.findtext(f"{ATOM}updated")),
            })
    else:
        raise ValueError(f"not an RSS or Atom feed (root element {root.tag})")

    good = [dict(i, source=source) for i in items if i["title"] and i["link"]]
    good.sort(key=lambda i: i["published"] or "", reverse=True)
    return good[:PER_SOURCE]


def load_previous(path: str) -> dict[str, list[dict]]:
    try:
        with open(path, encoding="utf-8") as f:
            old = json.load(f)
    except (OSError, ValueError):
        return {}
    by_source: dict[str, list[dict]] = {}
    for item in old.get("items", []):
        by_source.setdefault(item.get("source", ""), []).append(item)
    return by_source


def write_atomically(path: str, payload: dict) -> None:
    """Write to a temporary file, then rename: readers never see half a file."""
    directory = os.path.dirname(os.path.abspath(path))
    fd, tmp = tempfile.mkstemp(dir=directory, prefix=".news-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        os.chmod(tmp, 0o644)
        os.replace(tmp, path)
    except BaseException:
        os.unlink(tmp)
        raise


def main() -> int:
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <output.json>", file=sys.stderr)
        return 2
    out = sys.argv[1]
    previous = load_previous(out)

    items: list[dict] = []
    sources = []
    for name, url in FEEDS:
        try:
            got = parse(fetch(url), name)
            if not got:
                raise ValueError("no usable headlines")
            items += got
            sources.append({"name": name, "ok": True})
            print(f"{name}: {len(got)} headlines")
        except Exception as e:  # one bad feed must not stop the others
            kept = previous.get(name, [])
            items += kept
            sources.append({"name": name, "ok": False})
            print(f"{name}: failed ({e}); kept {len(kept)} from the last run", file=sys.stderr)

    if not items:
        print("No headlines at all; leaving the existing file alone.", file=sys.stderr)
        return 1

    items.sort(key=lambda i: i.get("published") or "", reverse=True)
    write_atomically(out, {
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sources": sources,
        "items": items,
    })
    print(f"Wrote {len(items)} headlines to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
