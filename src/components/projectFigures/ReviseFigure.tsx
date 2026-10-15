import { useEffect, useRef } from 'react';
import { useDarkTheme } from '@/lib/theme';
import { data, svg } from './revise.gen';
import '@/lib/anatomy/iso.css';

type Point = readonly [number, number, number];

// The kit's camera (scripts/anatomy/kit/iso-kit.mjs), for moving parts live.
const UNIT = Math.sqrt(1.6);
const RAD = Math.PI / 180;
const { origin, scale, azimuth, elevation } = data.P;
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
// Toward the viewer, for which of the ball's characters face us.
const VIEW: Point = [cosA * cosE, sinA * cosE, sinE];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => t * t * (3 - 2 * t);
const ramp = (t: number, from: number, time: number) =>
  ease(clamp01((t - from) / time));

// Timeline, in seconds. Typing runs on its own clock so the backspace can
// play it in reverse.
const OUT = 0.6;
const TRAVEL = 1.3;
const FIRST = 2.2;
const STEP = 0.42;
const SHIFT = 0.24;
const REFLOW = 0.9;
const TYPED_END = FIRST + (data.typed - 1) * STEP + REFLOW;
const BACK = 6;
const BACK_SPEED = 2;
const HOME = BACK + (TYPED_END - FIRST + 0.4) / BACK_SPEED + 0.15;
const LOOP = HOME + TRAVEL + 0.6;
const STILL = 5.6;
const STRIKES = Array.from({ length: data.typed }, (_, i) => FIRST + i * STEP);

// The typing at time t on its own clock: characters struck, how far the
// carriage has advanced, the ball's turn and dip, and each word's offset.
function typingAt(t: number, striking: boolean) {
  let struck = 0;
  let advance = 0;
  let turn = 0;
  let dip = 0;
  STRIKES.forEach((s) => {
    if (t >= s + 0.05) struck++;
    advance += ramp(t, s + 0.08, SHIFT);
    turn += ramp(t, s - 0.34, SHIFT);
    const u = (t - s + 0.02) / 0.16;
    if (striking && u > 0 && u < 1) dip += Math.sin(Math.PI * u);
  });
  const words = data.words.map(({ steps, slow }) => {
    let [x, y] = steps[0];
    STRIKES.forEach((s, i) => {
      const e = ramp(t, s - 0.22, slow[i] ? REFLOW : SHIFT);
      x += (steps[i + 1][0] - steps[i][0]) * e;
      y += (steps[i + 1][1] - steps[i][1]) * e;
    });
    return [x, y] as const;
  });
  return { struck, advance, turn, dip, words };
}

function frameAt(t: number) {
  if (t < BACK) {
    const typing = typingAt(t, true);
    const x =
      t < FIRST - 0.3
        ? lerp(data.park, data.start, ramp(t, OUT, TRAVEL))
        : data.start + data.ch * typing.advance;
    return { ...typing, x };
  }
  const typing = typingAt(TYPED_END - (t - BACK) * BACK_SPEED, false);
  const x =
    t < HOME
      ? data.start + data.ch * typing.advance
      : lerp(data.start, data.park, ramp(t, HOME, TRAVEL));
  return { ...typing, x };
}

export function ReviseFigure() {
  const dark = useDarkTheme();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Insert the figure once, outside React's rendering, so a theme change never
    // replaces the nodes the animation is moving.
    root.innerHTML = svg;
    const carriage = root.querySelector<SVGGElement>('[data-carriage]')!;
    const rod = root.querySelector<SVGGElement>('[data-rod]')!;
    const ball = root.querySelector<SVGGElement>('[data-ball]')!;
    const dots = [...ball.querySelectorAll<SVGCircleElement>('circle')];
    const typed = root.querySelector<SVGPathElement>('[data-typed]')!;
    const words = data.words.map(
      ({ id }) => root.querySelector<SVGPathElement>(`[data-word="${id}"]`)!,
    );
    const still = matchMedia('(prefers-reduced-motion: reduce)');

    // The ball's characters, turned with it and faded toward its limb.
    const { y: by, z: bz, r: br, rows } = data.ball;
    function turnBall(turn: number) {
      let n = 0;
      for (const [s, count] of rows) {
        const r = Math.sqrt(br ** 2 - s ** 2);
        for (let i = 0; i < count; i++) {
          const a = turn + (i / count) * Math.PI * 2 + s * 0.3;
          const nx = r * Math.cos(a);
          const ny = r * Math.sin(a);
          const facing = (nx * VIEW[0] + ny * VIEW[1] + s * VIEW[2]) / br;
          const [cx, cy] = iso([nx, by + ny, bz + s]);
          const dot = dots[n++];
          dot.setAttribute('cx', cx.toFixed(1));
          dot.setAttribute('cy', cy.toFixed(1));
          dot.setAttribute(
            'fill-opacity',
            ease(clamp01((facing - 0.08) / 0.4)).toFixed(2),
          );
        }
      }
    }

    function draw(t: number) {
      const frame = frameAt(t);
      const at = shift([frame.x, 0, 0]);
      carriage.setAttribute('transform', at);
      rod.setAttribute('transform', at);
      ball.setAttribute('transform', shift([0, 0, -1.1 * frame.dip]));
      turnBall(frame.turn * 1.3);
      frame.words.forEach(([x, y], i) =>
        words[i].setAttribute('transform', shift([x, y, 0])),
      );
      const { x, y, z } = data.line;
      const end = x + frame.struck * data.ch;
      typed.setAttribute(
        'd',
        frame.struck
          ? `M${iso([x + 0.3, y, z]).join(' ')}L${iso([end - 0.3, y, z]).join(' ')}`
          : '',
      );
    }

    let clock = still.matches ? STILL : 0;
    let frame = 0;
    let last = 0;
    let visible = false;

    function tick(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 0;
      last = now;
      clock = (clock + dt) % LOOP;
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
    observer.observe(root);
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
