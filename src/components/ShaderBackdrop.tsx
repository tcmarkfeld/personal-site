import { useEffect, useRef } from 'react';

type Rgb = readonly [number, number, number];

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// Big blurred blocks of colour, light and cool at the top running down to
// warm and dark at the bottom, a fine white line pattern over them, and a
// layer of one-pixel grain that breaks up banding and reads like paper.
const FRAGMENT = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec2 uSize;
uniform float uTime;
uniform vec2 uPointer;
uniform float uHover;
uniform float uPattern;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform vec3 uC4;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    amp *= 0.5;
  }
  return sum;
}
// A hairline along every whole step of f, a pixel wide at any scale.
float lines(float f) {
  float d = abs(fract(f - 0.5) - 0.5) / max(fwidth(f), 1e-4);
  return 1.0 - min(d, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 c = (uv - 0.5) * vec2(uSize.x / uSize.y, 1.0);
  vec2 toPointer = uPointer - uv;
  float near = exp(-dot(toPointer, toPointer) * 6.0);
  float t = uTime * 0.03;

  // Top to bottom through the five colours, pushed around by soft noise so
  // they sit as blocks rather than bands.
  float g = 1.0 - uv.y;
  g += (fbm(c * 0.85 + vec2(t, -t * 0.7)) - 0.5) * 1.1;
  g += (noise(c * 1.6 - vec2(t * 0.8, 3.1)) - 0.5) * 0.35;
  g = clamp(g - near * uHover * 0.12, 0.0, 1.0);
  vec3 color = mix(uC0, uC1, smoothstep(0.0, 0.25, g));
  color = mix(color, uC2, smoothstep(0.25, 0.5, g));
  color = mix(color, uC3, smoothstep(0.5, 0.75, g));
  color = mix(color, uC4, smoothstep(0.75, 1.0, g));

  float line = 0.0;
  if (uPattern < 0.5) {
    // Rays fanning up from below the frame, rippling as they go.
    vec2 q = c - vec2(0.0, -0.75);
    float r = length(q);
    line = lines(atan(q.x, q.y) * 9.0 + sin(r * 9.0 - t * 6.0) * 0.35);
  } else if (uPattern < 1.5) {
    // Contour lines over a slow, lumpy terrain.
    float h = length(c - vec2(0.25, 0.15)) + (fbm(c * 1.6 + t) - 0.5) * 0.5;
    line = lines(h * 14.0);
  } else if (uPattern < 2.5) {
    // Sound waves across the frame.
    float w = c.y + sin(c.x * 5.0 + c.y * 3.0 + t * 5.0) * 0.045;
    line = lines(w * 11.0);
  } else {
    // A dot grid.
    vec2 cell = fract(c * 14.0) - 0.5;
    float px = fwidth(c.x * 14.0);
    line = 1.0 - smoothstep(0.07, 0.07 + px, length(cell));
  }
  // Lines and grain both show in the light areas and fade into the dark ones.
  float light = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(color, vec3(1.0), line * (0.06 + 0.3 * light));
  color += (hash(gl_FragCoord.xy) - 0.5) * (0.02 + 0.11 * light);

  gl_FragColor = vec4(color, 1.0);
}
`;

const hex = (color: string): Rgb => {
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export type BackdropPattern = 'rays' | 'contours' | 'waves' | 'dots';
const PATTERNS: BackdropPattern[] = ['rays', 'contours', 'waves', 'dots'];

export function ShaderBackdrop({
  colors,
  pattern,
  start,
}: {
  // Top to bottom: light and cool down to dark and warm, neighbouring hues.
  colors: readonly [string, string, string, string, string];
  pattern: BackdropPattern;
  // Where in the flow this panel begins, so each looks different but alike.
  start: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const key = colors.join();

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const gl = canvas?.getContext('webgl', { antialias: false });
    if (!canvas || !host || !gl) return;
    gl.getExtension('OES_standard_derivatives');

    const shader = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(program, name);
    key
      .split(',')
      .forEach((color, i) => gl.uniform3fv(u(`uC${i}`), hex(color)));
    gl.uniform1f(u('uPattern'), PATTERNS.indexOf(pattern));

    const still = matchMedia('(prefers-reduced-motion: reduce)');
    let time = start;
    let hover = 0;
    let hovering = false;
    let pointer = [0.5, 0.5];
    let visible = false;
    let frame = 0;
    let last = 0;

    function draw() {
      gl!.uniform2f(u('uSize'), canvas!.width, canvas!.height);
      gl!.uniform1f(u('uTime'), time);
      gl!.uniform2f(u('uPointer'), pointer[0], pointer[1]);
      gl!.uniform1f(u('uHover'), hover);
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    }
    function tick(now: number) {
      const delta = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      time += delta * (1 + hover * 0.6);
      hover += ((hovering ? 1 : 0) - hover) * Math.min(1, delta * 4);
      draw();
      frame = requestAnimationFrame(tick);
    }
    function run() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      if (visible && !still.matches) frame = requestAnimationFrame(tick);
      else draw();
    }
    function resize() {
      // Full resolution, so the grain stays a single pixel.
      const ratio = Math.min(devicePixelRatio, 2);
      canvas!.width = Math.max(1, Math.round(host!.clientWidth * ratio));
      canvas!.height = Math.max(1, Math.round(host!.clientHeight * ratio));
      draw();
    }
    const onMove = (event: PointerEvent) => {
      const box = host.getBoundingClientRect();
      pointer = [
        (event.clientX - box.left) / box.width,
        1 - (event.clientY - box.top) / box.height,
      ];
      hovering = true;
    };
    const onLeave = () => {
      hovering = false;
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      run();
    });
    const resizeObserver = new ResizeObserver(resize);
    observer.observe(host);
    resizeObserver.observe(host);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    still.addEventListener('change', run);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      still.removeEventListener('change', run);
    };
  }, [key, pattern, start]);

  return (
    <canvas className="shader-backdrop" ref={canvasRef} aria-hidden="true" />
  );
}
