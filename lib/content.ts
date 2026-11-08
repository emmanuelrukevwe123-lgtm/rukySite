/**
 * All of the site's words, links and photos live here.
 *
 * PHOTOS: put image files in `public/images/` and reference them as
 * `{ src: "/images/harbour.jpg", alt: "Boats in the harbour at dusk", caption: "Harbour, 2026" }`.
 * Any frame without a `src` shows a quiet placeholder.
 */

export type Photo = {
  src?: string;
  alt?: string;
  caption?: string;
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
  screenshot?: Photo;
};

export const projects: Project[] = [
  {
    title: "SOC Home Lab",
    kind: "Security lab",
    year: "2026",
    description: "A segmented lab: pfSense firewall, Kali, vulnerable apps in a DMZ, and a Wazuh SIEM with real detections and incident write-ups.",
    href: `${GH}/soc-home-lab`,
    gradient: "linear-gradient(150deg,#5d7c66 0%,#151815 100%)",
    onColor: "#eef2ee",
  },
  {
    title: "Cloud Security Labzen",
    kind: "Cloud security",
    year: "2026",
    description: "Hands-on AWS and Oracle Cloud projects, built in public: account baselines, network reviews and cloud detection.",
    href: `${GH}/Cloud-Security_Labzen`,
    gradient: "linear-gradient(150deg,#c9d8cd 0%,#7c9a85 100%)",
    onColor: "#1f2b23",
  },
  {
    title: "Ledgerly Payments API",
    kind: "DevSecOps",
    year: "2026",
    description: "A FastAPI service shipped by GitHub Actions: lint, tests and a Trivy scan that blocks risky images, then GHCR, Render and Kubernetes.",
    href: `${GH}/duplo-style-payments-api`,
    gradient: "linear-gradient(150deg,#3a3a38 0%,#141414 100%)",
    onColor: "#e8e8e4",
  },
  {
    title: "cPanel & WHM on AWS",
    kind: "Cloud",
    year: "2026",
    description: "A hosting server on EC2 with a locked-down security group, Elastic IP, packages and accounts, documented step by step.",
    href: `${GH}/Cpanel-Whm_aws_ON`,
    gradient: "linear-gradient(150deg,#9fbba7 0%,#2f4236 100%)",
    onColor: "#f2f5f2",
  },
  {
    title: "Content Agent",
    kind: "AI tooling",
    year: "2026",
    description: "A Claude Code agent that takes a short video from idea to script, captions and rough cut, using free local tools.",
    href: `${GH}/agentforsocial_s`,
    gradient: "linear-gradient(150deg,#f3efe6 0%,#d9d6cc 100%)",
    onColor: "#333333",
  },
  {
    title: "Noemo",
    kind: "Web app",
    year: "2026",
    description: "A private forex trade journal: Next.js and Supabase with row-level security, plus a constrained AI trade review.",
    href: `${GH}/noemo`,
    gradient: "linear-gradient(150deg,#e4e4df 0%,#9a9a94 100%)",
    onColor: "#222222",
  },
  {
    title: "Saturn",
    kind: "Web app",
    year: "2026",
    description: "A local-first linked-notes app with a graph view, kanban planner and owner-only cloud sync.",
    href: `${GH}/saturn-pkm`,
    live: "https://saturn-pkm.vercel.app",
    gradient: "linear-gradient(150deg,#d7dccf 0%,#8fa38f 100%)",
    onColor: "#1f2b23",
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
  { label: "Your portrait", x: 6, y: 5, w: 54, h: 56, tilt: -3, z: 3 },
  { label: "Media", x: 52, y: 10, w: 42, h: 32, tilt: 4, z: 2 },
  { label: "Media", x: 44, y: 50, w: 50, h: 40, tilt: -2, z: 4 },
  { label: "Media", x: 4, y: 62, w: 38, h: 32, tilt: 3, z: 5 },
  { label: "Detail", x: 36, y: 38, w: 22, h: 20, tilt: -7, z: 6 },
];

/** The photo grid under the collage, in reading order (7 frames). */
export const moments: Photo[] = [{}, {}, {}, {}, {}, {}, {}];

/* --------------------------------------------------------------- Contact */

export type Social = {
  name: string;
  href: string;
  /** SVG path on a 24×24 viewBox (from Simple Icons). */
  icon: string;
};

// TODO: replace the X href with your profile URL.
export const socials: Social[] = [
  {
    name: "GitHub",
    href: GH,
    icon: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  },
  {
    name: "X",
    href: "https://x.com/",
    icon: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
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
