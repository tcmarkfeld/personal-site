import { useEffect, useRef } from 'react';
import { useDarkTheme } from '@/lib/theme';
import { data, svg } from './revise.gen';
import '@/lib/anatomy/iso.css';
import { setAttr, setOpacity } from '@/lib/anatomy/write';
import { animateInView } from '@/lib/frameLoop';

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => t * t * (3 - 2 * t);
const screen = (x: number, y: number) =>
  [x * data.ux[0] + y * data.uy[0], x * data.ux[1] + y * data.uy[1]].map((n) =>
    n.toFixed(2),
  );

// Timeline, in seconds: rest, type, hold, undo, rest.
const TYPE_AT = 0.8;
const STEP = 0.24;
const UNDO_AT = 4.4;
const BACK = 0.14;
const LOOP = 6.8;
const STILL = 3;

// Characters typed by time t on a clock of one key per step, each key
// easing in over most of its step.
const keys = (t: number, step: number) => {
  const k = Math.max(0, t / step);
  const i = Math.floor(k);
  return Math.min(data.typed, i + ease(clamp01((k - i) / 0.7)));
};
const typedAt = (t: number) =>
  t < UNDO_AT ? keys(t - TYPE_AT, STEP) : data.typed - keys(t - UNDO_AT, BACK);

export function ReviseFigure() {
  const dark = useDarkTheme();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Insert the figure once, outside React's rendering, so a theme change never
    // replaces the nodes the animation is moving.
    root.innerHTML = svg;
    const typed = root.querySelector<SVGPathElement>('[data-typed]')!;
    const caret = root.querySelector<SVGPathElement>('[data-caret]')!;
    const words = data.words.map(
      ({ id }) => root.querySelector<SVGPathElement>(`[data-word="${id}"]`)!,
    );

    function draw(t: number) {
      const c = typedAt(t);
      // The caret sits in the space after the typed characters.
      const [dx, dy] = screen(c * data.ch + Math.min(c, 1) * 1.4, 0);
      setAttr(caret, 'transform', `translate(${dx} ${dy})`);
      const busy = c > 0 && c < data.typed;
      setOpacity(caret, busy || Math.floor(t * 2) % 2 === 0 ? '' : '0');
      const [sx, sy] = data.start;
      const [ex, ey] = screen(Math.max(0, c * data.ch - 0.6), 0);
      setAttr(typed, 'd', c > 0.4 ? `M${sx} ${sy}l${ex} ${ey}` : '');

      // Between two characters each word eases along its line; a word that
      // wraps fades out at the end of one line and in at the start of the next.
      const i = Math.min(Math.floor(c), data.typed - 1);
      const f = c - i;
      data.words.forEach(({ steps }, n) => {
        const [a, b] = [steps[i], steps[i + 1]];
        const wraps = a[1] !== b[1];
        const [x, y] = wraps
          ? f < 0.5
            ? a
            : b
          : [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
        const [wx, wy] = screen(x, y);
        setAttr(words[n], 'transform', `translate(${wx} ${wy})`);
        setOpacity(words[n], wraps ? Math.abs(1 - 2 * f).toFixed(2) : '');
      });
    }

    let clock = 0;
    draw(clock);
    return animateInView(
      root,
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
