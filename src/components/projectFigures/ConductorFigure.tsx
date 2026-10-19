import { useEffect, useRef } from 'react';
import { useDarkTheme } from '@/lib/theme';
import { data, svg } from './conductor.gen';
import '@/lib/anatomy/iso.css';

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => t * t * (3 - 2 * t);
const ramp = (t: number, from: number, time: number) =>
  ease(clamp01((t - from) / time));
const during = (t: number, from: number, time: number) =>
  t >= from && t < from + time;

// Timeline, in seconds. Each entry lights, sends its chip, then fills its row,
// so exactly one part is lit at a time.
const FIRST = 0.5;
const STEP = 2.1;
const LIGHT = 0.6;
const FLIGHT = 0.9;
const FILL = 0.6;
const CLEAR = 8;
const FADE = 0.6;
const LOOP = 9;
const STILL = 7.2; // every row filled, nothing lit

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
    const parts = data.from.map((_, i) => ({
      entry: [
        ...root.querySelectorAll(`[data-entry="${i}"] .iso-solid`),
      ] as SVGElement[],
      chip: root.querySelector<SVGGElement>(`[data-chip="${i}"]`)!,
      fill: root.querySelector<SVGPathElement>(`[data-fill="${i}"]`)!,
    }));
    const still = matchMedia('(prefers-reduced-motion: reduce)');

    function draw(t: number) {
      const shown = 1 - ramp(t, CLEAR, FADE);
      parts.forEach(({ entry, chip, fill }, i) => {
        const start = FIRST + i * STEP;
        const fly = start + LIGHT;
        const land = fly + FLIGHT;
        for (const el of entry)
          el.toggleAttribute('data-lit', during(t, start, LIGHT));

        const p = ramp(t, fly, FLIGHT);
        const lift = Math.sin(Math.PI * p) * data.arc;
        const [fx, fy] = data.from[i];
        const x = fx * (1 - p) + data.rise[0] * lift;
        const y = fy * (1 - p) + data.rise[1] * lift;
        chip.setAttribute(
          'transform',
          `translate(${x.toFixed(2)} ${y.toFixed(2)})`,
        );
        chip.style.opacity = String(ramp(t, fly - 0.1, 0.1) * shown);
        chip.firstElementChild!.toggleAttribute(
          'data-lit',
          during(t, fly, FLIGHT),
        );

        fill.setAttribute('stroke-dashoffset', String(1 - ramp(t, land, FILL)));
        fill.setAttribute('data-tone', during(t, land, FILL) ? 'lit' : 'hi');
        fill.style.opacity = String(shown);
      });
    }

    let clock = 0;
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
      if (still.matches) {
        draw(STILL);
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
    draw(still.matches ? STILL : clock);
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
