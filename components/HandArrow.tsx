/**
 * Hand-drawn arrows. Each one is drawn progressively as it scrolls into view
 * (see ScrollArrows.tsx); without JavaScript they simply show fully drawn.
 */

type Shape = "long" | "short" | "contact";

const SHAPES: Record<Shape, { viewBox: string; line: string; head: string }> = {
  // A loop, then a long drop: used where the content sits well below the heading.
  long: {
    viewBox: "0 0 150 210",
    line: "M4 22C30 8 62 6 74 24C84 39 70 52 60 42C50 32 66 18 86 26C112 37 120 110 112 198",
    head: "M101.5 186 112 199.5 122.5 185.5",
  },
  // A loop, then a short drop.
  short: {
    viewBox: "0 0 130 100",
    line: "M4 18C26 6 52 6 60 20C67 32 56 42 48 34C40 26 54 14 72 20C96 28 106 56 106 94",
    head: "M97 83.5 106.5 95 115 83",
  },
  // Sweeps down and to the left, onto the Email me button.
  contact: {
    viewBox: "0 0 140 80",
    line: "M131 7c-14-4.5-34-1.5-45 9.5-7 7.2-4.6 17.4 4 16.6 8.4-.8 9.8-11.6 1.6-14.8-12.4-4.8-27.8 6-37.4 18.2C46 46.6 37.4 56.4 30.5 65.5",
    head: "M42.5 60.5 30.2 66.4 29.4 53",
  },
};

export function HandArrow({ shape, className = "" }: { shape: Shape; className?: string }) {
  const s = SHAPES[shape];
  return (
    <svg className={`hand-arrow ${className}`} viewBox={s.viewBox} aria-hidden="true" data-scroll-draw="">
      <path className="arrow-line" pathLength={1} d={s.line} />
      <path className="arrow-head" pathLength={1} d={s.head} />
    </svg>
  );
}
