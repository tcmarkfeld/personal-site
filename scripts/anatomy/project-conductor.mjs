// Builds the Conductor project figure with the anatomy kit (scripts/anatomy/kit,
// MIT). Run: node scripts/anatomy/project-conductor.mjs
//
// The figure explains Conductor as a key-duplicating machine:
//   template key in the back vise = the app's messaging config (its queues and topics)
//   stylus tracing the template   = Conductor reading exactly what the app uses
//   cutter over the blank         = generating IAM and Terraform as it reads
//   the blank being cut (lit)     = the least-privilege key: cut to that bitting, no more
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from './kit/iso-kit.mjs';
import * as G from './kit/lathe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../src/components/projectFigures/conductor.gen.ts');

const WIDTH = 480;
const HEIGHT = 360;

// ---------------------------------------------------------------- world
const PLATE = { x: -96, y: -68, w: 186, d: 128, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;

// Two flat rails on the plate; the carriage rides on shoes on top of them.
const RAIL_X = [-84, 72];
const RAILS = [-22, 22].map((y) => ({
  x: RAIL_X[0],
  y: y - 3,
  w: RAIL_X[1] - RAIL_X[0],
  d: 6,
  r: 1,
}));
const RAIL_TOP = 4;
const SHOE_TOP = 6;
const CARRIAGE = { x: -48, y: -34, w: 84, d: 68, r: 3 };
const CARRIAGE_TOP = 12;

// The vises: a base, a fixed back jaw and a front jaw drawn in by a knob.
const VISE_FLOOR = CARRIAGE_TOP + 5;
const JAW_TOP = VISE_FLOOR + 5;
const JAW_X = -30;
const JAW_W = 48;
const KEY_T = 2.4;
const TEMPLATE_Y = -18;
const BLANK_Y = 18;

// A key, in its own (u, z) plane: u along the blade from the shoulder, z up
// from the vise floor. The template's five cuts are the bitting the stylus reads.
const KEY_X = -28; // carriage x of the shoulder
const BLADE = 56;
const KEY_TOP = 10;
const CUTS = [
  [8, 3],
  [17, 1.5],
  [26, 4],
  [35, 2],
  [44, 3.5],
];
const BOW = { u: -11, z: 5, r: 9 };
const HOLE_R = 2.4;

const tipTop = (u) => Math.min(KEY_TOP, KEY_TOP - (u - 50));
function topOf(u, cut) {
  let z = tipTop(u);
  if (cut)
    for (const [at, depth] of CUTS)
      z = Math.min(z, KEY_TOP - depth + Math.max(0, Math.abs(u - at) - 0.8));
  return z;
}

// The top edge, sampled and stripped of collinear points.
function topLine(cut) {
  const points = [];
  for (let u = 0; u <= BLADE + 1e-9; u += 0.2) {
    const z = Math.round(topOf(u, cut) * 1000) / 1000;
    const last = points[points.length - 1];
    const before = points[points.length - 2];
    if (
      before &&
      Math.abs(
        (last[0] - before[0]) * (z - before[1]) -
          (last[1] - before[1]) * (u - before[0]),
      ) < 1e-6
    )
      points[points.length - 1] = [Math.round(u * 100) / 100, z];
    else points.push([Math.round(u * 100) / 100, z]);
  }
  return points;
}

// The whole outline: shoulder, top edge, tip, bottom, then round the bow.
function keyRing(cut) {
  const bowAt = (z) => BOW.u + Math.sqrt(BOW.r ** 2 - (z - BOW.z) ** 2);
  const neck = 10.5;
  const a0 = Math.atan2(neck - BOW.z, bowAt(neck) - BOW.u);
  const a1 = Math.atan2(0 - BOW.z, bowAt(0) - BOW.u) + Math.PI * 2;
  const bow = Array.from({ length: 29 }, (_, n) => {
    const a = a0 + ((a1 - a0) * n) / 28;
    return [BOW.u + BOW.r * Math.cos(a), BOW.z + BOW.r * Math.sin(a)];
  });
  return [[0, neck], ...topLine(cut), [BLADE, 2], [53, 0], ...bow.reverse()];
}

// The column at the back carries the head: an arm with the stylus over the
// template and the motor, arbor and cutter over the blank. The head rides up
// and down the column so the stylus stays on the template's top edge.
const COLUMN = { x: -8, y: -62, w: 16, d: 12, r: 1.5 };
const COLUMN_TOP = 76;
const CUTTER_R = 12;
const GUARD_R = CUTTER_R + 2;
const CUTTER_Z = VISE_FLOOR + KEY_TOP + CUTTER_R; // cutter just kisses the blank
const ARM_Z = CUTTER_Z + GUARD_R;
const ARM_H = 5;
const TIP_Z = VISE_FLOOR + KEY_TOP;
const MOTOR_R = 7.5;
const MOTOR = [6, 28]; // on the tip side, so the cut key stays in view
const LIFT = 4; // how far the head rises clear between keys

// Carriage travel: the cutter sits at u = KEY_X·−1 − carriage x.
const TRAVEL = [-KEY_X, -KEY_X - BLADE];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [COLUMN.x, COLUMN.y, COLUMN_TOP + 8],
    [MOTOR[0], BLANK_Y, ARM_Z + ARM_H + LIFT],
  ],
  WIDTH,
  HEIGHT,
  { pad: 54, azimuth: 52 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const depth = (x, y, z = 0) => k.depthOf([x, y, z], P);
const halo = (plan, z, h, blur = 3) =>
  `<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}" style="filter:blur(${blur}px)"/>`;

// A flat plate standing in the x–z plane, `ring` its (x, z) outline, from y0 to
// y1. Shaded like the kit's prisms, but the outline may be concave.
const area = (ring) =>
  ring.reduce((sum, [ax, ay], i) => {
    const [bx, by] = ring[(i + 1) % ring.length];
    return sum + ax * by - bx * ay;
  }, 0) / 2;
const oriented = (points) =>
  area(points) < 0 ? [...points].reverse() : points;
function plateOf(ring, y0, y1) {
  const V = G.viewOf(P);
  const light = G.lightOf(P);
  const outward = area(ring) > 0 ? 1 : -1;
  const front = ring.map(([x, z]) => at([x, y1, z]));
  const back = ring.map(([x, z]) => at([x, y0, z]));
  const buckets = [[], [], [], [], []];
  const fill = [k.pathOf(oriented(front), true)];
  buckets[G.bandOf(G.dot3([0, 1, 0], light))].push(fill[0]);
  const seen = ring.map(([x0, z0], j) => {
    const [x1, z1] = ring[(j + 1) % ring.length];
    const n = G.unit3([(z1 - z0) * outward, 0, -(x1 - x0) * outward]);
    if (G.dot3(n, V) <= 1e-6) return false;
    const quad = k.pathOf(
      oriented([
        front[j],
        front[(j + 1) % ring.length],
        back[(j + 1) % ring.length],
        back[j],
      ]),
      true,
    );
    buckets[G.bandOf(G.dot3(n, light))].push(quad);
    fill.push(quad);
    return true;
  });
  const outline = [k.pathOf(front, true)];
  seen.forEach((visible, j) => {
    const next = (j + 1) % ring.length;
    if (visible) outline.push(k.pathOf([back[j], back[next]]));
    if (visible !== seen[(j - 1 + ring.length) % ring.length])
      outline.push(k.pathOf([front[j], back[j]]));
  });
  return {
    fill: fill.join(''),
    outline: outline.join(''),
    crease: '',
    top: buckets[4].join(''),
    shades: buckets.slice(0, 4).map((list) => list.join('')),
    seamless: true,
  };
}

// ---------------------------------------------------------------- parts
function plate() {
  const out = [halo(PLATE, -PLATE_H - FOOT_H, PLATE_H, 9)];
  const feet = k.corners(PLATE, 20).sort((a, b) => depth(...a) - depth(...b));
  for (const [x, y] of feet) {
    out.push(
      S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: 'lo' }),
    );
    out.push(
      S(k.cylinder(x, y, 5.2, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), {
        tone: 'mid',
      }),
    );
  }
  const seam = k.sideSeam(PLATE, -PLATE_H + 3.5, P, 8);
  out.push(
    S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.4), {
      tone: 'mid',
      inner: L(seam, { tone: 'faint' }),
    }),
  );
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: 'lo' }));
  const screws = k.corners(PLATE, 10);
  out.push(
    L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), {
      tone: 'lo',
    }),
  );
  out.push(
    D(
      screws.map(([x, y]) => at([x, y, 0])),
      { size: 0.5 },
    ),
  );

  // Ruler strip along the front edge: the carriage's pointer reads its travel.
  const strip = { x: -76, y: PLATE.y + PLATE.d - 16, w: 112, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const ticks = k.topTicks(
    strip.x + 4,
    strip.x + strip.w - 4,
    4,
    5,
    strip.y + 0.8,
    0.6,
    [1.8, 3.4],
    P,
  );
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
  out.push(
    D(
      [
        at([strip.x + 2, strip.y + 3, 0.6]),
        at([strip.x + strip.w - 2, strip.y + 3, 0.6]),
      ],
      { size: 0.45 },
    ),
  );

  // Label plate with three rule lines standing in for printed text.
  const label = { x: 50, y: PLATE.y + PLATE.d - 20, w: 30, d: 12, r: 1.2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'mid' }));
  out.push(
    L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: 'faint' }),
  );
  [
    [0.32, 16],
    [0.52, 20],
    [0.72, 11],
  ].forEach(([share, length]) => {
    const y = label.y + label.d * share;
    out.push(
      L(k.lineOnTop([label.x + 5, y], [label.x + 5 + length, y], 0.8, P), {
        tone: 'lo',
        free: true,
      }),
    );
  });
  out.push(
    D(
      [
        at([label.x + 2.6, label.y + 2.6, 0.8]),
        at([label.x + label.w - 2.6, label.y + label.d - 2.6, 0.8]),
      ],
      { size: 0.4 },
    ),
  );
  return out.join('');
}

function rails() {
  const out = [];
  for (const rail of RAILS) {
    out.push(S(k.slabOf(rail, 0, RAIL_TOP, P, 3, 0.4), { tone: 'mid' }));
    // The ground way down the middle of the rail, end to end.
    out.push(
      L(
        k.lineOnTop(
          [rail.x, rail.y + rail.d / 2],
          [rail.x + rail.w, rail.y + rail.d / 2],
          RAIL_TOP,
          P,
        ),
        { tone: 'faint' },
      ),
    );
    out.push(
      D(
        [rail.x + 5, rail.x + rail.w - 5].map((x) =>
          at([x, rail.y + 1.5, RAIL_TOP]),
        ),
        { size: 0.4 },
      ),
    );
  }
  return out.join('');
}

// End stops at both ends of each rail; the near ones are drawn last.
function stop(x, rail) {
  const plan = { x, y: rail.y - 1, w: 5, d: rail.d + 2, r: 1 };
  return (
    S(k.slabOf(plan, 0, 8, P, 3, 0.5), { tone: 'mid' }) +
    D([at([x + 2.5, rail.y + rail.d / 2, 8])], { size: 0.45 })
  );
}

function column() {
  const out = [halo(k.insetPlan(COLUMN, -4), 0, 2)];
  const flange = k.insetPlan(COLUMN, -4);
  out.push(S(k.slabOf(flange, 0, 3, P, 4, 0.5), { tone: 'mid' }));
  out.push(
    D(
      k.corners(flange, 2.2).map(([x, y]) => at([x, y, 3])),
      { size: 0.45 },
    ),
  );
  out.push(
    S(k.slabOf(COLUMN, 3, COLUMN_TOP - 3, P, 4, 0.6), {
      tone: 'mid',
      inner: L(k.sideSeam(COLUMN, 12, P, 4), { tone: 'faint' }),
    }),
  );
  // Two gibs on the front face that the head slides between.
  for (const x of [COLUMN.x + 1.5, COLUMN.x + COLUMN.w - 3.5]) {
    const gib = { x, y: COLUMN.y + COLUMN.d, w: 2, d: 1.6, r: 0.3 };
    out.push(
      S(k.slabOf(gib, 14, COLUMN_TOP - 18, P, 2), {
        tone: 'mid',
        crease: 'none',
      }),
    );
  }
  const cap = k.insetPlan(COLUMN, -1.2);
  out.push(S(k.slabOf(cap, COLUMN_TOP, 3, P, 4, 0.5), { tone: 'mid' }));
  // The depth stop: a knurled knob on the cap.
  const [kx, ky] = [0, COLUMN.y + COLUMN.d / 2];
  out.push(
    S(k.cylinder(kx, ky, 1.4, COLUMN_TOP + 3, 2, P, 16), { tone: 'mid' }),
  );
  out.push(
    S(k.cylinder(kx, ky, 4, COLUMN_TOP + 5, 3, P, 32, 0.4), { tone: 'mid' }),
  );
  out.push(
    L(k.knurl(kx, ky, 4, COLUMN_TOP + 5, COLUMN_TOP + 8, 30, P), {
      tone: 'lo',
    }),
  );
  out.push(D([at([kx, ky, COLUMN_TOP + 8])], { size: 0.5, tone: 'hi' }));
  // A switch box on the column's right face, toggle up.
  const box = { x: COLUMN.x + COLUMN.w, y: COLUMN.y + 2, w: 4, d: 8, r: 0.8 };
  out.push(S(k.slabOf(box, 18, 12, P, 3, 0.4), { tone: 'mid' }));
  out.push(
    S(k.cylinder(box.x + 4.6, box.y + 4, 1.2, 25, 0.1, P, 16), {
      tone: 'mid',
    }),
  );
  const F = G.frameAlong([box.x + 4, box.y + 4, 25], [1, 0, 0.5]);
  out.push(
    S(
      G.solidOf(
        [
          [0, 0.7],
          [4, 0.5],
          [4.6, 0.8, 1],
          [5.4, 0.6],
        ],
        F,
        P,
      ),
      { tone: 'hi' },
    ),
  );
  out.push(
    D([at([box.x + 4, box.y + 1.4, 20]), at([box.x + 4, box.y + 6.6, 28])], {
      size: 0.4,
    }),
  );
  return out.join('');
}

// ---- the carriage, in its own coordinates (moved along x as one)

function shoes() {
  const out = [];
  const spots = [];
  for (const rail of RAILS)
    for (const x of [CARRIAGE.x + 4, CARRIAGE.x + CARRIAGE.w - 16])
      spots.push({ x, y: rail.y - 1, w: 12, d: rail.d + 2, r: 1 });
  spots.sort((a, b) => depth(a.x, a.y) - depth(b.x, b.y));
  for (const shoe of spots)
    out.push(
      S(k.slabOf(shoe, RAIL_TOP, SHOE_TOP - RAIL_TOP, P, 3, 0.3), {
        tone: 'mid',
      }),
    );
  return out.join('');
}

function carriage() {
  const out = [halo(k.insetPlan(CARRIAGE, 4), SHOE_TOP, 0.1, 4)];
  out.push(shoes());
  out.push(
    S(k.slabOf(CARRIAGE, SHOE_TOP, CARRIAGE_TOP - SHOE_TOP, P, 5, 0.8), {
      tone: 'mid',
      inner: L(k.sideSeam(CARRIAGE, SHOE_TOP + 2, P, 5), { tone: 'faint' }),
    }),
  );
  // Two T-slots along the top, edge to edge.
  out.push(
    L(
      [-4, 4]
        .map((y) =>
          k.lineOnTop(
            [CARRIAGE.x, y],
            [CARRIAGE.x + CARRIAGE.w, y],
            CARRIAGE_TOP,
            P,
          ),
        )
        .join(''),
      { tone: 'faint' },
    ),
  );
  out.push(
    D(
      k.corners(CARRIAGE, 3.6).map(([x, y]) => at([x, y, CARRIAGE_TOP])),
      { size: 0.45 },
    ),
  );
  // The pointer that reads the carriage's travel off the ruler strip.
  const pointer = {
    x: CARRIAGE.x + 26,
    y: CARRIAGE.y + CARRIAGE.d - 2,
    w: 3,
    d: 12,
    r: 0.6,
  };
  out.push(
    S(k.slabOf(pointer, SHOE_TOP, 1, P, 2), { tone: 'mid', crease: 'none' }),
  );
  out.push(
    L(
      k.lineOnTop(
        [pointer.x + 1.5, pointer.y + 4],
        [pointer.x + 1.5, pointer.y + pointer.d],
        SHOE_TOP + 1,
        P,
      ),
      { tone: 'hi' },
    ),
  );
  return out.join('');
}

const viseBase = (y) => ({
  x: JAW_X - 1,
  y: y - 9,
  w: JAW_W + 2,
  d: 18,
  r: 1.5,
});
const jaw = (y, side) => ({
  x: JAW_X,
  y: side < 0 ? y - KEY_T / 2 - 4 : y + KEY_T / 2,
  w: JAW_W,
  d: 4,
  r: 0.5,
});

function viseBack(y) {
  const base = viseBase(y);
  const back = jaw(y, -1);
  return (
    halo(base, CARRIAGE_TOP, 0.1, 2) +
    S(k.slabOf(base, CARRIAGE_TOP, VISE_FLOOR - CARRIAGE_TOP, P, 4, 0.5), {
      tone: 'mid',
    }) +
    D(
      [base.x + 3, base.x + base.w - 3].map((x) =>
        at([x, base.y + base.d - 2.4, VISE_FLOOR]),
      ),
      { size: 0.4 },
    ) +
    S(k.slabOf(back, VISE_FLOOR, JAW_TOP - VISE_FLOOR, P, 2, 0.3), {
      tone: 'mid',
    }) +
    D(
      [back.x + 6, back.x + back.w - 6].map((x) =>
        at([x, back.y + 2, JAW_TOP]),
      ),
      { size: 0.4 },
    )
  );
}

function viseFront(y) {
  const front = jaw(y, 1);
  const out = [
    S(k.slabOf(front, VISE_FLOOR, JAW_TOP - VISE_FLOOR, P, 2, 0.3), {
      tone: 'mid',
    }),
    D(
      [front.x + 6, front.x + front.w - 6].map((x) =>
        at([x, front.y + 2, JAW_TOP]),
      ),
      { size: 0.4 },
    ),
  ];
  // The clamp screw and its knurled knob, out of the front jaw.
  const zc = (VISE_FLOOR + JAW_TOP) / 2;
  const F = G.frameAlong([JAW_X + JAW_W / 2, front.y + front.d, zc], [0, 1, 0]);
  out.push(S(G.disc(0, 2.6, 1.1, F, P), { tone: 'mid' }));
  out.push(S(G.disc(2.6, 5.6, 3.4, F, P), { tone: 'mid' }));
  out.push(
    L(G.ribsOf(F, 2.6, 5.6, 3.4, 30, P, { seams: true }), { tone: 'lo' }),
  );
  out.push(D([at(G.pointOf(F, 5.6, 0, 0))], { size: 0.5, tone: 'hi' }));
  return out.join('');
}

// A key standing in its vise, its plane at y. `cut` gives it the template's
// bitting; without it, it is a fresh blank.
function key(y, cut, lit) {
  const ring = keyRing(cut).map(([u, z]) => [KEY_X + u, VISE_FLOOR + z]);
  const y1 = y + KEY_T / 2;
  const out = [
    S(plateOf(ring, y - KEY_T / 2, y1), {
      tone: 'hi',
      crease: 'lo',
      lit,
    }),
  ];
  // The bow's hole, and the keyway groove from the bow to the tip.
  const hole = k
    .circleRing(KEY_X + BOW.u - 2, BOW.z, HOLE_R, 24)
    .map(([x, z]) => at([x, y1, VISE_FLOOR + z]));
  out.push(
    `<path class="iso-shade" data-shade="0" d="${k.pathOf(hole, true)}"/>`,
  );
  out.push(L(k.pathOf(hole, true), { tone: lit ? 'lit' : 'hi' }));
  const groove = 3;
  const start = BOW.u + Math.sqrt(BOW.r ** 2 - (groove - BOW.z) ** 2);
  out.push(
    L(
      k.pathOf([
        at([KEY_X + start, y1, VISE_FLOOR + groove]),
        at([KEY_X + BLADE, y1, VISE_FLOOR + groove]),
      ]),
      { tone: lit ? 'mid' : 'lo' },
    ),
  );
  return out.join('');
}

// Clips that split a key where the stylus or cutter stands (u = 0 here; the
// live code slides them along). `ahead` keeps the part the head hasn't reached.
function splitClip(id, y, ahead) {
  const x0 = ahead ? KEY_X : KEY_X - 140;
  const x1 = ahead ? KEY_X + 140 : KEY_X;
  const box = [];
  for (const x of [x0, x1])
    for (const yy of [y - KEY_T, y + KEY_T])
      for (const z of [-20, 70]) box.push(at([x, yy, z]));
  return `<clipPath id="${id}"><path data-split d="${k.pathOf(G.hullOf(box), true)}"/></clipPath>`;
}

function handle() {
  const x = CARRIAGE.x + CARRIAGE.w - 10;
  const y = CARRIAGE.y + CARRIAGE.d;
  const zc = (SHOE_TOP + CARRIAGE_TOP) / 2;
  const F = G.frameAlong([x, y, zc], [0, 1, 0]);
  return (
    S(G.disc(0, 1.2, 2.6, F, P), { tone: 'mid' }) +
    S(
      G.solidOf(
        [
          [1.2, 1.3],
          [5, 1.1, 1],
          [8, 1.6, 1],
        ],
        F,
        P,
      ),
      { tone: 'mid' },
    ) +
    S(G.sphereOf(G.pointOf(F, 10.4, 0, 0), 3, P), {
      tone: 'mid',
      crease: 'none',
    })
  );
}

// ---- the head, in its own coordinates (moved up and down as one)

function stylus() {
  const F = G.frameAlong([0, TEMPLATE_Y, TIP_Z], [0, 0, 1]);
  return S(
    G.solidOf(
      [
        [0, 0.25],
        [3.2, 1.5],
        [ARM_Z - 6 - TIP_Z, 1.5],
      ],
      F,
      P,
    ),
    { tone: 'hi', crease: 'lo' },
  );
}

const CUTTER = G.frameAlong([0, BLANK_Y, CUTTER_Z], [1, 0, 0]);
function head() {
  const out = [];
  // The slide on the column, and the arm out over both vises.
  const slide = { x: -7, y: COLUMN.y + COLUMN.d + 1.6, w: 14, d: 6, r: 1 };
  out.push(
    S(k.slabOf(slide, ARM_Z - 8, 18, P, 3, 0.5), {
      tone: 'mid',
      inner: L(k.sideSeam(slide, ARM_Z + 2, P, 3), { tone: 'faint' }),
    }),
  );
  out.push(
    D(
      [ARM_Z - 4, ARM_Z + 6].map((z) =>
        at([slide.x + slide.w, slide.y + slide.d / 2, z]),
      ),
      { size: 0.45 },
    ),
  );

  // The stylus holder under the arm, with its thumb screw.
  const holder = { x: -3.5, y: TEMPLATE_Y - 3.5, w: 7, d: 7, r: 1 };
  out.push(S(k.slabOf(holder, ARM_Z - 6, 6, P, 3, 0.4), { tone: 'mid' }));
  const T = G.frameAlong(
    [holder.x + holder.w, TEMPLATE_Y, ARM_Z - 3],
    [1, 0, 0],
  );
  out.push(S(G.disc(0, 1.6, 0.9, T, P), { tone: 'mid' }));
  out.push(S(G.disc(1.6, 4, 2.2, T, P), { tone: 'mid' }));
  out.push(L(G.ribsOf(T, 1.6, 4, 2.2, 18, P, { seams: true }), { tone: 'lo' }));

  // The guard: a half-round shield behind the top of the wheel.
  const half = Array.from({ length: 25 }, (_, n) => {
    const a = (n / 24) * Math.PI;
    return [GUARD_R * Math.cos(a), GUARD_R * Math.sin(a)];
  });
  out.push(S(G.prismOf(CUTTER, half, -3, -1.6, P), { tone: 'mid' }));

  // The cutter wheel; its teeth and lightening holes are drawn live as it turns.
  out.push(S(G.disc(-1.6, -1.2, 3.2, CUTTER, P), { tone: 'mid' }));
  out.push(
    S(G.disc(-1.2, 1.2, CUTTER_R, CUTTER, P), {
      tone: 'hi',
      crease: 'lo',
      inner: L(G.arcOf(CUTTER, 1.2, CUTTER_R - 3.4, P), { tone: 'lo' }),
    }),
  );
  out.push(`<path class="iso-line" data-tone="mid" data-teeth d=""/>`);
  out.push(`<g class="iso-dots" data-tone="hi" data-holes></g>`);

  // The arbor out of the motor's flange, with a collar clamping the wheel.
  out.push(S(G.disc(1.2, 3.4, 3.2, CUTTER, P), { tone: 'mid' }));
  out.push(S(G.disc(3.4, MOTOR[0], 1.4, CUTTER, P), { tone: 'mid' }));

  // The motor: a flange at the wheel, a vented body, a bell at the far end.
  const M = G.frameAlong([MOTOR[1], BLANK_Y, CUTTER_Z], [-1, 0, 0]);
  const length = MOTOR[1] - MOTOR[0];
  out.push(
    S(
      G.solidOf(
        [
          [0, MOTOR_R - 2.5],
          [1.4, MOTOR_R - 0.6, 1],
          [3, MOTOR_R],
          [length - 3, MOTOR_R],
          [length - 3, MOTOR_R + 0.8],
          [length, MOTOR_R + 0.8],
        ],
        M,
        P,
      ),
      { tone: 'mid' },
    ),
  );
  out.push(
    L(G.ribsOf(M, 7, 13, MOTOR_R, 16, P, { seams: true }), { tone: 'lo' }),
    L(G.arcOf(M, length - 3, MOTOR_R, P), { tone: 'faint' }),
  );

  // Two straps hang the motor from the cross-bar.
  for (const x of [MOTOR[0] + 4, MOTOR[1] - 7]) {
    const strap = { x, y: BLANK_Y - 2, w: 3, d: 4, r: 0.5 };
    const z = CUTTER_Z + MOTOR_R - 1;
    out.push(S(k.slabOf(strap, z, ARM_Z - z, P, 2), { tone: 'mid' }));
  }

  // The arm, and the cross-bar the motor and guard hang from.
  const bar = { x: -5, y: BLANK_Y - 4, w: MOTOR[1] + 4, d: 8, r: 1 };
  const arm = { x: -5, y: slide.y + 2, w: 10, d: bar.y - slide.y - 2, r: 1 };
  out.push(S(k.slabOf(arm, ARM_Z, ARM_H, P, 3, 0.5), { tone: 'mid' }));
  out.push(S(k.slabOf(bar, ARM_Z, ARM_H, P, 3, 0.5), { tone: 'mid' }));
  out.push(
    D(
      [MOTOR[0] + 5.5, MOTOR[1] - 5.5].map((x) =>
        at([x, BLANK_Y, ARM_Z + ARM_H]),
      ),
      { size: 0.45 },
    ),
    D([at([0, TEMPLATE_Y, ARM_Z + ARM_H])], { size: 0.45 }),
  );
  out.push(
    L(k.lineOnTop([0, arm.y], [0, bar.y], ARM_Z + ARM_H, P), { tone: 'faint' }),
  );
  return out.join('');
}

// ---------------------------------------------------------------- assemble
const group = (attrs, content) =>
  `<g ${Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${content}</g>`;
const startX = TRAVEL[0];
const move = (x) => k.translateAlong(P, [x, 0, 0]);
// Every carriage layer shares one transform; the head layers share another.
const carriageLayer = (content) =>
  group({ 'data-carriage': '', 'transform': move(startX) }, content);
const headLayer = (content) => group({ 'data-head': '' }, content);
const clipped = (id, content) => group({ 'clip-path': `url(#${id})` }, content);
const blank = (content) => group({ 'data-blank': '' }, content);

const stops = RAILS.flatMap((rail) =>
  [RAIL_X[0] - 5, RAIL_X[1]].map((x) => ({ x, rail })),
).sort((a, b) => depth(a.x, a.rail.y) - depth(b.x, b.rail.y));
const backStops = stops.filter(({ x }) => x < 0);
const frontStops = stops.filter(({ x }) => x > 0);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    'A key-duplicating machine. A template key is clamped in the back vise and a blank in the front vise, side by side on one carriage. As the carriage slides along its rails, a stylus traces the template’s cuts and the head it hangs from rises and falls with them, so a cutter wheel on the same head cuts exactly those cuts into the blank and nothing more.',
  body: [
    plate(),
    column(),
    rails(),
    ...backStops.map(({ x, rail }) => stop(x, rail)),
    carriageLayer(
      splitClip('cd-template-behind', TEMPLATE_Y, false) +
        splitClip('cd-blank-cut', BLANK_Y, false) +
        splitClip('cd-blank-ahead', BLANK_Y, true) +
        carriage() +
        viseBack(TEMPLATE_Y) +
        clipped('cd-template-behind', key(TEMPLATE_Y, true, false)) +
        viseBack(BLANK_Y) +
        clipped('cd-blank-cut', blank(key(BLANK_Y, true, true))) +
        clipped('cd-blank-ahead', blank(key(BLANK_Y, false, true))),
    ),
    headLayer(stylus()),
    carriageLayer(
      splitClip('cd-template-ahead', TEMPLATE_Y, true) +
        clipped('cd-template-ahead', key(TEMPLATE_Y, true, false)) +
        viseFront(TEMPLATE_Y),
    ),
    headLayer(head()),
    carriageLayer(viseFront(BLANK_Y) + handle()),
    ...frontStops.map(({ x, rail }) => stop(x, rail)),
  ],
});

const round = (n) => Math.round(n * 1000) / 1000;
const data = {
  P,
  travel: TRAVEL,
  keyX: KEY_X,
  lift: LIFT,
  // The template's top edge (u, height above the blade's uncut top).
  profile: topLine(true).map(([u, z]) => [u, round(z - KEY_TOP)]),
  cutter: { y: BLANK_Y, z: CUTTER_Z, r: CUTTER_R, s: [-1.2, 1.2], holes: 5 },
};

writeFileSync(
  OUT,
  `// Generated by scripts/anatomy/project-conductor.mjs. Do not edit by hand.\n` +
    `export const svg = ${JSON.stringify(svg)};\n` +
    `export const data = ${JSON.stringify(data)} as const;\n`,
);
console.log('wrote', OUT, `${(svg.length / 1024).toFixed(0)} KB`);
