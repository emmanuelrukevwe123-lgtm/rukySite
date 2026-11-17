/**
 * All of the site's words, links and photos live here.
 *
 * PHOTOS: put image files in `public/images/` and reference them as
 * `{ src: "/images/harbour.jpg", alt: "Boats in the harbour at dusk", caption: "Harbour, 2026" }`.
 * Any frame without a `src` shows a quiet placeholder.
 *
 * Frames crop a photo to fit. `focus` says which part to keep in view, as
 * "across down" percentages: "50% 30%" keeps a face near the top in frame.
 * Clicking a photo always shows the whole picture.
 */

export type Photo = {
  src?: string;
  alt?: string;
  caption?: string;
  /** The part of the photo to keep in view when a frame crops it, e.g. "50% 30%". */
  focus?: string;
};

const GH = "https://github.com/emmanuelrukevwe123-lgtm";

export const site = {
  /** Logo in the nav. */
  name: "Manuel‑Ruky",
  /** Full name, used in the intro and page title. */
  fullName: "Emmanuel Nwabuokei",
  title: "Emmanuel Nwabuokei — Cybersecurity, cloud and DevSecOps",
  description:
    "Emmanuel Nwabuokei (Manuel‑Ruky) builds cloud infrastructure and pipelines with security in from the first commit. Projects, labs and write-ups.",
  email: "emmanuel.rukevwe123@gmail.com",
  year: 2026,
  /** The site's public address, with no trailing slash. Used for link previews and the sitemap. */
  url: "https://manuelruky.dev",
};

/* ------------------------------------------------------------------ Work */

export type Project = {
  title: string;
  kind: string;
  year: string;
  description: string;
  /** Where the card links (the repo). */
  href: string;
  /** Optional live demo. */
  live?: string;
  /** Background of the card art. */
  gradient: string;
  /** Text colour that reads on the gradient. */
  onColor: string;
  /**
   * The project's symbol: SVG path data drawn as a thin line on a 24×24 grid.
   * Shown as a small badge on the card, or large when there is no screenshot.
   */
  symbol: string;
  screenshot?: Photo;
};

export const projects: Project[] = [
  // With a screenshot: these come first.
  {
    title: "Saturn",
    kind: "Web app",
    year: "2026",
    description: "A local-first linked-notes app with a graph view, kanban planner and owner-only cloud sync.",
    href: `${GH}/saturn-pkm`,
    live: "https://saturn-pkm.vercel.app",
    symbol: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M7.4 10.1C4.5 11.5 2.7 13.1 3.1 14.3c.6 1.6 5.1 1 10.1-1.4s8.3-5.8 7.7-7.4c-.4-1.2-2.8-1.2-5.9-.2",
    screenshot: {
      src: "/images/projects/saturn.webp",
      alt: 'The Saturn landing page: "Your knowledge, in orbit"',
      focus: "50% 0%",
    },
    gradient: "linear-gradient(150deg,#d7dccf 0%,#8fa38f 100%)",
    onColor: "#1f2b23",
  },
  {
    title: "Ihe na-eme mkpebi",
    kind: "Web app",
    year: "2026",
    description: "Igbo for \"the thing that makes decisions\". Describe a situation by typing or speaking and get a pick with odds, the reasons, and what would change its mind.",
    href: `${GH}/ihe-na-eme-mkpebi`,
    live: "https://ihe-na-eme-mkpebi.vercel.app",
    symbol: "M12 21v-7 M12 14c0-4-6-3-6-9 M12 14c0-4 6-3 6-9 M3.5 7.5L6 5l2.5 2.5 M15.5 7.5L18 5l2.5 2.5",
    screenshot: {
      src: "/images/projects/ihe-na-eme-mkpebi.webp",
      alt: 'The hand-drawn "Decide For Me" start screen with a three-step guide',
      focus: "50% 0%",
    },
    gradient: "linear-gradient(150deg,#efe9dc 0%,#b9c4ae 100%)",
    onColor: "#26301f",
  },

  // Symbol cards: security and cloud work, then apps and tools.
  {
    title: "SOC Home Lab",
    kind: "Security lab",
    year: "2026",
    description: "A segmented lab: pfSense firewall, Kali, vulnerable apps in a DMZ, and a Wazuh SIEM with real detections and incident write-ups.",
    href: `${GH}/soc-home-lab`,
    // Shield with a tick
    symbol: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z M9 12l2 2 4-4",
    gradient: "linear-gradient(150deg,#5d7c66 0%,#151815 100%)",
    onColor: "#eef2ee",
  },
  {
    title: "Cloud Security Labzen",
    kind: "Cloud security",
    year: "2026",
    description: "Hands-on AWS and Oracle Cloud projects, built in public: account baselines, network reviews and cloud detection.",
    href: `${GH}/Cloud-Security_Labzen`,
    // Padlock
    symbol: "M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 14.5v2.5",
    gradient: "linear-gradient(150deg,#c9d8cd 0%,#7c9a85 100%)",
    onColor: "#1f2b23",
  },
  {
    title: "Ledgerly Payments API",
    kind: "DevSecOps",
    year: "2026",
    description: "A FastAPI service shipped by GitHub Actions: lint, tests and a Trivy scan that blocks risky images, then GHCR, Render and Kubernetes.",
    href: `${GH}/duplo-style-payments-api`,
    // Payment card
    symbol: "M3 6h18v12H3z M3 10h18 M7 14.5h4",
    gradient: "linear-gradient(150deg,#3a3a38 0%,#141414 100%)",
    onColor: "#e8e8e4",
  },
  {
    title: "cPanel & WHM on AWS",
    kind: "Cloud",
    year: "2026",
    description: "A hosting server on EC2 with a locked-down security group, Elastic IP, packages and accounts, documented step by step.",
    href: `${GH}/Cpanel-Whm_aws_ON`,
    // Control panel window
    symbol: "M3 4h18v16H3z M3 9h18 M9 9v11 M6 6.5h.01 M8.5 6.5h.01",
    gradient: "linear-gradient(150deg,#9fbba7 0%,#2f4236 100%)",
    onColor: "#f2f5f2",
  },
  {
    title: "Noemo",
    kind: "Web app",
    year: "2026",
    description: "A private forex trade journal: Next.js and Supabase with row-level security, plus a constrained AI trade review.",
    href: `${GH}/noemo`,
    // Rising chart line
    symbol: "M4 20h16 M5 15l4-4 3 3 6-7 M14.5 7H18v3.5",
    gradient: "linear-gradient(150deg,#e4e4df 0%,#9a9a94 100%)",
    onColor: "#222222",
  },
  {
    title: "Content Agent",
    kind: "AI tooling",
    year: "2026",
    description: "A Claude Code agent that takes a short video from idea to script, captions and rough cut, using free local tools.",
    href: `${GH}/agentforsocial_s`,
    // Play button in a frame
    symbol: "M4 5h16v14H4z M10 9l5 3-5 3z",
    gradient: "linear-gradient(150deg,#f3efe6 0%,#d9d6cc 100%)",
    onColor: "#333333",
  },
  {
    title: "manuelruky.dev",
    kind: "DevOps",
    year: "2026",
    description: "This site's own hosting: an Oracle Cloud server hardened by script, Caddy with automatic HTTPS, release-based deploys with rollback, and a BIND DNS server.",
    href: `${GH}/rukySite`,
    live: "https://manuelruky.dev",
    // Server
    symbol: "M4 4h16v6H4z M4 14h16v6H4z M7.5 7h.01 M7.5 17h.01 M11 7h5 M11 17h5",
    gradient: "linear-gradient(150deg,#2f4236 0%,#121814 100%)",
    onColor: "#eef2ee",
  },
];

/* --------------------------------------------------------------- Moments */

export type CollagePiece = {
  label: string;
  /** Position and size inside the collage, in % of the frame. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Resting tilt in degrees. */
  tilt: number;
  z: number;
  photo?: Photo;
};

export const collage: CollagePiece[] = [
  {
    label: "Your portrait", x: 6, y: 5, w: 54, h: 56, tilt: -3, z: 3,
    photo: {
      src: "/images/portrait.webp",
      alt: "Emmanuel in profile, looking left, with trees behind him",
      caption: "Portrait",
      focus: "45% 40%",
    },
  },
  {
    label: "Media", x: 52, y: 10, w: 42, h: 32, tilt: 4, z: 2,
    photo: {
      src: "/images/saxophone-rooftop.webp",
      alt: "Emmanuel playing an alto saxophone on a rooftop above the city",
      caption: "Alto saxophone, rooftop set",
      focus: "50% 32%",
    },
  },
  {
    label: "Media", x: 44, y: 50, w: 50, h: 40, tilt: -2, z: 4,
    photo: {
      src: "/images/studio-shadow.webp",
      alt: "Black and white studio photo: Emmanuel seated in a shaped pool of light, shouting, hands on his head",
      caption: "Studio session",
      focus: "50% 55%",
    },
  },
  {
    label: "Media", x: 4, y: 62, w: 38, h: 32, tilt: 3, z: 5,
    photo: {
      src: "/images/street-autumn.webp",
      alt: "Emmanuel in a patterned knit jumper on a sunlit street under a deep blue sky",
      caption: "Debrecen, 2023",
      focus: "50% 35%",
    },
  },
  {
    label: "Detail", x: 36, y: 38, w: 22, h: 20, tilt: -7, z: 6,
    photo: {
      src: "/images/saxophone-detail.webp",
      alt: "Close view of hands on the keys of an alto saxophone",
      caption: "Hands on the keys",
      focus: "50% 50%",
    },
  },
];

/** The photo grid under the collage, in reading order (7 frames). */
export const moments: Photo[] = [
  {
    src: "/images/grand-mosque.webp",
    alt: "Emmanuel in a white kandura and sunglasses in the courtyard of the Sheikh Zayed Grand Mosque",
    caption: "Sheikh Zayed Grand Mosque, Abu Dhabi, 2022",
    focus: "50% 55%",
  },
  {
    src: "/images/ice-rink.webp",
    alt: "Emmanuel on blue skates with his arms out for balance on an indoor ice rink",
    caption: "First time on the ice, Hungary, 2021",
    focus: "50% 50%",
  },
  {
    src: "/images/beach-walk.webp",
    alt: "Emmanuel in a cap and sunglasses walking along a beach with ships on the horizon",
    caption: "Lagos, 2026",
    focus: "50% 45%",
  },
  {
    src: "/images/church-ruins.webp",
    alt: "A tall brick church ruin with a red cross on its wall, Emmanuel sitting small at its base",
    caption: "Church ruins at golden hour, 2022",
    focus: "50% 60%",
  },
  {
    src: "/images/garden-steps.webp",
    alt: "Emmanuel leaning on a wooden rail on stone steps, under a wide blue sky",
    caption: "By the railway, spring 2022",
    focus: "45% 62%",
  },
  {
    src: "/images/beach-headphones.webp",
    alt: "Emmanuel smiling in headphones and mirrored sunglasses, towers across the water behind him",
    caption: "Lagos, 2025",
    focus: "60% 52%",
  },
  {
    src: "/images/city-night.webp",
    alt: "Emmanuel smiling at night in front of lit towers",
    caption: "Abu Dhabi at night, 2022",
    focus: "50% 53%",
  },
];

/* --------------------------------------------------------------- Contact */

export type Social = {
  name: string;
  href: string;
  /** SVG path on a 24×24 viewBox (from Simple Icons). */
  icon: string;
};

export const socials: Social[] = [
  {
    name: "GitHub",
    href: GH,
    icon: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/emmanuel-nwabuokei-/",
    icon: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-2.335 3.37-2.335 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
];

/** `section` is the homepage section that marks the link as current while it's on screen. */
export const navLinks = [
  { section: "work", label: "Work", href: "/#work" },
  { section: "moments", label: "Moments", href: "/#moments" },
  { section: "journal", label: "Blog", href: "/blog/" },
  { section: "contact", label: "Contact", href: "/#contact" },
] as const;
