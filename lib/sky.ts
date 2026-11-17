/**
 * The night-sky section: a few constellations and the moon's phase.
 *
 * Star positions are real. Each star is given by its sky coordinates
 * (right ascension in hours, declination in degrees) and its brightness
 * (magnitude: smaller is brighter), then flattened onto the chart with north up,
 * the way the figure looks from the ground.
 */

type RawStar = {
  name: string;
  /** Right ascension, hours. */
  ra: number;
  /** Declination, degrees. */
  dec: number;
  /** Apparent magnitude. */
  mag: number;
  /** Show the star's name on the chart, and where the label sits relative to the star. */
  label?: "left" | "right";
};

type RawConstellation = {
  id: string;
  name: string;
  /** What the figure is said to be. */
  figure: string;
  /** When it is easiest to see in the evening. */
  season: string;
  note: string;
  stars: RawStar[];
  /** Pairs of indexes into `stars`, one per line of the figure, in drawing order. */
  lines: [number, number][];
};

const RAW: RawConstellation[] = [
  {
    id: "orion",
    name: "Orion",
    figure: "The hunter",
    season: "Evenings from December to March",
    note: "The easiest one to find: three stars in a short straight row make the belt. Follow the belt down and left to reach Sirius, the brightest star in the night sky.",
    stars: [
      { name: "Betelgeuse", ra: 5.919, dec: 7.41, mag: 0.5, label: "left" },
      { name: "Bellatrix", ra: 5.419, dec: 6.35, mag: 1.6 },
      { name: "Alnitak", ra: 5.679, dec: -1.94, mag: 1.8 },
      { name: "Alnilam", ra: 5.604, dec: -1.2, mag: 1.7 },
      { name: "Mintaka", ra: 5.533, dec: -0.3, mag: 2.2 },
      { name: "Saiph", ra: 5.796, dec: -9.67, mag: 2.1 },
      { name: "Rigel", ra: 5.242, dec: -8.2, mag: 0.1, label: "right" },
      { name: "Meissa", ra: 5.585, dec: 9.93, mag: 3.4 },
    ],
    lines: [[7, 0], [7, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [5, 6]],
  },
  {
    id: "scorpius",
    name: "Scorpius",
    figure: "The scorpion",
    season: "Evenings from June to August",
    note: "A long curve of stars ending in a hooked tail. The red star at its heart is Antares, whose name means “rival of Mars” because the two look so alike.",
    stars: [
      { name: "Graffias", ra: 16.091, dec: -19.81, mag: 2.6 },
      { name: "Dschubba", ra: 16.006, dec: -22.62, mag: 2.3 },
      { name: "Pi Scorpii", ra: 15.981, dec: -26.11, mag: 2.9 },
      { name: "Al Niyat", ra: 16.353, dec: -25.59, mag: 2.9 },
      { name: "Antares", ra: 16.49, dec: -26.43, mag: 1.0, label: "left" },
      { name: "Tau Scorpii", ra: 16.598, dec: -28.22, mag: 2.8 },
      { name: "Larawag", ra: 16.836, dec: -34.29, mag: 2.3 },
      { name: "Mu Scorpii", ra: 16.864, dec: -38.05, mag: 3.0 },
      { name: "Zeta Scorpii", ra: 16.91, dec: -42.36, mag: 3.6 },
      { name: "Eta Scorpii", ra: 17.203, dec: -43.24, mag: 3.3 },
      { name: "Sargas", ra: 17.622, dec: -43.0, mag: 1.9 },
      { name: "Iota Scorpii", ra: 17.793, dec: -40.13, mag: 3.0 },
      { name: "Kappa Scorpii", ra: 17.708, dec: -39.03, mag: 2.4 },
      { name: "Shaula", ra: 17.56, dec: -37.1, mag: 1.6, label: "left" },
      { name: "Lesath", ra: 17.513, dec: -37.3, mag: 2.7 },
    ],
    lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14]],
  },
  {
    id: "big-dipper",
    name: "The Big Dipper",
    figure: "Part of Ursa Major, the great bear",
    season: "Evenings from March to June",
    note: "Seven stars in the shape of a ladle. The two stars at the front of the bowl point straight to Polaris, the North Star.",
    stars: [
      { name: "Dubhe", ra: 11.062, dec: 61.75, mag: 1.8, label: "right" },
      { name: "Merak", ra: 11.031, dec: 56.38, mag: 2.4, label: "right" },
      { name: "Phecda", ra: 11.897, dec: 53.69, mag: 2.4 },
      { name: "Megrez", ra: 12.257, dec: 57.03, mag: 3.3 },
      { name: "Alioth", ra: 12.9, dec: 55.96, mag: 1.8 },
      { name: "Mizar", ra: 13.399, dec: 54.93, mag: 2.2 },
      { name: "Alkaid", ra: 13.792, dec: 49.31, mag: 1.9, label: "left" },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
  },
  {
    id: "cassiopeia",
    name: "Cassiopeia",
    figure: "The seated queen",
    season: "Evenings from October to January",
    note: "Five stars in a wide W. It sits on the opposite side of the North Star from the Big Dipper, so when one is low the other is high.",
    stars: [
      { name: "Caph", ra: 0.153, dec: 59.15, mag: 2.3, label: "right" },
      { name: "Schedar", ra: 0.675, dec: 56.54, mag: 2.2 },
      { name: "Gamma Cassiopeiae", ra: 0.945, dec: 60.72, mag: 2.2 },
      { name: "Ruchbah", ra: 1.43, dec: 60.24, mag: 2.7 },
      { name: "Segin", ra: 1.907, dec: 63.67, mag: 3.4, label: "left" },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    id: "southern-cross",
    name: "The Southern Cross",
    figure: "Crux, the smallest constellation",
    season: "Evenings from April to June, low in the south",
    note: "Four bright stars in a kite shape. The long arm of the cross points toward the south pole of the sky, which has no bright star of its own.",
    stars: [
      { name: "Gacrux", ra: 12.519, dec: -57.11, mag: 1.6, label: "right" },
      { name: "Acrux", ra: 12.443, dec: -63.1, mag: 0.8, label: "right" },
      { name: "Mimosa", ra: 12.795, dec: -59.69, mag: 1.3, label: "left" },
      { name: "Imai", ra: 12.252, dec: -58.75, mag: 2.8 },
    ],
    lines: [[0, 1], [2, 3]],
  },
];

/** The chart area a figure is fitted into (the moon keeps the top-right corner). */
const BOX = { x: 44, y: 46, w: 232, h: 218 };

export type ChartStar = { name: string; x: number; y: number; r: number; label?: "left" | "right" };
export type Constellation = Omit<RawConstellation, "stars" | "lines"> & {
  stars: ChartStar[];
  lines: { x1: number; y1: number; x2: number; y2: number }[];
};

function project(c: RawConstellation): Constellation {
  const ra0 = c.stars.reduce((sum, s) => sum + s.ra, 0) / c.stars.length;
  const dec0 = c.stars.reduce((sum, s) => sum + s.dec, 0) / c.stars.length;
  const shrink = Math.cos((dec0 * Math.PI) / 180);
  // East is to the left when you look up at the sky, so right ascension runs right to left.
  const flat = c.stars.map((s) => ({ x: -(s.ra - ra0) * 15 * shrink, y: -(s.dec - dec0) }));
  const xs = flat.map((p) => p.x);
  const ys = flat.map((p) => p.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = Math.min(BOX.w / (maxX - minX), BOX.h / (maxY - minY));
  const offX = BOX.x + (BOX.w - (maxX - minX) * scale) / 2;
  const offY = BOX.y + (BOX.h - (maxY - minY) * scale) / 2;
  const round = (n: number) => Math.round(n * 10) / 10;
  const stars = c.stars.map((s, i) => ({
    name: s.name,
    x: round(offX + (flat[i].x - minX) * scale),
    y: round(offY + (flat[i].y - minY) * scale),
    // Brighter stars are drawn larger.
    r: round(1.5 + Math.max(0, 4 - s.mag) * 0.7),
    label: s.label,
  }));
  const lines = c.lines.map(([a, b]) => ({ x1: stars[a].x, y1: stars[a].y, x2: stars[b].x, y2: stars[b].y }));
  return { id: c.id, name: c.name, figure: c.figure, season: c.season, note: c.note, stars, lines };
}

export const constellations: Constellation[] = RAW.map(project);

/** Faint background stars: the same scatter every time, so the page never shifts between visits. */
export const fieldStars: { x: number; y: number; r: number; o: number }[] = (() => {
  let seed = 20261117;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: 90 }, () => ({
    x: Math.round(next() * 4000) / 10,
    y: Math.round(next() * 3000) / 10,
    r: Math.round((0.35 + next() * 0.7) * 100) / 100,
    o: Math.round((0.18 + next() * 0.4) * 100) / 100,
  }));
})();

/* ------------------------------------------------------------------ Moon */

const SYNODIC_MONTH = 29.530588853; // days from one new moon to the next
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // a new moon to count from

export type MoonPhase = {
  /** 0 = new, 0.5 = full, then back toward 1 = new. */
  cycle: number;
  /** Share of the disc that is lit, 0 to 100. */
  lit: number;
  name: string;
};

/** The moon's phase at a given time. Good to within about a day, which is all the eye can tell. */
export function moonPhase(time: number): MoonPhase {
  const days = (time - KNOWN_NEW_MOON) / 86_400_000;
  const cycle = (((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH) / SYNODIC_MONTH;
  const lit = Math.round(((1 - Math.cos(2 * Math.PI * cycle)) / 2) * 100);
  const name =
    cycle < 0.03 || cycle > 0.97 ? "new moon"
    : cycle < 0.22 ? "waxing crescent"
    : cycle < 0.28 ? "first quarter"
    : cycle < 0.47 ? "waxing gibbous"
    : cycle < 0.53 ? "full moon"
    : cycle < 0.72 ? "waning gibbous"
    : cycle < 0.78 ? "last quarter"
    : "waning crescent";
  return { cycle, lit, name };
}

/** SVG path for the lit part of a moon of radius `r` centred on (cx, cy), as seen from the northern hemisphere. */
export function moonLitPath(cycle: number, cx: number, cy: number, r: number): string {
  const waxing = cycle < 0.5;
  const terminator = Math.abs(Math.cos(2 * Math.PI * cycle)) * r;
  const gibbous = cycle > 0.25 && cycle < 0.75;
  const top = `${cx},${cy - r}`;
  const bottom = `${cx},${cy + r}`;
  // Outer edge down the lit side, then the shadow's curved edge back up.
  const limb = `A${r},${r} 0 0 ${waxing ? 1 : 0} ${bottom}`;
  const inner = `A${terminator.toFixed(2)},${r} 0 0 ${waxing === gibbous ? 1 : 0} ${top}`;
  return `M${top} ${limb} ${inner}Z`;
}
