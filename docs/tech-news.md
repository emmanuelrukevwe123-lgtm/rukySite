# The Tech news page: what was built and why

The site now has a **Tech news** page at `/news/`, linked as **News** in the menu. It shows the latest cloud and security headlines from six sources and refreshes them every hour, without redeploying the site.

## The problem it had to solve

The site is **static**. `npm run build` turns it into plain HTML files, `deploy.sh` uploads them, and Caddy serves them. Nothing on the server runs code when someone visits. That makes the site fast, cheap and hard to attack, but anything written into a page at build time stays frozen until the next deploy. Headlines baked in on Monday would still be Monday's headlines on Friday.

The fix is to split the job in two:

1. **The server collects the news** on a schedule and saves it to one small data file.
2. **The page loads that file in the visitor's browser** each time it opens.

The page itself never changes. Only the data file does.

## How it fits together

```
 every hour                         every visit
 ──────────                         ───────────
 systemd timer                      visitor opens /news/
      │                                   │
      ▼                                   ▼
 fetch-news.py  ──reads──▶  6 RSS feeds   browser runs NewsFeed.tsx
      │                                   │
      ▼                                   ▼
 /var/www/rukysite/news/news.json  ◀── fetch("/news.json") through Caddy
```

## The pieces

| File | Where it runs | What it does |
| --- | --- | --- |
| [`infra/news/fetch-news.py`](../infra/news/fetch-news.py) | Main VM, hourly | Downloads the six feeds, keeps the newest 8 headlines from each (title, link, date, source) and writes `news.json` |
| [`infra/news/setup-news.sh`](../infra/news/setup-news.sh) | Main VM, once | Creates the `news` user, installs the fetcher, adds the systemd service and timer, adds `/news.json` to Caddy, runs the first fetch |
| [`infra/caddy/Caddyfile`](../infra/caddy/Caddyfile) | Main VM | The `handle /news.json` block maps that address to the news folder |
| [`app/news/page.tsx`](../app/news/page.tsx) | Built on your laptop | The page: heading and introduction |
| [`components/NewsFeed.tsx`](../components/NewsFeed.tsx) | Visitor's browser | Loads `/news.json`, shows the source filter, the headlines and "Show more" |
| `lib/content.ts`, `components/Nav.tsx`, `app/sitemap.ts`, `app/globals.css` | Built | Menu link, menu highlighting, sitemap entry, styles |

## The sources

| Source | What it covers |
| --- | --- |
| AWS What's New | New AWS services and features |
| Cloudflare Blog | Networking, security and how the internet works |
| Krebs on Security | Investigative security journalism |
| The Hacker News | Daily security news |
| BleepingComputer | Breaches, malware and vulnerabilities |
| CISA advisories | US government security alerts about actively exploited flaws |

To add or remove one, edit the `FEEDS` list at the top of `fetch-news.py`, copy `infra/news` to the server and run `setup-news.sh` again.

## The concepts behind it

### RSS and Atom
Most news sites publish a **feed**: a machine-readable list of their latest articles at a fixed address. **RSS** and **Atom** are the two standard formats, both written in XML. The fetcher understands both. A feed gives a title, a link and a date for each article, which is exactly what the page needs. Only headlines and links are shown; the articles stay on their own sites.

### A systemd timer instead of cron
A **timer** is systemd's way of running something on a schedule. `news-fetch.timer` starts `news-fetch.service` every hour. Compared with cron it adds:
- `Persistent=true`: if the server was off at the scheduled time, it runs as soon as it's back.
- `RandomizedDelaySec=5min`: it runs at a slightly different minute each time, so the feeds don't all see a request exactly on the hour.
- Its output goes to the journal: `journalctl -u news-fetch.service`.

The service is `Type=oneshot`: it runs, finishes and exits. Nothing stays running between fetches.

### Least privilege: the `news` user and the sandbox
The fetcher reads data from six other websites, so it treats that data as untrusted. It runs as its own **system user**, `news`, which has no password, no shell and no home folder, and owns only `/var/www/rukysite/news`.

systemd then locks the service down further:

| Setting | Effect |
| --- | --- |
| `ProtectSystem=strict` | The whole filesystem is read-only to it... |
| `ReadWritePaths=/var/www/rukysite/news` | ...except the news folder |
| `ProtectHome=yes` | Home folders are invisible |
| `NoNewPrivileges=yes` | It can never gain more rights, for example through `sudo` |
| `PrivateTmp=yes`, `PrivateDevices=yes` | Its own empty `/tmp`, no hardware devices |
| `RestrictAddressFamilies=AF_INET AF_INET6` | Ordinary internet connections only |
| `MemoryMax=150M` | It can't use more than 150 MB, even if a feed is enormous |
| `CapabilityBoundingSet=` (empty) | No special Linux powers at all, even ones root would normally have |
| `SystemCallFilter=@system-service` | Only the system calls an ordinary program needs; anything else kills it |
| `PrivateUsers=yes`, `ProtectProc=invisible` | It can't see other users or other processes |
| `MemoryDenyWriteExecute=yes` | Memory can't be both written and run, which blocks a common exploit trick |

If a malicious feed ever found a bug in the fetcher, the worst it could do is write a bad headlines file.

`systemd-analyze security news-fetch.service` scores how exposed a service is, from 0 (locked down) to 10. The first version scored **5.8 MEDIUM**; adding the last four rows above brought it to **1.1 OK**. For comparison, most services that ship with Ubuntu score between 6 and 9.6.

### Treating feed data as untrusted
- **Size limit:** feeds over 5 MB are refused.
- **Plain text only:** HTML tags are stripped from titles, and titles are capped at 200 characters.
- **Links:** only `http://` and `https://` links are kept, both by the fetcher and again in the browser. A `javascript:` link could run code on your site.
- **XML:** Python's XML parser doesn't fetch external files named in the XML and limits "entity expansion", which blocks the classic XML bombs.
- **Display:** React writes titles as text, never as HTML, so even a title containing `<script>` just shows those characters.
- **Links out** use `rel="noopener noreferrer"`, so the other site can't control your tab and isn't told which page sent the visitor.

### Atomic writes
The fetcher writes to a temporary file in the same folder, then **renames** it to `news.json`. A rename within one filesystem happens all at once, so a visitor never downloads half a file. It's the same idea as `deploy.sh` switching the `current` symlink.

### Failing gracefully
If one feed is down or blocks the request, its headlines from the previous hour are kept and the other five still update. If every feed fails, the old file is left alone. On the page, a source with no headlines just doesn't get a filter button. If `news.json` can't be loaded at all, the page says so instead of breaking.

### Why the news lives outside the site folder
Each deploy uploads a new release folder and points `current` at it. If `news.json` lived inside `current`, every deploy would wipe it. So it lives in `/var/www/rukysite/news`, and Caddy's `handle /news.json` block sends just that one address there. The rest of the site, including its security headers, works as before. `Cache-Control: public, max-age=300` lets browsers reuse the file for 5 minutes.

### Same origin, so the security policy didn't change
The browser loads `/news.json` from your own domain. Your Content-Security-Policy already allows `connect-src 'self'`, so it didn't need loosening. Loading the feeds straight from the browser wouldn't have worked anyway: those sites don't allow other sites to read their feeds from a visitor's browser (CORS), and it would have meant allowing six outside domains in your security policy.

## Checking it on the server

```bash
systemctl list-timers news-fetch.timer        # when it runs next
sudo systemctl start news-fetch.service       # fetch right now
journalctl -u news-fetch.service -n 20        # what the last runs printed
ls -l /var/www/rukysite/news/news.json        # when the file last changed
curl -s https://manuelruky.dev/news.json | head -c 300; echo
systemd-analyze security news-fetch.service   # the sandbox score
```

Each run prints a line per source, like `AWS: 8 headlines`, or `CISA: failed (...); kept 8 from the last run`.

## Undoing it

```bash
sudo systemctl disable --now news-fetch.timer
sudo rm /etc/systemd/system/news-fetch.{service,timer} && sudo systemctl daemon-reload
sudo cp /etc/caddy/Caddyfile.bak-news /etc/caddy/Caddyfile && sudo systemctl reload caddy
sudo rm -r /usr/local/lib/rukysite-news /var/www/rukysite/news
sudo userdel news
```

Then remove the News link from `lib/content.ts` and redeploy.

## Where this fits in your learning plan

- **Linux:** a systemd service and timer, a system user, file ownership, the journal.
- **Security:** least privilege, sandboxing, handling untrusted input, safe links, a Content-Security-Policy that didn't need widening.
- **Web and networking:** RSS/Atom, caching headers, same-origin requests and why CORS would have blocked the other approach, a reverse-proxy route in Caddy.
- **Coming up:** in Phase 2 you'll build CI/CD. The same "server fetches on a schedule" idea is how a pull-based deploy works: the server checks for a new release instead of being pushed to.
