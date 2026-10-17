import { useEffect, useRef } from 'react';
import type { Weather, WeatherEffect } from '@/lib/useStPeteWeather';

const cloudPaths = [
  'M380 350c15-23 41-28 65-16 8-35 55-48 81-18 28-14 60 0 63 23 34-10 64 0 76 20H380Z',
  'M730 210c25-25 47-22 65-13 8-39 57-51 89-18 25-12 60 0 65 23 27-8 57 0 74 21H730Z',
  'M900 380c22-20 42-19 59-10 7-32 48-39 69-15 29-20 63-9 73 17 30-10 50 0 62 17H900Z',
];

type SceneProps = {
  dark: boolean;
  effect: WeatherEffect;
  weather: Weather | null | undefined;
  // True while the live weather is still loading.
  pending: boolean;
};

export function CoastalScene({ dark, effect, weather, pending }: SceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frondRef = useRef<HTMLImageElement>(null);
  const hotspotsRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const paintRef = useRef<HTMLCanvasElement>(null);
  const pendingRef = useRef(pending);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  // The scene paints itself in once per visit: a washed-out underpainting
  // waits while the weather loads, then brush strokes wipe it away to show
  // the finished scene with the right weather already in it.
  useEffect(() => {
    const paint = paintRef.current;
    const scene = sceneRef.current;
    const art = scene?.querySelector<HTMLImageElement>('.coastal-painting');
    const ctx = paint?.getContext('2d');
    if (!paint || !scene || !art || !ctx) return;
    if (getComputedStyle(paint).display === 'none') return;
    const ratio = Math.min(devicePixelRatio, 1.5);
    const width = (paint.width = Math.round(scene.clientWidth * ratio));
    const height = (paint.height = Math.round(scene.clientHeight * ratio));
    const paper = getComputedStyle(scene).getPropertyValue('--bg').trim();
    const begun = performance.now();
    let frame = 0;
    let underpainted = false;
    let revealAt = 0;

    function underpaint() {
      // Drawn tiny and scaled up for a soft blur, then greyed and washed out.
      const cover = Math.max(
        width / art!.naturalWidth,
        height / art!.naturalHeight,
      );
      const small = document.createElement('canvas');
      small.width = Math.max(1, Math.round(width / 14));
      small.height = Math.max(1, Math.round(height / 14));
      const tiny = small.getContext('2d')!;
      tiny.drawImage(
        art!,
        (small.width - (art!.naturalWidth * cover) / 14) / 2,
        (small.height - (art!.naturalHeight * cover) / 14) / 2,
        (art!.naturalWidth * cover) / 14,
        (art!.naturalHeight * cover) / 14,
      );
      ctx!.imageSmoothingQuality = 'high';
      ctx!.drawImage(small, 0, 0, width, height);
      ctx!.globalCompositeOperation = 'saturation';
      ctx!.fillStyle = '#808080';
      ctx!.fillRect(0, 0, width, height);
      ctx!.globalCompositeOperation = 'source-over';
      ctx!.globalAlpha = 0.4;
      ctx!.fillStyle = paper;
      ctx!.fillRect(0, 0, width, height);
      ctx!.globalAlpha = 1;
      underpainted = true;
    }

    // A seeded random, so every visit is painted with the same strokes.
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const between = (low: number, high: number) =>
      low + random() * (high - low);

    // Broad rows blocking in the canvas, then a few long diagonal sweeps that
    // pick up whatever the rows missed.
    const rows = 7;
    const brush = (height / rows) * 1.9;
    type Stroke = {
      start: number;
      length: number;
      from: [number, number];
      to: [number, number];
      bend: number;
      phase: number;
      size: number;
      bristles: { offset: number; size: number; alpha: number; end: number }[];
      drawn: number;
      dabbed: boolean;
    };
    const stroke = (
      start: number,
      from: [number, number],
      to: [number, number],
      size: number,
    ): Stroke => ({
      start,
      length: between(0.5, 0.7),
      from,
      to,
      bend: between(-0.09, 0.09) * height,
      phase: between(0, Math.PI * 2),
      size,
      // A solid core, then bristles across the brush's width that thin out
      // toward its edges and each run out of paint at their own point, so the
      // stroke trails off in dry streaks.
      bristles: [
        { offset: 0, size: 0.5, alpha: 1, end: 0.9 },
        ...Array.from({ length: 16 }, () => {
          const offset = between(-0.5, 0.5);
          const edge = Math.abs(offset) * 2;
          return {
            offset,
            size: between(0.05, 0.17) * (1 - edge * 0.5),
            alpha: between(0.55, 1) * (1 - edge * 0.35),
            end: between(0.72, 1) - edge * 0.12,
          };
        }),
      ],
      drawn: 0,
      dabbed: false,
    });
    const strokes: Stroke[] = [
      ...Array.from({ length: rows }, (_, row) => {
        const y = ((row + 0.5) / rows) * height + between(-0.1, 0.1) * brush;
        const tilt = between(-0.06, 0.06) * height;
        // Each stroke lands well outside the frame, so its narrow start is
        // mostly out of view, and lifts off just past the far edge.
        const left = (reach: number): [number, number] => [
          -brush * reach,
          y - tilt,
        ];
        const right = (reach: number): [number, number] => [
          width + brush * reach,
          y + tilt,
        ];
        return stroke(
          row * 0.075 + between(0, 0.05),
          row % 2 ? right(1.3) : left(1.3),
          row % 2 ? left(0.7) : right(0.7),
          brush * between(0.95, 1.1),
        );
      }),
      ...[0.15, 0.5, 0.85].map((at, n) =>
        stroke(
          0.45 + n * 0.1,
          [width * (at - 0.35), -brush * 1.2],
          [width * (at + 0.25), height + brush * 0.5],
          brush * 1.25,
        ),
      ),
    ];

    const pointAt = (s: Stroke, u: number): [number, number] => [
      s.from[0] + (s.to[0] - s.from[0]) * u,
      s.from[1] +
        (s.to[1] - s.from[1]) * u +
        Math.sin(u * Math.PI) * s.bend +
        Math.sin(u * 7 + s.phase) * s.size * 0.05,
    ];
    // The brush presses in, carries, then lifts: narrow at both ends.
    const pressure = (u: number) => 0.4 + 0.6 * Math.sin(Math.PI * u) ** 0.45;
    const STEP = 0.012;

    function wipe(elapsed: number) {
      ctx!.globalCompositeOperation = 'destination-out';
      ctx!.lineCap = 'round';
      ctx!.fillStyle = '#000';
      ctx!.strokeStyle = '#000';
      let done = true;
      strokes.forEach((s) => {
        const raw = Math.min(1, Math.max(0, (elapsed - s.start) / s.length));
        const t = 1 - (1 - raw) ** 3;
        if (raw < 1) done = false;
        for (let u0 = s.drawn; u0 < t; u0 += STEP) {
          const u1 = Math.min(t, u0 + STEP);
          const [x0, y0] = pointAt(s, u0);
          const [x1, y1] = pointAt(s, u1);
          const length = Math.hypot(x1 - x0, y1 - y0) || 1;
          const nx = -(y1 - y0) / length;
          const ny = (x1 - x0) / length;
          const press = pressure((u0 + u1) / 2);
          s.bristles.forEach((bristle) => {
            if (u0 > bristle.end) return;
            // Each bristle thins as it runs out of paint.
            const left = Math.min(1, (bristle.end - u0) / 0.15);
            const spread = bristle.offset * s.size * press;
            ctx!.globalAlpha = bristle.alpha;
            ctx!.lineWidth = Math.max(
              1,
              s.size * bristle.size * press * (0.35 + 0.65 * left),
            );
            ctx!.beginPath();
            ctx!.moveTo(x0 + nx * spread, y0 + ny * spread);
            ctx!.lineTo(x1 + nx * spread, y1 + ny * spread);
            ctx!.stroke();
          });
        }
        s.drawn = Math.max(s.drawn, t);
        // A few flecks where the brush lifts off.
        if (raw >= 1 && !s.dabbed) {
          s.dabbed = true;
          const [x, y] = pointAt(s, 1);
          for (let n = 0; n < 6; n++) {
            ctx!.globalAlpha = between(0.5, 0.9);
            ctx!.beginPath();
            ctx!.arc(
              x + between(-0.6, 0.6) * s.size,
              y + between(-0.6, 0.6) * s.size,
              s.size * between(0.02, 0.07),
              0,
              Math.PI * 2,
            );
            ctx!.fill();
          }
        }
      });
      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = 'source-over';
      return done;
    }

    function tick(now: number) {
      if (!underpainted && art!.complete && art!.naturalWidth) {
        underpaint();
        paint!.dataset.state = 'waiting';
      }
      // Wait for the weather, but never more than three seconds.
      if (
        underpainted &&
        !revealAt &&
        (!pendingRef.current || now - begun > 3000)
      ) {
        revealAt = now;
        paint!.dataset.state = 'painting';
      }
      if (revealAt && wipe((now - revealAt) / 1000)) {
        paint!.dataset.state = 'done';
        return;
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

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
    const hotspots = hotspotsRef.current;
    if (!scene || !canvas || !frond || !hotspots) return;
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
    let timer: number | undefined;
    let inView = false;
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

    function spawnDrop(y: number): Drop {
      const z = Math.random() ** 1.6;
      return {
        x: Math.random() * (width + 120) - 60,
        y,
        z,
        land: horizon + (height - horizon) * (0.1 + z * 0.9),
      };
    }

    function seedDrops() {
      drops.length = 0;
      ripples.length = 0;
      if (!wet || !width) return;
      const density = effect === 'storm' ? 0.0013 : 0.0007;
      const count = Math.round(width * height * density);
      for (let i = 0; i < count; i++) {
        drops.push(spawnDrop(Math.random() * height));
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
      const heavy = effect !== 'clear';
      const gradient = ctx.createLinearGradient(0, 170, 0, 390);
      gradient.addColorStop(
        0,
        dark
          ? heavy
            ? '#fffdf014'
            : '#fffdf006'
          : heavy
            ? '#fffdf050'
            : '#fffdf018',
      );
      gradient.addColorStop(1, '#fffdf000');
      ctx.fillStyle = gradient;
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
          (wet ? 0.08 : 0.2);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + span / 2, y - 1.5, x + span, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (effect === 'fog') {
        // Low banks of fog drifting across the horizon.
        for (let i = 0; i < 3; i++) {
          const drift = Math.sin(time / (18 + i * 6) + i) * 120;
          const top = 440 + i * 60;
          const band = ctx.createLinearGradient(0, top, 0, top + 140);
          const color = dark ? '#8d9dab' : '#f1efe8';
          band.addColorStop(0, `${color}00`);
          band.addColorStop(0.5, `${color}${dark ? '38' : '70'}`);
          band.addColorStop(1, `${color}00`);
          ctx.fillStyle = band;
          ctx.fillRect(-200 + drift, top, 1936, 140);
        }
      }
      if (dark) {
        // Lamplight in the observatory windows, flickering like it's lived in.
        const glow = ctx.createRadialGradient(1285, 432, 0, 1285, 432, 150);
        glow.addColorStop(0, '#ffb25c');
        glow.addColorStop(1, '#ffb25c00');
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha =
          0.16 + Math.sin(time * 1.3) * 0.04 + Math.sin(time * 3.7) * 0.02;
        ctx.fillStyle = glow;
        ctx.fillRect(1135, 282, 300, 300);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      const storm = effect === 'storm';
      const delta = Math.min(0.1, Math.max(0, time - lastTime));
      lastTime = time;
      if (wet) {
        // Heavier cloud cover up high, thinning toward the water.
        const sky = ctx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, storm ? '#0a1220d0' : '#1a2633a0');
        sky.addColorStop(0.5, storm ? '#0a122080' : '#1a263350');
        sky.addColorStop(1, storm ? '#0a122050' : '#1a263320');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);
        // Rain haze sitting on the horizon.
        const haze = ctx.createLinearGradient(0, horizon - 50, 0, horizon + 40);
        haze.addColorStop(0, '#b8c4ce00');
        haze.addColorStop(0.55, storm ? '#8f9eab55' : '#c3ccd455');
        haze.addColorStop(1, '#b8c4ce00');
        ctx.fillStyle = haze;
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
            ctx.globalAlpha = Math.min(1, flash * 1.2);
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
      if (!wet) ctx.stroke(birds);
      ctx.restore();
      if (palm.width) {
        ctx.save();
        ctx.translate(palmX + palmWidth, palmY + palmHeight * 0.15);
        const gust = wet ? 2.2 : 1;
        ctx.rotate((Math.sin(time / (4 / gust)) * 3 * gust * Math.PI) / 180);
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
        for (const drop of drops) {
          const speed = (320 + drop.z * 620) * speedBoost;
          drop.y += speed * delta;
          drop.x += speed * delta * wind;
          if (drop.y >= drop.land) {
            // Splash only on open water, left of the rocky point.
            if (drop.z > 0.35 && drop.x < width * 0.6 && ripples.length < 70) {
              ripples.push({
                x: drop.x,
                y: drop.land,
                age: 0,
                size: 3 + drop.z * 7,
              });
            }
            Object.assign(drop, spawnDrop(-20 - Math.random() * 60));
          }
        }
        // Batch drops into depth layers: far ones thin and faint, near ones
        // longer, brighter, and thicker.
        const color = dark ? '205, 218, 230' : '240, 245, 250';
        for (let layer = 0; layer < 3; layer++) {
          ctx.beginPath();
          ctx.lineWidth = 0.6 + layer * 0.45;
          ctx.strokeStyle = `rgba(${color}, ${0.16 + layer * 0.14})`;
          for (const drop of drops) {
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

    function tick() {
      timeRef.current += 1 / 24;
      paint();
      timer = window.setTimeout(tick, Math.ceil(1000 / 24));
    }

    function updateMotion() {
      window.clearTimeout(timer);
      const active =
        inView && !gecko && !document.hidden && !preference.matches;
      scene!.dataset.active = String(active);
      if (!active) return;
      // A timer avoids waking on every 60/120 Hz display frame.
      timer = window.setTimeout(tick, Math.ceil(1000 / 24));
    }

    function placeHotspots() {
      const { scale, x, y } = layout();
      hotspots!.querySelectorAll<HTMLElement>('[data-x]').forEach((spot) => {
        const left = x + Number(spot.dataset.x) * scale;
        const top = y + Number(spot.dataset.y) * scale;
        spot.style.left = `${left}px`;
        spot.style.top = `${top}px`;
        spot.hidden = left < 16 || left > width - 16 || top > height - 16;
      });
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
      placeHotspots();
      const fit = layout();
      horizon = fit.y + 515 * fit.scale;
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

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateMotion();
    });
    const resizeObserver = new ResizeObserver(resize);
    observer.observe(scene);
    resizeObserver.observe(scene);
    frond.addEventListener('load', resize);
    document.addEventListener('visibilitychange', updateMotion);
    preference.addEventListener('change', updateMotion);
    resize();
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      resizeObserver.disconnect();
      frond.removeEventListener('load', resize);
      document.removeEventListener('visibilitychange', updateMotion);
      preference.removeEventListener('change', updateMotion);
    };
  }, [dark, effect]);

  return (
    <>
      <div
        className="coastal-scene"
        ref={sceneRef}
        aria-hidden="true"
        data-effect={effect}
      >
        <img
          className="coastal-painting"
          src={
            dark
              ? '/coastal-observatory-night.webp'
              : '/coastal-observatory.webp'
          }
          alt="Painting of a house on a rocky point over the water, framed by palm trees"
          fetchPriority="high"
        />
        <img
          className="coastal-frond"
          ref={frondRef}
          src="/coastal-frond.webp"
          alt=""
        />
        <div className="coastal-shade" />
        <canvas className="coastal-motion" ref={canvasRef} />
        <canvas className="coastal-paint" ref={paintRef} />
      </div>
      <div className="coastal-hotspots" ref={hotspotsRef}>
        <button
          className="hotspot"
          type="button"
          data-x="1272"
          data-y="236"
          aria-describedby="hotspot-station"
        >
          <span className="sr-only">Weather station</span>
          <span className="hotspot-card" id="hotspot-station" role="tooltip">
            {weather
              ? `St. Pete right now: ${weather.temperature}°F, ${weather.label}, wind ${weather.wind} mph.`
              : 'Weather station offline. Ironic, I know.'}
          </span>
        </button>
        <a className="hotspot" href="#hello" data-x="1300" data-y="440">
          <span className="hotspot-card">Come on in →</span>
          <span className="sr-only">About me</span>
        </a>
      </div>
    </>
  );
}
