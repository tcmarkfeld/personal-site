// One clock for everything on the page that moves, at 30 frames a second.
// Every animation draws on the same frame, so the browser restyles, paints and
// composites once per tick instead of once per animation per display refresh,
// and a timer sleeps between ticks rather than waking on every 60 or 120 Hz
// frame just to skip it.
type Step = (seconds: number) => void;

const INTERVAL = 1000 / 30;
// Wake a little early so the tick lands on the next display frame after the
// interval, at any common refresh rate.
const SLACK = 6;

const steps = new Set<Step>();
let frame = 0;
let timer = 0;
let last = 0;

function tick(now: number) {
  frame = 0;
  // Capped, so a long pause (a hidden tab, a busy main thread) never jumps.
  const seconds = last ? Math.min((now - last) / 1000, 0.1) : 0;
  last = now;
  steps.forEach((step) => step(seconds));
  if (steps.size)
    timer = window.setTimeout(() => {
      timer = 0;
      frame = requestAnimationFrame(tick);
    }, INTERVAL - SLACK);
}

// Calls step on every tick with the seconds since the one before, until the
// returned function is called.
export function onFrame(step: Step) {
  steps.add(step);
  if (!frame && !timer) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
  return () => {
    steps.delete(step);
    if (steps.size) return;
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    frame = timer = 0;
  };
}

// Runs step on the shared clock while el is on screen and motion is allowed.
// With reduced motion, still is called instead, straight away and whenever
// the preference changes. Returns the cleanup.
export function animateInView(el: Element, step: Step, still?: () => void) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let stop: (() => void) | undefined;

  function update() {
    stop?.();
    stop = undefined;
    if (reduce.matches) still?.();
    else if (visible) stop = onFrame(step);
  }
  const observer = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    update();
  });
  observer.observe(el);
  reduce.addEventListener('change', update);
  update();
  return () => {
    stop?.();
    observer.disconnect();
    reduce.removeEventListener('change', update);
  };
}
