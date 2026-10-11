import { useEffect, useRef } from 'react';
import { useDarkTheme } from '@/lib/theme';
import { bench, benchHtml } from './reviseBench.gen';
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
} = bench.P as {
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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => t * t * (3 - 2 * t);

// Timeline, in seconds.
const OPEN = 0;
const MEASURE = [1, 3.6];
const SLIDE = 0.8;
const SET = [2.3, 4.9];
const STAGGER = 0.03;
const FLIGHT = 0.9;
const PARK = 5.9;
const EDIT = 6.8;
const REFLOW = 8.2;
const REFLOW_TIME = 1.2;
const SAVE = 9.8;
const ROLL = 10.2;
const ROLL_TIME = 2.2;
const RETURN = 12.8;
const CLEAR = 14;
const FADE = 0.6;
const LOOP = 15.6;
const STAGES = [OPEN, MEASURE[0], SET[0], SET[1], EDIT, REFLOW, SAVE];
const ARC = 24;

function readoutAt(t: number) {
  if (t < MEASURE[0])
    return 'Opening · PDFium reads each glyph and its position';
  if (t < SET[0]) return 'Measuring · baselines within 0.25 em share a line';
  if (t < MEASURE[1])
    return 'Setting a line · a gap over 0.15 em is a word break';
  if (t < SET[1]) return 'Measuring · baselines within 0.25 em share a line';
  if (t < EDIT)
    return 'Stacking · “like” wouldn’t fit above, so same paragraph';
  if (t < REFLOW) return 'Editing · typing changes the model, not the PDF';
  if (t < SAVE) return 'Reflowing · Parley re-wraps the paragraph';
  if (t < CLEAR) return 'Saving · krilla prints a fresh PDF';
  return 'Opening · PDFium reads each glyph and its position';
}

type Layer = 'page' | 'dish' | 'galley' | 'air';
type Sort = (typeof bench.sorts)[number];

const along = (from: Point, to: Point, u: number, arc: number): Point => {
  const e = ease(u);
  return [
    lerp(from[0], to[0], e),
    lerp(from[1], to[1], e),
    lerp(from[2], to[2], e) + arc * Math.sin(Math.PI * u),
  ];
};
const same = (a: Point, b: Point) =>
  a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

// Where a sort is at time t, which layer draws it, and whether it's lit.
function sortAt(
  { row, page, before, after }: Sort,
  index: number,
  t: number,
): { pos: Point; layer: Layer; lit: boolean; opacity: number } {
  const home: Layer = row === 2 ? 'dish' : 'page';
  if (t >= CLEAR + FADE)
    return {
      pos: page,
      layer: home,
      lit: false,
      opacity: clamp01((t - CLEAR - FADE) / FADE),
    };
  const opacity = t >= CLEAR ? 1 - clamp01((t - CLEAR) / FADE) : 1;
  const reflow = clamp01((t - REFLOW) / REFLOW_TIME);
  const moves = !same(before, after);
  const settled = (): {
    pos: Point;
    layer: Layer;
    lit: boolean;
    opacity: number;
  } => {
    if (t < REFLOW)
      return { pos: before, layer: 'galley', lit: false, opacity };
    return {
      pos: along(before, after, reflow, moves ? 5 : 0),
      layer: 'galley',
      lit: moves && t < REFLOW + REFLOW_TIME + 0.2,
      opacity,
    };
  };

  if (row === 2) {
    // The new sort: out of the dish, held past the end of its line, then set
    // into place as the paragraph re-wraps.
    const start = EDIT + 0.2;
    if (t < start)
      return { pos: page, layer: 'dish', lit: t >= EDIT, opacity: 1 };
    if (t < start + FLIGHT)
      return {
        pos: along(page, before, (t - start) / FLIGHT, ARC),
        layer: 'air',
        lit: true,
        opacity: 1,
      };
    if (t < REFLOW + REFLOW_TIME)
      return {
        pos: along(before, after, reflow, 0),
        layer: 'air',
        lit: true,
        opacity: 1,
      };
    return {
      pos: after,
      layer: 'galley',
      lit: t < REFLOW + REFLOW_TIME + 0.2,
      opacity,
    };
  }

  const start = SET[row] + index * STAGGER;
  const measured = t >= MEASURE[row] + SLIDE;
  if (t < start) return { pos: page, layer: 'page', lit: measured, opacity: 1 };
  if (t < start + FLIGHT)
    return {
      pos: along(page, before, (t - start) / FLIGHT, ARC),
      layer: 'air',
      lit: true,
      opacity: 1,
    };
  const landed = settled();
  return { ...landed, lit: landed.lit || t < start + FLIGHT + 0.2 };
}

// Each sort's place within its row, for staggering the row's flight.
const ROW_INDEX = bench.sorts.map(
  (sort, i) => bench.sorts.slice(0, i).filter((o) => o.row === sort.row).length,
);

// How far the bridge has travelled from its parked spot, and what it reads.
function bridgeAt(t: number) {
  const [a, b] = bench.bridge.rows;
  const [readA, readB] = bench.bridge.readings;
  const toA = ease(clamp01((t - MEASURE[0]) / SLIDE));
  const toB = ease(clamp01((t - MEASURE[1]) / SLIDE));
  const home = ease(clamp01((t - PARK) / SLIDE));
  const y = lerp(lerp(lerp(0, a, toA), b, toB), 0, home);
  // The needle settles on each row's reading with a small overshoot.
  const settle = (u: number) =>
    u <= 0 ? 0 : 1 - Math.cos(u * 9) * (1 - u) ** 2;
  const reading =
    t < MEASURE[1]
      ? readA * settle(clamp01((t - MEASURE[0]) / SLIDE))
      : t < PARK
        ? lerp(readA, readB, settle(clamp01((t - MEASURE[1]) / SLIDE)))
        : readB * (1 - home);
  return { y, reading };
}

export function ReviseBench() {
  const dark = useDarkTheme();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Insert the figure once, outside React's rendering, so a theme change never
    // replaces the nodes the animation is moving.
    root.innerHTML = benchHtml;
    const stage = root.querySelector<HTMLElement>('.iso-stage')!;
    const readout = root.querySelector<HTMLElement>('[data-readout]')!;
    const sorts = [...root.querySelectorAll<SVGGElement>('[data-sort]')].sort(
      (a, b) => Number(a.dataset.sort) - Number(b.dataset.sort),
    );
    const layers = Object.fromEntries(
      [...root.querySelectorAll<SVGGElement>('[data-layer]')].map((el) => [
        el.dataset.layer,
        el,
      ]),
    ) as Record<Layer, SVGGElement>;
    const bridge = root.querySelector<SVGGElement>('[data-bridge]')!;
    const needle = root.querySelector<SVGPathElement>('[data-needle]')!;
    const paper = root.querySelector<SVGGElement>('[data-paper]')!;
    const printed = root.querySelector<SVGPathElement>('[data-printed-clip]')!;
    const roller = root.querySelector<SVGGElement>('[data-roller]')!;
    const still = matchMedia('(prefers-reduced-motion: reduce)');

    // Keep each layer's sorts in text order, which is also back-to-front.
    const place = (el: SVGGElement, layer: SVGGElement) => {
      if (el.parentNode === layer) return;
      const index = Number(el.dataset.sort);
      const next = [...layer.children].find(
        (child) => Number((child as SVGGElement).dataset.sort) > index,
      );
      layer.insertBefore(el, next ?? null);
    };

    const path = (points: Point[]) =>
      `M${points
        .map((c) =>
          iso(c)
            .map((n) => n.toFixed(1))
            .join(' '),
        )
        .join('L')}`;

    function draw(t: number) {
      bench.sorts.forEach((sort, i) => {
        const el = sorts[i];
        const { pos, layer, lit, opacity } = sortAt(sort, ROW_INDEX[i], t);
        place(el, layers[layer]);
        const { after } = sort;
        el.setAttribute(
          'transform',
          shift([pos[0] - after[0], pos[1] - after[1], pos[2] - after[2]]),
        );
        el.firstElementChild?.toggleAttribute('data-lit', lit);
        const fade = opacity < 1 ? String(opacity) : '';
        if (el.style.opacity !== fade) el.style.opacity = fade;
      });

      const { y, reading } = bridgeAt(t);
      bridge.setAttribute('transform', shift([0, y, 0]));
      const { x, y: dy, z, r } = bench.dial;
      const angle = reading * RAD;
      needle.setAttribute(
        'd',
        path([
          [x, dy, z],
          [x + r * Math.sin(angle), dy - r * Math.cos(angle), z],
        ]),
      );

      const paperIn = clamp01((t - SAVE) / 0.4);
      const paperOut = clamp01((t - CLEAR) / FADE);
      paper.style.opacity = String(paperIn * (1 - paperOut));

      const roll = ease(clamp01((t - ROLL) / ROLL_TIME));
      const back = ease(clamp01((t - RETURN) / 1));
      roller.setAttribute(
        'transform',
        shift([
          0,
          lerp(bench.rollerRestY, bench.rollerEndY, roll * (1 - back)),
          0,
        ]),
      );
      const reach = Math.max(
        bench.paper.y0,
        lerp(bench.rollerRestY, bench.rollerEndY, roll),
      );
      const { x0, x1, y0, z: pz } = bench.paper;
      printed.setAttribute(
        'd',
        `${path([
          [x0, y0, pz],
          [x1, y0, pz],
          [x1, reach, pz],
          [x0, reach, pz],
        ])}Z`,
      );

      const text = readoutAt(t);
      if (readout.textContent !== text) readout.textContent = text;
    }

    let clock = still.matches ? SAVE - 0.1 : 0;
    let frame = 0;
    let last = 0;
    let paused = false;
    let visible = false;

    function tick(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 0;
      last = now;
      if (!paused) clock = (clock + dt) % LOOP;
      draw(clock);
      frame =
        visible && !paused && !still.matches ? requestAnimationFrame(tick) : 0;
    }
    const run = () => {
      if (!frame && visible && !paused && !still.matches) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };
    const jump = (to: number) => {
      clock = to;
      draw(clock);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        run();
      },
      { rootMargin: '120px 0px' },
    );
    observer.observe(stage);
    const onEnter = () => {
      paused = true;
    };
    const onLeave = () => {
      paused = false;
      run();
    };
    const onKey = (event: KeyboardEvent) => {
      const index = STAGES.filter((s) => s <= clock + 0.01).length - 1;
      if (event.key === 'ArrowRight')
        jump(STAGES[(index + 1) % STAGES.length] + 0.01);
      else if (event.key === 'ArrowLeft')
        jump(STAGES[(index - 1 + STAGES.length) % STAGES.length] + 0.01);
      else if (event.key === 'Home') jump(0);
      else return;
      event.preventDefault();
      paused = true;
    };
    stage.addEventListener('pointerenter', onEnter);
    stage.addEventListener('pointerleave', onLeave);
    stage.addEventListener('keydown', onKey);
    stage.addEventListener('blur', onLeave);
    draw(clock);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      stage.removeEventListener('pointerenter', onEnter);
      stage.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('keydown', onKey);
      stage.removeEventListener('blur', onLeave);
    };
  }, []);

  return (
    <div className="iso revise-bench" data-theme={dark ? 'dark' : 'light'}>
      <div ref={rootRef} />
    </div>
  );
}
