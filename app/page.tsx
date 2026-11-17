import Link from "next/link";
import { Contact } from "@/components/Contact";
import { Journal } from "@/components/Journal";
import { Moments } from "@/components/Moments";
import { PlayerProvider } from "@/components/PlayerProvider";
import { Sky } from "@/components/Sky";
import { ScrollArrows } from "@/components/ScrollArrows";
import { MiniPlayer, Turntable } from "@/components/Turntable";
import { Work } from "@/components/Work";
import { site } from "@/lib/content";
import { getAllPosts } from "@/lib/posts";

export default function Home() {
  return (
    <PlayerProvider>
      <main>
        <section id="top" className="hero">
          <div className="hero-copy-wrap">
            <div className="hero-copy">
              <h1>Building Carefully &amp; Securely</h1>
              <p>
                Hi, I’m {site.fullName}. I find the cloud fascinating, and securing it even more so. I spend most
                of my time building systems that run safely, ship safely and keep their servers protected. Off the
                keyboard, I make music and films, play saxophone and soccer, and on clear nights you’ll find me
                stargazing.
              </p>
              <div className="hero-actions">
                <a href="#work" className="btn-pill">
                  See selected work
                </a>
                <Link href="/blog/" className="link-underline">
                  Read the blog
                </Link>
              </div>
            </div>
          </div>
          <Turntable />
        </section>
        <Work />
        <Moments />
        <Sky />
        <Journal posts={getAllPosts()} />
        <Contact />
      </main>
      <MiniPlayer />
      <ScrollArrows />
    </PlayerProvider>
  );
}
