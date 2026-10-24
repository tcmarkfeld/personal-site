import { useEffect, useRef } from 'react';
import { useDarkTheme } from '@/lib/theme';
import { data, svg } from './hl7kit.gen';
import '@/lib/anatomy/iso.css';
import { setAttr, setOpacity } from '@/lib/anatomy/write';
import { animateInView } from '@/lib/frameLoop';

// Timeline, in seconds: one field every STEP, each in the air for FLY.
const FIRST = 0.6;
const STEP = 1.3;
const FLY = 1.1;
const CLEAR = [6.6, 7.2] as const;
const REFILL = [7.5, 8.1] as const;
const LOOP = 8.4;
// Reduced motion holds the third field mid-flight, two already placed.
const STILL = FIRST + STEP * 2 + FLY / 2;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => t * t * (3 - 2 * t);
const span = (t: number, [from, to]: readonly [number, number]) =>
  clamp01((t - from) / (to - from));

// How far a field has travelled, how high it rides, and how solid it is.
function chipAt(i: number, t: number) {
  if (t >= REFILL[0]) return { u: 0, arc: 0, opacity: span(t, REFILL) };
  const from = FIRST + i * STEP;
  const u = ease(span(t, [from, from + FLY]));
  return { u, arc: Math.sin(Math.PI * u), opacity: 1 - span(t, CLEAR) };
}

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
    const chips = [...root.querySelectorAll<SVGGElement>('[data-chip]')];

    function draw(t: number) {
      const [liftX, liftY] = data.lift;
      chips.forEach((el, i) => {
        const { u, arc, opacity } = chipAt(i, t);
        const [toX, toY] = data.chips[i];
        const x = toX * u + liftX * arc;
        const y = toY * u + liftY * arc;
        setAttr(el, 'transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
        el.firstElementChild!.toggleAttribute('data-lit', u > 0 && u < 1);
        setOpacity(el, opacity < 1 ? String(opacity) : '');
      });
    }

    let clock = 0;
    draw(clock);
    return animateInView(
      stage,
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
