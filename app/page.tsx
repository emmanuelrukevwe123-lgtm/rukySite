import Link from "next/link";
import { Contact } from "@/components/Contact";
import { Journal } from "@/components/Journal";
import { Moments } from "@/components/Moments";
import { PlayerProvider } from "@/components/PlayerProvider";
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
                I’m {site.fullName}. I work across cybersecurity, cloud and DevSecOps: I build infrastructure and
                pipelines with security in from the first commit, then attack and monitor them in my own labs. Off
                the keyboard, I play saxophone and make films.
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
        <Journal posts={getAllPosts()} />
        <Contact />
      </main>
      <MiniPlayer />
      <ScrollArrows />
    </PlayerProvider>
  );
}
