---
title: Why my website kept disappearing
date: Nov 23, 2026
dateTime: 2026-11-23
topic: Cloud
summary: One of my cloud servers kept going silent for hours at a time. My first guess was wrong. The real cause was a guest list that filled up with strangers.
---

**What:** A WordPress site I run on a free Oracle Cloud server kept vanishing: no page, no error, nothing.
**Cause:** a list inside the server that tracks every visitor filled up with automated traffic, so the server turned everyone away.
**Fix:** a bigger list, a rule to cross off people who have left, and an alert that warns me before it fills up again.

## What I saw

Every so often the site simply stopped loading. Not slowly: the browser waited, then gave up. I couldn't log in to the server either. Yet the Oracle Cloud console said the machine was **running** perfectly well.

Restarting it fixed things, for a day or two. Then it happened again.

## My first guess was wrong

The server is tiny. It has 1 GB of memory, about what a phone had ten years ago. WordPress can be hungry, so my first idea was that it ran out of memory and froze.

Then I read the server's own logs from just before I restarted it. Two things didn't fit:

- Nothing had been shut down for lack of memory, which is what Linux does when memory runs out.
- When I pressed restart, the server shut down **neatly, step by step**. A frozen machine can't do that.

So the server wasn't broken. It was awake and healthy, but nothing from outside could reach it. That pointed somewhere else.

## The real cause: a guest list

The logs held one line, repeated about 44,000 times in six hours:

```
nf_conntrack: table full, dropping packet
```

Here is what that means, without the jargon.

Picture a door with a security guard. The guard keeps a **guest list** of everyone who is currently inside. When someone new arrives, they are added. When they leave, they are crossed off. Replies to people already on the list are let straight through.

On my server, that list had two problems:

1. **It was short.** Room for only 7,680 names. The size is set automatically from the machine's memory, and on a small machine it comes out small.
2. **People were never crossed off.** If a visitor left without saying goodbye, their name stayed on the list for **five days**.

The internet is full of automated programs, bots, that knock on every server's door all day long, looking for weaknesses. Most of them leave without saying goodbye. Their names piled up, the list filled, and from then on the guard turned away **everyone**: real visitors, search engines, and me, the owner. Inside, everything was fine. The website was running, the database was running. The guard just couldn't let anyone in.

Nobody attacked me on purpose. Ordinary background noise from the internet was enough, because the list was small and slow to empty. In security terms this is a **denial of service**: something that stops a service from being available, here by using up a limited resource.

## The fix

Three changes, all in the scripts I use to set up my servers, so every server gets them:

| Change | In guest-list terms |
| --- | --- |
| The list holds 65,536 names instead of 7,680 | A much longer clipboard. It costs about 20 MB of memory. |
| Silent visitors are crossed off after 1 hour, not 5 days | People who wander off don't keep a spot forever |
| My daily server report checks how full the list is | A warning on my phone at 70% full, long before the door closes |

I applied it to all three of my servers the same day. One of them, on AWS, turned out to have a much bigger list already, so I changed the script to only ever **raise** the limit, never shrink it.

While I was in there, I also set firmer memory limits on the WordPress servers. Memory wasn't the cause this time, but it was a real risk on a machine that small.

## What I took away

- **Evidence beats a good story.** "Small server, ran out of memory" sounded right. The logs said otherwise, so I dropped it.
- **"Running" doesn't mean "reachable."** A server can be perfectly healthy and still invisible to the world.
- **Defaults are made for the average case.** A setting that's fine on a laptop at home is too small for a machine the whole internet can knock on.
- **Check, don't assume.** After every change I read the values back. That caught one change that hadn't happened: I had copied a file to my own laptop instead of the server, because of one missing colon.
- **Monitoring matters.** I found this outage because I happened to look. Next time, my phone will tell me first.
