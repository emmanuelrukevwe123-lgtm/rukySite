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
  /** The brand as search engines and link previews should read it: a plain hyphen, unlike `name`. */
  brand: "Manuel-Ruky",
  description:
    "Emmanuel Nwabuokei (Manuel-Ruky) builds cloud infrastructure and pipelines with security in from the first commit. Projects, labs and write-ups.",
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
   * The project's symbol: filled SVG path data on a 24×24 grid (from I-CONS/, Flaticon UIcons).
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
    symbol: "m23.23.771c-1.44-1.442-4.131-.847-7.999,1.766-1.014-.347-2.101-.536-3.231-.536C6.486,2,2,6.486,2,12c0,1.13.189,2.217.536,3.231C-.076,19.1-.671,21.789.771,23.23c.518.519,1.183.778,2.003.778,1.204,0,2.742-.561,4.642-1.685.439-.26.891-.548,1.353-.859,1.014.347,2.101.536,3.232.536,5.514,0,10-4.486,10-10,0-1.13-.189-2.218-.536-3.232.311-.462.598-.914.858-1.353,1.891-3.192,2.188-5.366.908-6.645Zm-11.23,4.229c2.555,0,4.795,1.377,6.017,3.428-1.143,1.529-2.627,3.269-4.474,5.116-1.847,1.847-3.587,3.331-5.116,4.474-2.05-1.222-3.427-3.462-3.427-6.017,0-3.86,3.141-7,7-7ZM3.014,20.999c.067-.452.355-1.355,1.174-2.764.465.581.993,1.109,1.574,1.575-1.251.736-2.205,1.124-2.748,1.189Zm9.01-1.999c1.208-1.008,2.436-2.131,3.64-3.335,1.204-1.204,2.328-2.432,3.336-3.64-.013,3.841-3.136,6.962-6.976,6.975Zm6.211-14.812c1.409-.819,2.312-1.107,2.764-1.174-.065.543-.454,1.497-1.189,2.749-.465-.581-.993-1.109-1.574-1.574Z",
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
    symbol: "m21,11h-3.176l-4.09-2.958c-.23-.167-.478-.297-.734-.39v-.798c1.444-.431,2.5-1.772,2.5-3.354,0-1.93-1.57-3.5-3.5-3.5s-3.5,1.57-3.5,3.5c0,1.582,1.056,2.923,2.5,3.354v.781c-.279.096-.547.235-.794.416h0l-4.032,2.949h-3.173c-1.654,0-3,1.346-3,3v1c0,.553.448,1,1,1s1-.447,1-1v-1c0-.552.449-1,1-1h3.173l4.033,2.949c.529.386,1.149.579,1.77.579.616,0,1.232-.189,1.759-.57l4.09-2.958h3.176c.551,0,1,.448,1,1v1c0,.553.448,1,1,1s1-.447,1-1v-1c0-1.654-1.346-3-3-3ZM10.5,3.5c0-.827.673-1.5,1.5-1.5s1.5.673,1.5,1.5-.673,1.5-1.5,1.5-1.5-.673-1.5-1.5Zm2.062,10.837c-.353.255-.826.254-1.177-.003l-3.192-2.334,3.191-2.334c.352-.256.824-.259,1.177-.003l3.231,2.337-3.231,2.337Zm11.145,4.37l-1.793,1.793,1.793,1.793c.391.391.391,1.023,0,1.414-.195.195-.451.293-.707.293s-.512-.098-.707-.293l-1.793-1.793-1.793,1.793c-.195.195-.451.293-.707.293s-.512-.098-.707-.293c-.391-.391-.391-1.023,0-1.414l1.793-1.793-1.793-1.793c-.391-.391-.391-1.023,0-1.414s1.023-.391,1.414,0l1.793,1.793,1.793-1.793c.391-.391,1.023-.391,1.414,0s.391,1.023,0,1.414Zm-15.504-.919c.393.388.397,1.021.009,1.414l-3.021,3.061c-.477.478-1.105.737-1.772.737s-1.296-.26-1.768-.732l-1.358-1.358c-.391-.391-.391-1.023,0-1.414s1.023-.391,1.414,0l1.358,1.358c.127.128.276.146.354.146.077,0,.226-.019.354-.146l3.016-3.056c.389-.393,1.021-.398,1.415-.01Z",
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
    symbol: "m12 6.276v-1.776c0-2.481-2.019-4.5-4.5-4.5s-4.5 2.019-4.5 4.5v1.776c-1.742.621-3 2.271-3 4.224v4c0 2.481 2.019 4.5 4.5 4.5h6c2.481 0 4.5-2.019 4.5-4.5v-4c0-1.953-1.258-3.602-3-4.224zm-4.5-4.276c1.378 0 2.5 1.122 2.5 2.5v1.5h-5v-1.5c0-1.378 1.122-2.5 2.5-2.5zm5.5 12.5c0 1.378-1.122 2.5-2.5 2.5h-6c-1.378 0-2.5-1.122-2.5-2.5v-4c0-1.378 1.122-2.5 2.5-2.5h6c1.378 0 2.5 1.122 2.5 2.5zm-4.5-2.5v1c0 .552-.448 1-1 1s-1-.448-1-1v-1c0-.552.448-1 1-1s1 .448 1 1zm8.5-5c0-.552.448-1 1-1h1.5c.827 0 1.5-.673 1.5-1.5v-.777c-.595-.346-1-.984-1-1.723 0-1.105.895-2 2-2s2 .895 2 2c0 .738-.405 1.376-1 1.723v.777c0 1.93-1.57 3.5-3.5 3.5h-1.5c-.552 0-1-.448-1-1zm7 15c0 1.105-.895 2-2 2s-2-.895-2-2c0-.738.405-1.376 1-1.723v-.777c0-.827-.673-1.5-1.5-1.5h-1.5c-.552 0-1-.448-1-1s.448-1 1-1h1.5c1.93 0 3.5 1.57 3.5 3.5v.777c.595.346 1 .984 1 1.723zm0-10c0 1.105-.895 2-2 2-.738 0-1.376-.405-1.723-1h-2.277c-.552 0-1-.448-1-1s.448-1 1-1h2.277c.346-.595.984-1 1.723-1 1.105 0 2 .895 2 2z",
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
    symbol: "M13,20h-2v-2h2v2Zm3-6h2v7c0,1.654-1.346,3-3,3h-6c-1.654,0-3-1.346-3-3v-7h2v-1c0-2.206,1.794-4,4-4s4,1.794,4,4v1Zm-6,0h4v-1c0-1.103-.897-2-2-2s-2,.897-2,2v1Zm6,2H8v5c0,.551,.449,1,1,1h6c.551,0,1-.449,1-1v-5Zm2.348-10.77C17.037,2.079,13.953,0,10.5,0,5.813,0,2,3.813,2,8.5c0,.55,.053,1.097,.157,1.633-1.347,1.033-2.157,2.645-2.157,4.367,0,2.656,1.721,4.878,4,5.389v-2.104c-1.161-.483-2-1.766-2-3.285,0-1.261,.684-2.43,1.783-3.05l.688-.388-.219-.759c-.168-.583-.253-1.19-.253-1.802,0-3.584,2.916-6.5,6.5-6.5,2.79,0,5.265,1.774,6.159,4.415l.191,.564,.587,.101c2.644,.453,4.563,2.732,4.563,5.419,0,1.704-.779,3.23-2,4.239v2.389c2.376-1.26,4-3.757,4-6.628,0-3.467-2.344-6.437-5.652-7.27Z",
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
    symbol: "m5.5 11c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5.672-1.5 1.5-1.5zm18.5-6v4c0 .552-.447 1-1 1s-1-.448-1-1v-2h-20v6c0 1.654 1.346 3 3 3h2c.553 0 1 .448 1 1s-.447 1-1 1h-2c-2.757 0-5-2.243-5-5v-8c0-2.757 2.243-5 5-5h14c2.757 0 5 2.243 5 5zm-2 0c0-1.654-1.346-3-3-3h-14c-1.654 0-3 1.346-3 3zm2 12c0 3.86-3.141 7-7 7s-7-3.14-7-7 3.141-7 7-7 7 3.14 7 7zm-2 0c0-2.757-2.243-5-5-5s-5 2.243-5 5 2.243 5 5 5 5-2.243 5-5zm-3.192-1.242-2.223 2.134c-.144.14-.379.143-.522 0l-1.131-1.108c-.396-.386-1.028-.379-1.414.015-.387.395-.381 1.027.014 1.414l1.131 1.108c.46.45 1.062.674 1.664.674s1.2-.224 1.653-.671l2.213-2.124c.398-.383.411-1.016.029-1.414-.383-.398-1.017-.411-1.414-.029z",
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
    symbol: "m24 11.5a4.476 4.476 0 0 0 -1.706-3.5 4.481 4.481 0 0 0 -2.794-8h-15a4.481 4.481 0 0 0 -2.794 8 4.443 4.443 0 0 0 0 7 4.481 4.481 0 0 0 2.794 8h15a4.481 4.481 0 0 0 2.794-8 4.476 4.476 0 0 0 1.706-3.5zm-22-7a2.5 2.5 0 0 1 2.5-2.5h.5v1a1 1 0 0 0 2 0v-1h2v1a1 1 0 0 0 2 0v-1h8.5a2.5 2.5 0 0 1 0 5h-15a2.5 2.5 0 0 1 -2.5-2.5zm20 14a2.5 2.5 0 0 1 -2.5 2.5h-15a2.5 2.5 0 0 1 0-5h.5v1a1 1 0 0 0 2 0v-1h2v1a1 1 0 0 0 2 0v-1h8.5a2.5 2.5 0 0 1 2.5 2.5zm-17.5-4.5a2.5 2.5 0 0 1 0-5h.5v1a1 1 0 0 0 2 0v-1h2v1a1 1 0 0 0 2 0v-1h8.5a2.5 2.5 0 0 1 0 5z",
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
    symbol: "M3,22H24v2H3c-1.654,0-3-1.346-3-3V0H2V21c0,.551,.449,1,1,1ZM17,5v2h3.586l-5.586,5.586-4-4-6.707,6.707,1.414,1.414,5.293-5.293,4,4,7-7v3.586h2V5h-7Z",
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
    symbol: "m16.914,1h2.086c.621,0,1.215.114,1.764.322l-5.678,5.678h-4.172l6-6Zm7.086,6v-1c0-1.4-.579-2.668-1.51-3.576l-4.576,4.576h6.086ZM10.522,1l-6.084,6h3.648L14.086,1h-3.564ZM1.59,7L7.674,1h-2.674C2.243,1,0,3.243,0,6v1h1.59Zm22.41,2v9c0,2.757-2.243,5-5,5H5c-2.757,0-5-2.243-5-5v-9h24Zm-8.953,6.2l-4.634-2.48c-.622-.373-1.413.075-1.413.8v4.961c0,.725.791,1.173,1.413.8l4.634-2.48c.604-.362.604-1.238,0-1.6Z",
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
    symbol: "M12,0A12,12,0,1,0,24,12,12.013,12.013,0,0,0,12,0Zm8.647,7H17.426a19.676,19.676,0,0,0-2.821-4.644A10.031,10.031,0,0,1,20.647,7ZM16.5,12a10.211,10.211,0,0,1-.476,3H7.976A10.211,10.211,0,0,1,7.5,12a10.211,10.211,0,0,1,.476-3h8.048A10.211,10.211,0,0,1,16.5,12ZM8.778,17h6.444A19.614,19.614,0,0,1,12,21.588,19.57,19.57,0,0,1,8.778,17Zm0-10A19.614,19.614,0,0,1,12,2.412,19.57,19.57,0,0,1,15.222,7ZM9.4,2.356A19.676,19.676,0,0,0,6.574,7H3.353A10.031,10.031,0,0,1,9.4,2.356ZM2.461,9H5.9a12.016,12.016,0,0,0-.4,3,12.016,12.016,0,0,0,.4,3H2.461a9.992,9.992,0,0,1,0-6Zm.892,8H6.574A19.676,19.676,0,0,0,9.4,21.644,10.031,10.031,0,0,1,3.353,17Zm11.252,4.644A19.676,19.676,0,0,0,17.426,17h3.221A10.031,10.031,0,0,1,14.605,21.644ZM21.539,15H18.1a12.016,12.016,0,0,0,.4-3,12.016,12.016,0,0,0-.4-3h3.437a9.992,9.992,0,0,1,0,6Z",
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
  { section: "news", label: "News", href: "/news/" },
  { section: "contact", label: "Contact", href: "/#contact" },
] as const;
