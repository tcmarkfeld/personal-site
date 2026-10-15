import { useEffect, useRef } from 'react';
import { useDarkTheme } from '@/lib/theme';
import { data, svg } from './hl7kit.gen';
import '@/lib/anatomy/iso.css';

type Point = readonly [number, number, number];

// The kit's camera (scripts/anatomy/kit/iso-kit.mjs), for moving parts live.
const UNIT = Math.sqrt(1.6);
const RAD = Math.PI / 180;
const {
  origin,
  scale,
  azimuth = 45,
  elevation = 30,
} = data.P as {
  origin: readonly [number, number];
  scale: number;
  azimuth?: number;
  elevation?: number;
};
const sinA = Math.sin(azimuth * RAD);
const cosA = Math.cos(azimuth * RAD);
const sinE = Math.sin(elevation * RAD);
const cosE = Math.cos(elevation * RAD);
const unit = scale * UNIT;
const iso = ([x, y, z]: Point): [number, number] => [
  origin[0] + (x * sinA - y * cosA) * unit,
  origin[1] + ((x * cosA + y * sinA) * sinE - z * cosE) * unit,
];
const shift = ([x, y, z]: Point) => {
  const [sx, sy] = [
    (x * sinA - y * cosA) * unit,
    ((x * cosA + y * sinA) * sinE - z * cosE) * unit,
  ];
  return `translate(${sx.toFixed(2)} ${sy.toFixed(2)})`;
};
const path = (points: Point[]) =>
  `M${points
    .map((c) =>
      iso(c)
        .map((n) => n.toFixed(1))
        .join(' '),
    )
    .join('L')}`;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => t * t * (3 - 2 * t);
const span = (t: number, [from, to]: readonly [number, number]) =>
  clamp01((t - from) / (to - from));

// Timeline, in seconds: one field every STEP, offsets within its step.
const FIRST = 0.3;
const STEP = 1.75;
const ADVANCE = [0, 0.55] as const;
const CUT = [0.6, 0.75] as const;
const LIFT = [0.77, 1.07] as const;
const OFF = [0.85, 1.13] as const;
const ACROSS = [1.13, 1.47] as const;
const DOWN = [1.47, 1.72] as const;
const FADE = [9.3, 9.8] as const;
const LOOP = 10;
// Reduced motion holds the third cut, with two fields already sorted.
const STILL = FIRST + STEP * 2 + CUT[1];

type Layer = 'table' | 'air' | `bin${number}`;

// How far the tape has fed since the loop began.
const fedAt = (t: number) =>
  data.pieces.reduce(
    (sum, { length }, i) =>
      sum + length * ease(span(t - FIRST - i * STEP, ADVANCE)),
    0,
  );

// How far the blade is down: a quick fall, a slower lift.
function dropAt(t: number) {
  const local = (t - FIRST) % STEP;
  if (t < FIRST || local > LIFT[1]) return 0;
  if (local < CUT[1]) return data.drop * span(local, CUT) ** 2;
  return data.drop * (1 - ease(span(local, LIFT)));
}

// Where a piece is, which layer draws it, whether it still rides the tape.
function pieceAt(
  { length, path: [off, over, inBin] }: (typeof data.pieces)[number],
  i: number,
  t: number,
): {
  shown: boolean;
  pos: Point;
  layer: Layer;
  onTape: boolean;
  lit: boolean;
  opacity: number;
} {
  const local = t - FIRST - i * STEP;
  const lit = local >= 0 && local < STEP;
  const opacity = 1 - span(t, FADE);
  if (local < 0)
    return {
      shown: false,
      pos: [0, 0, 0],
      layer: 'table',
      onTape: true,
      lit,
      opacity,
    };
  if (local < CUT[1]) {
    const hang = length * ease(span(local, ADVANCE));
    return {
      shown: true,
      pos: [hang - length, 0, 0],
      layer: 'table',
      onTape: true,
      lit,
      opacity,
    };
  }
  const shown = opacity > 0;
  if (local < OFF[0])
    return {
      shown,
      pos: [0, 0, 0],
      layer: 'table',
      onTape: false,
      lit,
      opacity,
    };
  if (local < ACROSS[0]) {
    const u = ease(span(local, OFF));
    return {
      shown,
      pos: [off[0] * u, off[1] * u, off[2] * u],
      layer: 'air',
      onTape: false,
      lit,
      opacity,
    };
  }
  if (local < DOWN[0]) {
    const u = ease(span(local, ACROSS));
    return {
      shown,
      pos: [
        lerp(off[0], over[0], u),
        lerp(off[1], over[1], u),
        lerp(off[2], over[2], u),
      ],
      layer: 'air',
      onTape: false,
      lit,
      opacity,
    };
  }
  // The drop into the bin: forward at an even pace, falling faster.
  const u = span(local, DOWN);
  return {
    shown,
    pos: [over[0], lerp(over[1], inBin[1], u), lerp(over[2], inBin[2], u * u)],
    layer: `bin${i}`,
    onTape: false,
    lit,
    opacity,
  };
}

// A vertical coil spring's back and front halves, from z0 up to z1.
function coil(
  { x, y, r }: { x: number; y: number; r: number },
  z0: number,
  z1: number,
  turns: number,
) {
  const back: string[] = [];
  const front: string[] = [];
  const count = turns * 16;
  let run: Point[] = [];
  let near: boolean | null = null;
  for (let n = 0; n <= count; n++) {
    const angle = (n / count) * turns * Math.PI * 2;
    const point: Point = [
      x + r * Math.cos(angle),
      y + r * Math.sin(angle),
      lerp(z0, z1, n / count),
    ];
    const facing = Math.cos(angle) * cosA + Math.sin(angle) * sinA > 0;
    near ??= facing;
    run.push(point);
    if (facing !== near) {
      (near ? front : back).push(path(run));
      run = [point];
      near = facing;
    }
  }
  if (run.length > 1) (near ? front : back).push(path(run));
  return { back: back.join(''), front: front.join('') };
}

// A pointer across a knob's face, which faces +y, at an angle in xz.
const pointer = (
  { x, y, z, r }: { x: number; y: number; z: number; r: number },
  angle: number,
) =>
  path([
    [x, y, z],
    [x + r * Math.cos(angle), y, z + r * Math.sin(angle)],
  ]);

export function Hl7KitFigure() {
  const dark = useDarkTheme();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Insert the figure once, outside React's rendering, so a theme change never
    // replaces the nodes the animation is moving.
    root.innerHTML = svg;
    const stage = root.firstElementChild as SVGSVGElement;
    const tape = root.querySelector<SVGGElement>('[data-tape]')!;
    const head = root.querySelector<SVGGElement>('[data-head]')!;
    const carriage = root.querySelector<SVGGElement>('[data-carriage]')!;
    const pieces = [...root.querySelectorAll<SVGGElement>('[data-piece]')];
    const layers = Object.fromEntries(
      [...root.querySelectorAll<SVGGElement>('[data-layer]')].map((el) => [
        el.dataset.layer,
        el,
      ]),
    ) as Record<Layer, SVGGElement>;
    const springs = [
      ...root.querySelectorAll<SVGGElement>('[data-spring]'),
    ].map((el) => ({
      back: el.querySelector<SVGPathElement>('[data-half="back"]')!,
      front: el.querySelector<SVGPathElement>('[data-half="front"]')!,
    }));
    const feed = root.querySelector<SVGPathElement>('[data-pointer="feed"]')!;
    const spool = root.querySelector<SVGPathElement>('[data-pointer="spool"]')!;
    const still = matchMedia('(prefers-reduced-motion: reduce)');

    // Loops completed, so the knobs keep turning the same way across the wrap.
    let loops = 0;

    function draw(t: number) {
      const fed = fedAt(t);
      tape.setAttribute('transform', shift([fed, 0, 0]));

      let hanging = false;
      data.pieces.forEach((piece, i) => {
        const el = pieces[i];
        const { shown, pos, layer, onTape, lit, opacity } = pieceAt(
          piece,
          i,
          t,
        );
        hanging ||= shown && onTape;
        el.setAttribute('visibility', shown ? 'visible' : 'hidden');
        if (!shown) return;
        if (el.parentNode !== layers[layer]) layers[layer].appendChild(el);
        if (onTape) el.setAttribute('clip-path', 'url(#hl7-exit)');
        else el.removeAttribute('clip-path');
        el.firstElementChild!.setAttribute('transform', shift(pos));
        el.querySelector('.iso-solid')!.toggleAttribute('data-lit', lit);
        const fade = opacity < 1 ? String(opacity) : '';
        if (el.style.opacity !== fade) el.style.opacity = fade;
      });
      head.setAttribute('visibility', hanging ? 'hidden' : 'visible');

      const drop = dropAt(t);
      carriage.setAttribute('transform', shift([0, 0, -drop]));
      const { z, top, turns } = data.spring;
      data.springs.forEach((spring, i) => {
        const { back, front } = coil(spring, z, top - drop, turns);
        springs[i].back.setAttribute('d', back);
        springs[i].front.setAttribute('d', front);
      });

      const total = loops * data.period + fed;
      const { feed: f, spool: s } = data.pointers;
      feed.setAttribute('d', pointer(f, 1.1 + total / f.roll));
      spool.setAttribute('d', pointer(s, 2.4 + total / s.roll));
    }

    let clock = still.matches ? STILL : 0;
    let frame = 0;
    let last = 0;
    let visible = false;

    function tick(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 0;
      last = now;
      clock += dt;
      if (clock >= LOOP) {
        clock -= LOOP;
        loops++;
      }
      draw(clock);
      frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
    }
    const run = () => {
      if (!frame && visible && !still.matches) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        run();
      },
      { rootMargin: '120px 0px' },
    );
    observer.observe(stage);
    draw(clock);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="iso project-figure" data-theme={dark ? 'dark' : 'light'}>
      <div ref={rootRef} />
    </div>
  );
}
