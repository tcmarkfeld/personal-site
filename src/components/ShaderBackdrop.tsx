import { useEffect, useRef } from 'react';

type Rgb = readonly [number, number, number];

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// A slow, domain-warped gradient with film grain. The pointer pulls the flow
// toward it and lifts the color a little while hovered.
const FRAGMENT = `
precision mediump float;
uniform vec2 uSize;
uniform float uTime;
uniform vec2 uPointer;
uniform float uHover;
uniform float uDim;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;

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
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    amp *= 0.5;
  }
  return sum;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 p = uv * vec2(uSize.x / uSize.y, 1.0) * 0.75;
  vec2 toPointer = uPointer - uv;
  float near = exp(-dot(toPointer, toPointer) * 6.0);
  p += toPointer * near * uHover * 0.5;

  float t = uTime * 0.045;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(
    fbm(p + 1.8 * q + vec2(1.7, 9.2) + t * 1.3),
    fbm(p + 1.8 * q + vec2(8.3, 2.8) - t)
  );
  float f = fbm(p + 1.6 * r);

  vec3 color = mix(uA, uB, smoothstep(0.25, 0.75, f));
  color = mix(color, uC, smoothstep(0.35, 0.95, length(r) * 0.9));
  color += near * uHover * 0.08;
  color *= mix(1.0, 0.62, uDim);
  color += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.07;
  gl_FragColor = vec4(color, 1.0);
}
`;

const hex = (color: string): Rgb => {
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export function ShaderBackdrop({
  colors,
  dim,
}: {
  colors: readonly [string, string, string];
  dim: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [a, b, c] = colors;

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const gl = canvas?.getContext('webgl', { antialias: false });
    if (!canvas || !host || !gl) return;

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
    gl.uniform3fv(u('uA'), hex(a));
    gl.uniform3fv(u('uB'), hex(b));
    gl.uniform3fv(u('uC'), hex(c));

    const still = matchMedia('(prefers-reduced-motion: reduce)');
    // Each card starts at a different point in the flow.
    let time = Math.random() * 100;
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
      gl!.uniform1f(u('uDim'), dim ? 1 : 0);
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
      const ratio = Math.min(devicePixelRatio, 1.5);
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
  }, [a, b, c, dim]);

  return (
    <canvas className="shader-backdrop" ref={canvasRef} aria-hidden="true" />
  );
}
