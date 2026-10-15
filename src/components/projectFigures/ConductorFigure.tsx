import { useEffect, useRef } from 'react';
import { useDarkTheme } from '@/lib/theme';
import { data, svg } from './conductor.gen';
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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => t * t * (3 - 2 * t);

// Timeline, in seconds.
const APPEAR = 0.8;
const LOWER = [0.8, 1.4];
const TRACE = [1.4, 6.4];
const RAISE = [6.4, 7];
const REMOVE = [7, 7.8];
const RETURN = [7, 8.6];
const LOOP = 9;
const STILL = 4; // the frame shown under reduced motion: halfway through a cut
const DROP = 3; // how far a key lifts as it leaves or arrives
const SPIN = 1.4; // the cutter's turn, in radians a second

const [START, END] = data.travel;
const BLADE = -data.keyX - END;

// The template's top edge under the stylus, relative to its uncut top.
function profileAt(u: number) {
  const points = data.profile;
  if (u <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [u1, z1] = points[i];
    if (u <= u1) {
      const [u0, z0] = points[i - 1];
      return lerp(z0, z1, (u - u0) / (u1 - u0));
    }
  }
  return points[points.length - 1][1];
}

// Where the carriage is, how high the head rides, and how far the blank is cut.
function poseAt(t: number) {
  const trace = ease(clamp01((t - TRACE[0]) / (TRACE[1] - TRACE[0])));
  const back = ease(clamp01((t - RETURN[0]) / (RETURN[1] - RETURN[0])));
  const x = t < RETURN[0] ? lerp(START, END, trace) : lerp(END, START, back);
  const u = -data.keyX - x;
  let head = profileAt(u);
  if (t < LOWER[0]) head = data.lift;
  else if (t < LOWER[1])
    head = lerp(data.lift, head, ease((t - LOWER[0]) / (LOWER[1] - LOWER[0])));
  else if (t >= RAISE[0])
    head = lerp(head, data.lift, ease(clamp01((t - RAISE[0]) / 0.6)));
  const cut = t < TRACE[0] ? 0 : t < TRACE[1] ? u : BLADE + 2;
  // The blank drops in at the start and lifts away, cut, at the end.
  const arrive = ease(clamp01(t / APPEAR));
  const leave = ease(clamp01((t - REMOVE[0]) / (REMOVE[1] - REMOVE[0])));
  return {
    x,
    u,
    head,
    cut,
    blankLift: (1 - arrive + leave) * DROP,
    blankOpacity: arrive * (1 - leave),
  };
}

export function ConductorFigure() {
  const dark = useDarkTheme();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Insert the figure once, outside React's rendering, so a theme change never
    // replaces the nodes the animation is moving.
    root.innerHTML = svg;
    const figure = root.querySelector<SVGSVGElement>('svg')!;
    const all = (selector: string) => [
      ...root.querySelectorAll<SVGElement>(selector),
    ];
    const carriage = all('[data-carriage]');
    const head = all('[data-head]');
    const blanks = all('[data-blank]');
    const [templateBehind, templateAhead] = [
      '#cd-template-behind',
      '#cd-template-ahead',
    ].map((id) => root.querySelector<SVGPathElement>(`${id} [data-split]`)!);
    const [blankCut, blankAhead] = ['#cd-blank-cut', '#cd-blank-ahead'].map(
      (id) => root.querySelector<SVGPathElement>(`${id} [data-split]`)!,
    );
    const teeth = root.querySelector<SVGPathElement>('[data-teeth]')!;
    const holes = root.querySelector<SVGGElement>('[data-holes]')!;
    holes.innerHTML = Array.from(
      { length: data.cutter.holes },
      () => '<circle r="0.9"/>',
    ).join('');
    const holeDots = [...holes.children] as SVGCircleElement[];
    const still = matchMedia('(prefers-reduced-motion: reduce)');

    // A point on the cutter: s along its arbor, r out from it, at angle a.
    const { y: cy, z: cz, r: R, s } = data.cutter;
    const onCutter = (sx: number, r: number, a: number): Point => [
      sx,
      cy + r * Math.cos(a),
      cz + r * Math.sin(a),
    ];
    const teethPath = (turn: number) => {
      let d = '';
      for (let n = 0; n < 36; n++) {
        const a = turn + (n / 36) * Math.PI * 2;
        // A gullet on the near face between each pair of teeth.
        const [g0, h0] = iso(onCutter(s[1], R - 1.8, a));
        const [g1, h1] = iso(onCutter(s[1], R, a));
        d += `M${g0.toFixed(1)} ${h0.toFixed(1)}L${g1.toFixed(1)} ${h1.toFixed(1)}`;
        // Only the teeth on the side of the rim that faces the viewer.
        if (sinA * cosE * Math.cos(a) + sinE * Math.sin(a) < 0.12) continue;
        const [x0, y0] = iso(onCutter(s[0], R, a));
        const [x1, y1] = iso(onCutter(s[1], R, a));
        d += `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`;
      }
      return d;
    };

    function draw(t: number, turn: number) {
      const pose = poseAt(t);
      const slide = shift([pose.x, 0, 0]);
      for (const el of carriage) el.setAttribute('transform', slide);
      const rise = shift([0, 0, pose.head]);
      for (const el of head) el.setAttribute('transform', rise);
      const stylus = shift([pose.u, 0, 0]);
      templateBehind.setAttribute('transform', stylus);
      templateAhead.setAttribute('transform', stylus);
      const cut = shift([pose.cut, 0, 0]);
      blankCut.setAttribute('transform', cut);
      blankAhead.setAttribute('transform', cut);
      const lift = shift([0, 0, pose.blankLift]);
      for (const el of blanks) {
        el.setAttribute('transform', lift);
        el.style.opacity =
          pose.blankOpacity < 1 ? String(pose.blankOpacity) : '';
      }
      teeth.setAttribute('d', teethPath(turn));
      holeDots.forEach((dot, n) => {
        const [x, y] = iso(
          onCutter(s[1], R * 0.56, turn + (n / holeDots.length) * Math.PI * 2),
        );
        dot.setAttribute('cx', x.toFixed(1));
        dot.setAttribute('cy', y.toFixed(1));
      });
    }

    let clock = 0;
    let turn = 0;
    let frame = 0;
    let last = 0;
    let visible = false;

    function tick(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 0;
      last = now;
      clock = (clock + dt) % LOOP;
      turn = (turn + dt * SPIN) % (Math.PI * 2);
      draw(clock, turn);
      frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
    }
    const run = () => {
      if (still.matches) {
        draw(STILL, 0);
        return;
      }
      if (!frame && visible) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        run();
      },
      { rootMargin: '120px 0px' },
    );
    observer.observe(figure);
    still.addEventListener('change', run);
    draw(still.matches ? STILL : clock, turn);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      still.removeEventListener('change', run);
    };
  }, []);

  return (
    <div className="iso project-figure" data-theme={dark ? 'dark' : 'light'}>
      <div ref={rootRef} />
    </div>
  );
}
