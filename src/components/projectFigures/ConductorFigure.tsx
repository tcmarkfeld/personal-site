import { useEffect, useRef } from 'react';
import { useDarkTheme } from '@/lib/theme';
import { data, svg } from './conductor.gen';
import '@/lib/anatomy/iso.css';
import { setAttr, setOpacity } from '@/lib/anatomy/write';
import { animateInView } from '@/lib/frameLoop';

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
        setAttr(
          chip,
          'transform',
          `translate(${x.toFixed(2)} ${y.toFixed(2)})`,
        );
        setOpacity(chip, String(ramp(t, fly - 0.1, 0.1) * shown));
        chip.firstElementChild!.toggleAttribute(
          'data-lit',
          during(t, fly, FLIGHT),
        );

        setAttr(fill, 'stroke-dashoffset', String(1 - ramp(t, land, FILL)));
        setAttr(fill, 'data-tone', during(t, land, FILL) ? 'lit' : 'hi');
        setOpacity(fill, String(shown));
      });
    }

    let clock = 0;
    draw(clock);
    return animateInView(
      figure,
      (seconds) => {
        clock = (clock + seconds) % LOOP;
        draw(clock);
      },
      () => draw(STILL),
    );
  }, []);

  return (
    <div className="iso project-figure" data-theme={dark ? 'dark' : 'light'}>
      <div ref={rootRef} />
    </div>
  );
}
