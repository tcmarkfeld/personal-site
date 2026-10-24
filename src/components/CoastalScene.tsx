import { useEffect, useRef } from 'react';
import { animateInView } from '@/lib/frameLoop';
import type { Weather, WeatherEffect } from '@/lib/useStPeteWeather';

const cloudPaths = [
  'M380 350c15-23 41-28 65-16 8-35 55-48 81-18 28-14 60 0 63 23 34-10 64 0 76 20H380Z',
  'M730 210c25-25 47-22 65-13 8-39 57-51 89-18 25-12 60 0 65 23 27-8 57 0 74 21H730Z',
  'M900 380c22-20 42-19 59-10 7-32 48-39 69-15 29-20 63-9 73 17 30-10 50 0 62 17H900Z',
];

// A point on the painting (1536 × 1024) as a position in the frame. The frame
// has the painting's 3:2 shape, so this holds at every size and the hotspots
// sit in place from the first paint, without waiting on a measurement.
const at = (x: number, y: number) => ({
  left: `${(x / 1536) * 100}%`,
  top: `${(y / 1024) * 100}%`,
});

type SceneProps = {
  dark: boolean;
  effect: WeatherEffect;
  weather: Weather | null | undefined;
};

export function CoastalScene({ dark, effect, weather }: SceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frondRef = useRef<HTMLImageElement>(null);
  const timeRef = useRef(0);
  // When the weather changes after the scene is up (the live weather arriving,
  // say), it rolls in from this point in scene time instead of switching on.
  const shownEffectRef = useRef(effect);
  const fadeFromRef = useRef(-Infinity);

  // The frame leans toward the pointer while the painting inside drifts the
  // other way, so it reads as a window with depth behind it.
  useEffect(() => {
    const frame = sceneRef.current?.parentElement;
    if (!frame) return;
    const still = matchMedia('(prefers-reduced-motion: reduce), (hover: none)');
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;
    let raf = 0;

    function step() {
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      const settled =
        Math.abs(targetX - x) < 0.001 && Math.abs(targetY - y) < 0.001;
      if (settled) {
        x = targetX;
        y = targetY;
      }
      frame!.style.setProperty('--px', x.toFixed(4));
      frame!.style.setProperty('--py', y.toFixed(4));
      raf = settled ? 0 : requestAnimationFrame(step);
    }
    function aim(nextX: number, nextY: number) {
      targetX = nextX;
      targetY = nextY;
      if (!raf) raf = requestAnimationFrame(step);
    }
    const clamp = (n: number) => Math.max(-1, Math.min(1, n));
    function onMove(event: PointerEvent) {
      if (still.matches || event.pointerType === 'touch') return;
      const box = frame!.getBoundingClientRect();
      if (box.bottom < 0 || box.top > innerHeight) return;
      aim(
        clamp((event.clientX - (box.left + box.width / 2)) / (innerWidth / 2)),
        clamp((event.clientY - (box.top + box.height / 2)) / (innerHeight / 2)),
      );
    }
    const rest = () => aim(0, 0);

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', rest);
    still.addEventListener('change', rest);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', rest);
      still.removeEventListener('change', rest);
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    const frond = frondRef.current;
    if (!scene || !canvas || !frond) return;
    // Keep a static scene on Gecko, where scene compositing stalls interaction.
    const gecko = CSS.supports('-moz-appearance', 'none');
    if (!gecko) scene.dataset.motionMode = 'scene';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const clouds = cloudPaths.map((path) => new Path2D(path));
    const birds = new Path2D('M0 0q7-5 14 0 7-5 14 0m22-12q5-4 10 0 5-4 10 0');
    const palm = document.createElement('canvas');
    palm.width = 0;
    const wet = effect === 'rain' || effect === 'storm';
    if (effect !== shownEffectRef.current) {
      shownEffectRef.current = effect;
      fadeFromRef.current = timeRef.current;
    }
    let width = 0;
    let height = 0;
    let ratio = 1;
    let palmX = 0;
    let palmY = 0;
    let palmWidth = 0;
    let palmHeight = 0;
    // Rain particles: z is depth (0 far, 1 near) and drives size, speed, and
    // brightness; land is where the drop meets the water.
    type Drop = { x: number; y: number; z: number; land: number };
    type Ripple = { x: number; y: number; age: number; size: number };
    const drops: Drop[] = [];
    const ripples: Ripple[] = [];
    let lastTime = timeRef.current;
    let horizon = 0;
    let nextFlash = timeRef.current + 1.5 + Math.random() * 3;
    let flashStart = -10;
    let bolt: Path2D | null = null;

    // Gradients are built once rather than every frame. The cloud, fog and
    // lamp ones live in the painting's own coordinates, so they never change;
    // the sky and haze follow the frame's size and are rebuilt on resize.
    function linear(y0: number, y1: number, stops: [number, string][]) {
      const gradient = ctx!.createLinearGradient(0, y0, 0, y1);
      stops.forEach(([at, color]) => gradient.addColorStop(at, color));
      return gradient;
    }
    const storm = effect === 'storm';
    const fogColor = dark ? '#8d9dab' : '#f1efe8';
    const fogBands = [0, 1, 2].map((i) =>
      linear(440 + i * 60, 580 + i * 60, [
        [0, `${fogColor}00`],
        [0.5, `${fogColor}${dark ? '38' : '70'}`],
        [1, `${fogColor}00`],
      ]),
    );
    const lamp = ctx.createRadialGradient(1285, 432, 0, 1285, 432, 150);
    lamp.addColorStop(0, '#ffb25c');
    lamp.addColorStop(1, '#ffb25c00');
    let cloudAlpha = -1;
    let cloudFill: CanvasGradient | undefined;
    let sky: CanvasGradient | undefined;
    let haze: CanvasGradient | undefined;

    // Drops are reused: one that lands starts again above the frame.
    function place(drop: Drop, y: number) {
      drop.z = Math.random() ** 1.6;
      drop.x = Math.random() * (width + 120) - 60;
      drop.y = y;
      drop.land = horizon + (height - horizon) * (0.1 + drop.z * 0.9);
    }

    function seedDrops() {
      drops.length = 0;
      ripples.length = 0;
      if (!wet || !width) return;
      const density = effect === 'storm' ? 0.0013 : 0.0007;
      const count = Math.round(width * height * density);
      for (let i = 0; i < count; i++) {
        const drop = { x: 0, y: 0, z: 0, land: 0 };
        place(drop, Math.random() * height);
        drops.push(drop);
      }
    }

    // A jagged bolt from the top of the frame down toward the horizon.
    function makeBolt() {
      const path = new Path2D();
      let x = width * (0.12 + Math.random() * 0.5);
      let y = 0;
      path.moveTo(x, y);
      while (y < horizon) {
        y += 6 + Math.random() * 12;
        x += (Math.random() - 0.5) * 16;
        path.lineTo(x, y);
        if (Math.random() < 0.12) {
          let bx = x;
          let by = y;
          const lean = Math.random() < 0.5 ? -1 : 1;
          path.moveTo(bx, by);
          for (let i = 0; i < 4; i++) {
            bx += lean * (4 + Math.random() * 8);
            by += 5 + Math.random() * 8;
            path.lineTo(bx, by);
          }
          path.moveTo(x, y);
        }
      }
      return path;
    }

    // Two quick strikes, then an afterglow that fades out.
    function flashLevel(age: number) {
      if (age < 0) return 0;
      if (age < 0.08) return 1;
      if (age < 0.16) return 0.25;
      if (age < 0.26) return 0.85;
      return Math.max(0, 0.85 * Math.exp(-(age - 0.26) * 7));
    }

    // Match the painting's object-fit: cover crop.
    function layout() {
      const scale = Math.max(width / 1536, height / 1024);
      return {
        scale,
        x: (width - 1536 * scale) / 2,
        y: (height - 1024 * scale) / 2,
      };
    }

    function paint() {
      if (!ctx || !canvas || !scene || !width || gecko) return;
      const time = timeRef.current;
      const { scale, x: offsetX, y: offsetY } = layout();
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      ctx.save();
      ctx.translate(Math.sin(time / 30) * 45, 0);
      // How far the current weather has rolled in, eased over a few seconds.
      // A still scene never advances time, so it shows the weather outright.
      const rolled = Math.min(1, (time - fadeFromRef.current) / 3);
      const weatherIn = preference.matches
        ? 1
        : rolled * rolled * (3 - 2 * rolled);
      const heavy = effect === 'clear' ? 0 : weatherIn;
      const rain = wet ? weatherIn : 0;
      // Only changes while the weather rolls in.
      const cloud = (dark ? 6 + 14 * heavy : 24 + 56 * heavy) / 255;
      if (cloud !== cloudAlpha) {
        cloudAlpha = cloud;
        cloudFill = linear(170, 390, [
          [0, `rgba(255, 253, 240, ${cloud})`],
          [1, 'rgba(255, 253, 240, 0)'],
        ]);
      }
      ctx.fillStyle = cloudFill!;
      clouds.forEach((path) => ctx.fill(path));
      ctx.restore();
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#fff6d9';
      // Small reflections only; never resample the landscape or shoreline.
      for (let i = 0; i < 16; i++) {
        const x = 45 + ((i * 113) % 400);
        const y = 570 + ((i * 37) % 220);
        const span = 12 + (y - 555) * 0.1;
        ctx.globalAlpha =
          Math.max(0, Math.sin(time / (1.5 + (i % 3)) + i)) *
          (0.2 - 0.12 * rain);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + span / 2, y - 1.5, x + span, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (effect === 'fog') {
        // Low banks of fog drifting across the horizon.
        ctx.globalAlpha = weatherIn;
        for (let i = 0; i < 3; i++) {
          const drift = Math.sin(time / (18 + i * 6) + i) * 120;
          ctx.fillStyle = fogBands[i];
          ctx.fillRect(-200 + drift, 440 + i * 60, 1936, 140);
        }
        ctx.globalAlpha = 1;
      }
      if (dark) {
        // Lamplight in the observatory windows, flickering like it's lived in.
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha =
          0.16 + Math.sin(time * 1.3) * 0.04 + Math.sin(time * 3.7) * 0.02;
        ctx.fillStyle = lamp;
        ctx.fillRect(1135, 282, 300, 300);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      const delta = Math.min(0.1, Math.max(0, time - lastTime));
      lastTime = time;
      ctx.globalAlpha = rain;
      if (wet) {
        // Heavier cloud cover up high, thinning toward the water.
        ctx.fillStyle = sky!;
        ctx.fillRect(0, 0, width, height);
        // Rain haze sitting on the horizon.
        ctx.fillStyle = haze!;
        ctx.fillRect(0, horizon - 50, width, 90);
      }
      if (storm) {
        if (time >= nextFlash && delta > 0) {
          flashStart = time;
          bolt = makeBolt();
          nextFlash = time + 3.5 + Math.random() * 6;
        }
        const flash = flashLevel(time - flashStart);
        if (flash > 0.01) {
          const glow = ctx.createLinearGradient(0, 0, 0, height);
          glow.addColorStop(0, `rgba(214, 226, 255, ${0.55 * flash})`);
          glow.addColorStop(1, `rgba(214, 226, 255, ${0.12 * flash})`);
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, width, height);
          if (bolt && time - flashStart < 0.4) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, flash * 1.2) * rain;
            ctx.strokeStyle = '#f4f7ff';
            ctx.shadowColor = '#bcd0ff';
            ctx.shadowBlur = 14;
            ctx.lineWidth = 1.6;
            ctx.lineJoin = 'round';
            ctx.stroke(bolt);
            ctx.restore();
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.save();
      // Cross the frame high in the sky and wrap only offscreen.
      const birdScale = 0.7;
      const flockWidth = 70 * birdScale;
      const progress = (time / 30 + 0.25) % 1;
      ctx.translate(
        progress * (width + flockWidth * 2) - flockWidth,
        height * 0.16 + Math.sin(time / 3) * 2,
      );
      ctx.scale(birdScale, birdScale);
      ctx.strokeStyle = dark ? '#9eafa5' : '#355654';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1 - rain;
      ctx.stroke(birds);
      ctx.restore();
      if (palm.width) {
        ctx.save();
        ctx.translate(palmX + palmWidth, palmY + palmHeight * 0.15);
        // Blend toward the gusting sway rather than changing its pace, which
        // would jump the frond.
        const sway =
          Math.sin(time / 4) * 3 * (1 - rain) +
          Math.sin(time / (4 / 2.2)) * 6.6 * rain;
        ctx.rotate((sway * Math.PI) / 180);
        ctx.globalAlpha = 0.5;
        ctx.drawImage(
          palm,
          -palmWidth,
          -palmHeight * 0.15,
          palmWidth,
          palmHeight,
        );
        ctx.restore();
      }
      if (wet) {
        const wind =
          (storm ? 0.3 : 0.12) + Math.sin(time * 0.6) * (storm ? 0.1 : 0.04);
        const speedBoost = storm ? 1.3 : 1;
        // The rain thickens as it rolls in.
        const falling = Math.round(drops.length * rain);
        for (let index = 0; index < drops.length; index++) {
          const drop = drops[index];
          const speed = (320 + drop.z * 620) * speedBoost;
          drop.y += speed * delta;
          drop.x += speed * delta * wind;
          if (drop.y >= drop.land) {
            // Splash only on open water, left of the rocky point.
            if (
              index < falling &&
              drop.z > 0.35 &&
              drop.x < width * 0.6 &&
              ripples.length < 70
            ) {
              ripples.push({
                x: drop.x,
                y: drop.land,
                age: 0,
                size: 3 + drop.z * 7,
              });
            }
            place(drop, -20 - Math.random() * 60);
          }
        }
        // Batch drops into depth layers: far ones thin and faint, near ones
        // longer, brighter, and thicker.
        const color = dark ? '205, 218, 230' : '240, 245, 250';
        for (let layer = 0; layer < 3; layer++) {
          ctx.beginPath();
          ctx.lineWidth = 0.6 + layer * 0.45;
          ctx.strokeStyle = `rgba(${color}, ${0.16 + layer * 0.14})`;
          for (let index = 0; index < falling; index++) {
            const drop = drops[index];
            if (Math.min(2, Math.floor(drop.z * 3)) !== layer) continue;
            const length = (5 + drop.z * 16) * (storm ? 1.25 : 1);
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x - length * wind, drop.y - length);
          }
          ctx.stroke();
        }
        ctx.lineWidth = 0.8;
        for (let i = ripples.length - 1; i >= 0; i--) {
          const ripple = ripples[i];
          ripple.age += delta;
          const life = ripple.age / 0.45;
          if (life >= 1) {
            ripples.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = `rgba(${color}, ${0.4 * (1 - life)})`;
          ctx.beginPath();
          ctx.ellipse(
            ripple.x,
            ripple.y,
            ripple.size * (0.3 + life),
            ripple.size * (0.3 + life) * 0.3,
            0,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
      }
      if (scene.dataset.ready !== 'true') scene.dataset.ready = 'true';
    }

    function resize() {
      if (!scene || !canvas || !frond) return;
      const bounds = scene.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      if (!width || !height) return;
      // Bound raster work on Retina screens and large desktop windows.
      ratio = Math.min(devicePixelRatio, 1.25, 1440 / width, 1080 / height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const fit = layout();
      horizon = fit.y + 515 * fit.scale;
      if (wet) {
        sky = linear(0, height, [
          [0, storm ? '#0a1220d0' : '#1a2633a0'],
          [0.5, storm ? '#0a122080' : '#1a263350'],
          [1, storm ? '#0a122050' : '#1a263320'],
        ]);
        haze = linear(horizon - 50, horizon + 40, [
          [0, '#b8c4ce00'],
          [0.55, storm ? '#8f9eab55' : '#c3ccd455'],
          [1, '#b8c4ce00'],
        ]);
      }
      seedDrops();
      if (gecko) return;
      if (frond.naturalWidth) {
        const leaf = frond.getBoundingClientRect();
        palmX = leaf.left - bounds.left;
        palmY = leaf.top - bounds.top;
        palmWidth = leaf.width;
        palmHeight = leaf.height;
        palm.width = Math.min(640, Math.ceil(palmWidth * ratio));
        palm.height = Math.round(
          (palm.width * frond.naturalHeight) / frond.naturalWidth,
        );
        const cache = palm.getContext('2d');
        if (cache) {
          cache.filter = dark ? 'brightness(0.55) saturate(0.7)' : 'none';
          cache.drawImage(frond, 0, 0, palm.width, palm.height);
        }
      }
      paint();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(scene);
    frond.addEventListener('load', resize);
    resize();
    const stop = gecko
      ? undefined
      : animateInView(
          scene,
          (seconds) => {
            timeRef.current += seconds;
            paint();
          },
          paint,
        );
    return () => {
      stop?.();
      resizeObserver.disconnect();
      frond.removeEventListener('load', resize);
    };
  }, [dark, effect]);

  // The prerendered page can't know a stored theme, so it lets the system
  // setting pick the night painting; once mounted, the theme decides.
  const nightMedia =
    typeof document === 'undefined'
      ? '(prefers-color-scheme: dark)'
      : dark
        ? 'all'
        : 'not all';
  const sizes = 'min(580px, 100vw - 40px)';

  return (
    <>
      <div
        className="coastal-scene"
        ref={sceneRef}
        aria-hidden="true"
        data-effect={effect}
      >
        <picture>
          <source
            media={nightMedia}
            srcSet="/coastal-observatory-night-1024.webp 1024w, /coastal-observatory-night.webp 1536w"
            sizes={sizes}
          />
          <img
            className="coastal-painting"
            src="/coastal-observatory.webp"
            srcSet="/coastal-observatory-1024.webp 1024w, /coastal-observatory.webp 1536w"
            sizes={sizes}
            alt="Painting of a house on a rocky point over the water, framed by palm trees"
            fetchPriority="high"
          />
        </picture>
        <img
          className="coastal-frond"
          ref={frondRef}
          src="/coastal-frond.webp"
          srcSet="/coastal-frond-480.webp 480w, /coastal-frond.webp 900w"
          sizes="min(209px, 36vw - 14px)"
          alt=""
        />
        <div className="coastal-shade" />
        <canvas className="coastal-motion" ref={canvasRef} />
      </div>
      <div className="coastal-hotspots">
        <button
          className="hotspot"
          type="button"
          style={at(1272, 236)}
          aria-describedby="hotspot-station"
        >
          <span className="sr-only">Weather station</span>
          <span className="hotspot-card" id="hotspot-station" role="tooltip">
            {weather
              ? `St. Pete right now: ${weather.temperature}°F, ${weather.label}, wind ${weather.wind} mph.`
              : 'Weather station offline. Ironic, I know.'}
          </span>
        </button>
        <a className="hotspot" href="#hello" style={at(1300, 440)}>
          <span className="hotspot-card">Come on in →</span>
          <span className="sr-only">About me</span>
        </a>
      </div>
    </>
  );
}
