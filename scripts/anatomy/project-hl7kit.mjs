// Builds the HL7Kit project figure with the anatomy kit (scripts/anatomy/kit,
// MIT). Run: node scripts/anatomy/project-hl7kit.mjs
//
// The slitter explains HL7Kit as cutting a message into typed fields:
//   paper tape off the spool  = an HL7 v2 segment, one long string
//   short cross ticks         = the `|` field delimiters; dots are `^` components
//   pinch rollers             = the parser reading forward to the next delimiter
//   guillotine blade          = the split at each delimiter
//   bins sized to each piece  = typed fields, ready to map to FHIR
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from './kit/iso-kit.mjs';
import * as G from './kit/lathe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../src/components/projectFigures/hl7kit.gen.ts');

const WIDTH = 480;
const HEIGHT = 360;

// ---------------------------------------------------------------- world
const PLATE = { x: -172, y: -82, w: 268, d: 112, r: 9 };
const PLATE_H = 10;
const FOOT_H = 5;

// The tape runs along +x at the bed's height; the blade cuts at x = 0.
const BED_TOP = 12;
const TAPE = { y0: -43, y1: -29, z: BED_TOP, top: BED_TOP + 0.6 };
const TAPE_Y = (TAPE.y0 + TAPE.y1) / 2;

// One segment's fields, head first. Each piece is drawn in its cut position,
// x from 0 (the blade) to its length; `parts` weighs its `^` components.
const FIELDS = [
  { length: 14, parts: [1] },
  { length: 32, parts: [9, 5, 7] },
  { length: 20, parts: [1] },
  { length: 26, parts: [8, 10] },
  { length: 16, parts: [1] },
];
// Where each field starts, in tape advanced since the loop began.
const STARTS = FIELDS.map((_, i) =>
  FIELDS.slice(0, i).reduce((sum, field) => sum + field.length, 0),
);
// The tape advances one whole segment per loop, so its marks repeat with it.
const PERIOD = FIELDS.reduce((sum, field) => sum + field.length, 0);

// Spool, pinch rollers and the bed the tape crosses.
const SPOOL = { x: -138, z: 18 + TAPE.top, r: 18, hub: 7, flange: 23 };
const ROLLERS = { x: -94, r: 5, low: BED_TOP - 5, high: TAPE.top + 5 };
const BED = { x: -78, y: -52, w: 124, d: 32, r: 2 };

// The guillotine: a column at the back with a rail, a carriage that slides
// down it on two springs, and the blade hanging from the carriage's arm.
const COLUMN = { x: -12, y: -72, w: 24, d: 10, r: 1.2 };
const COLUMN_TOP = 59;
const SHELF_TOP = 16;
const CARRIAGE_Z = 30;
const BLADE_Z = 19.6;
const DROP = BLADE_Z - BED_TOP;
const SPRINGS = [-6, 6].map((x) => ({ x, y: -57, r: 2.4 }));
const ROD = { x: 0, y: -36, r: 1.5 };
const HOUSING = { r: 5, z0: 47, z1: COLUMN_TOP };

// The sorting tray: one bin per field, each a little longer than its piece.
const TRAY = { x: -60, y: -10, d: 26, z: 6 };
const WALL = 2;
const FLOOR = 2;
const BINS = [];
{
  let x = TRAY.x + WALL;
  for (const field of FIELDS) {
    BINS.push({ x, w: field.length + 6 });
    x += field.length + 6 + WALL;
  }
}
const TRAY_W = BINS.at(-1).x + BINS.at(-1).w + WALL - TRAY.x;
const BIN_Y = TRAY.y + TRAY.d / 2;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [0, -70, COLUMN_TOP + 6],
    [SPOOL.x, -45, SPOOL.z + SPOOL.flange],
  ],
  WIDTH,
  HEIGHT,
  { pad: 40, azimuth: 48, elevation: 32 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const depth = (x, y, z = 0) => k.depthOf([x, y, z], P);
const halo = (plan, z, height, blur = 3) =>
  `<path class="iso-halo" d="${k.haloOf(plan, z, height, P)}" style="filter:blur(${blur}px)"/>`;
const alongY = (x, z) => G.frameAlong([x, 0, z], [0, 1, 0]);

// ---------------------------------------------------------------- parts
function plate() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`,
  ];
  const feet = k.corners(PLATE, 22).sort((a, b) => depth(...a) - depth(...b));
  for (const [x, y] of feet) {
    out.push(
      S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: 'lo' }),
    );
    out.push(
      S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), {
        tone: 'mid',
      }),
    );
  }
  const seam = k.sideSeam(PLATE, -PLATE_H + 3.5, P, 8);
  out.push(
    S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), {
      tone: 'mid',
      inner: L(seam, { tone: 'faint' }),
    }),
  );
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: 'lo' }));
  const screws = k.corners(PLATE, 11);
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

  // Ruler strip along the front edge, ticks hanging from its back edge.
  const strip = { x: -62, y: PLATE.y + PLATE.d - 13, w: 156, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const ticks = k.topTicks(
    strip.x + 4,
    strip.x + strip.w - 4,
    4,
    5,
    strip.y + 0.8,
    0.6,
    [1.8, 3.2],
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
  const label = { x: -156, y: 2, w: 44, d: 14, r: 1.2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'mid' }));
  out.push(
    L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: 'faint' }),
  );
  [
    [0.3, 26],
    [0.52, 32],
    [0.74, 18],
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

// The column with its rail, the spring shelf, the top arm's footing.
function column() {
  const out = [halo(COLUMN, 0, COLUMN_TOP)];
  const foot = {
    x: COLUMN.x - 4,
    y: COLUMN.y - 2,
    w: COLUMN.w + 8,
    d: 16,
    r: 1.6,
  };
  out.push(S(k.slabOf(foot, 0, 3, P, 4, 0.5), { tone: 'mid' }));
  out.push(
    D(
      [
        at([foot.x + 2.4, foot.y + foot.d - 2.4, 3]),
        at([foot.x + foot.w - 2.4, foot.y + foot.d - 2.4, 3]),
      ],
      { size: 0.45 },
    ),
  );
  out.push(
    S(k.slabOf(COLUMN, 3, COLUMN_TOP - 3, P, 4, 0.6), {
      tone: 'mid',
      inner: L(k.sideSeam(COLUMN, 8, P, 4), { tone: 'faint' }),
    }),
  );
  const rail = { x: -3.5, y: COLUMN.y + COLUMN.d, w: 7, d: 2, r: 0.4 };
  out.push(S(k.slabOf(rail, 8, COLUMN_TOP - 12, P, 2, 0.3), { tone: 'mid' }));
  out.push(
    D(
      [16, 26, 36, 46].map((z) => at([0, rail.y + rail.d, z])),
      { size: 0.4, tone: 'lo' },
    ),
  );
  const shelf = { x: COLUMN.x, y: rail.y, w: COLUMN.w, d: 7, r: 0.8 };
  out.push(
    S(k.slabOf(shelf, SHELF_TOP - 4, 4, P, 3, 0.4), {
      tone: 'mid',
    }),
  );
  // Spring seats on the shelf.
  for (const { x, y } of SPRINGS)
    out.push(L(k.ring(x, y, 3, SHELF_TOP, P, 20), { tone: 'faint' }));
  return out.join('');
}

// Live paths for the two springs, rebuilt each frame as the carriage drops.
function springs() {
  return SPRINGS.map(
    (_, i) =>
      `<g data-spring="${i}"><path class="iso-line" data-tone="lo" data-half="back" d=""/><path class="iso-line" data-tone="mid" data-half="front" d=""/></g>`,
  ).join('');
}

function spoolBack() {
  const out = [];
  const foot = { x: SPOOL.x - 14, y: -60, w: 28, d: 10, r: 1.5 };
  out.push(halo(foot, 0, 3));
  out.push(S(k.slabOf(foot, 0, 3, P, 4, 0.5), { tone: 'mid' }));
  out.push(
    D(
      [
        at([foot.x + 2.4, foot.y + foot.d - 2.4, 3]),
        at([foot.x + foot.w - 2.4, foot.y + foot.d - 2.4, 3]),
      ],
      { size: 0.45 },
    ),
  );
  const upright = { x: SPOOL.x - 8, y: -57, w: 16, d: 5, r: 1 };
  out.push(
    S(k.slabOf(upright, 3, SPOOL.z + 5, P, 3, 0.5), {
      tone: 'mid',
    }),
  );
  const F = alongY(SPOOL.x, SPOOL.z);
  out.push(S(G.disc(-52, -50.6, 5, F, P), { tone: 'mid' }));
  out.push(S(G.disc(-50.6, -24, 2.2, F, P), { tone: 'mid', crease: 'none' }));
  out.push(S(G.disc(-45, -43.4, SPOOL.flange, F, P), { tone: 'mid' }));
  out.push(L(G.circleOf(F, -43.4, SPOOL.flange - 2, P), { tone: 'faint' }));
  return out.join('');
}

function spoolFront() {
  const out = [];
  const F = alongY(SPOOL.x, SPOOL.z);
  // The roll of tape, its wound layers on the face.
  out.push(
    S(G.disc(TAPE.y0 - 0.2, TAPE.y1 + 0.2, SPOOL.r, F, P), {
      tone: 'hi',
      crease: 'lo',
    }),
  );
  out.push(
    L(
      [9.5, 11.5, 13.2, 14.8, 16.5]
        .map((r) => G.circleOf(F, TAPE.y1 + 0.2, r, P))
        .join(''),
      { tone: 'faint' },
    ),
  );
  out.push(
    S(G.disc(TAPE.y1 + 0.2, TAPE.y1 + 0.8, SPOOL.hub, F, P), { tone: 'mid' }),
  );
  out.push(
    D(
      [0, 1, 2].map((n) =>
        at(G.pointOf(F, TAPE.y1 + 0.8, 4.4, (n * 2 * Math.PI) / 3 + 0.5)),
      ),
      { size: 0.45 },
    ),
  );
  // Retaining nut, knurled, with a pointer that turns as the tape pays out.
  out.push(S(G.disc(-28, -24.6, 4, F, P), { tone: 'mid' }));
  out.push(L(G.ribsOf(F, -28, -24.6, 4, 24, P), { tone: 'lo' }));
  out.push(`<path class="iso-line" data-tone="hi" data-pointer="spool" d=""/>`);
  out.push(D([at([SPOOL.x, -24.6, SPOOL.z])], { size: 0.5 }));
  return out.join('');
}

const cheek = (y) => ({ x: ROLLERS.x - 9, y, w: 18, d: 4, r: 1 });
const ROLLER_Y = [-46, -28];

function rollersBack() {
  const out = [halo({ ...cheek(-50), d: 26 }, 0, 26)];
  out.push(
    S(k.slabOf(cheek(-50), 0, 26, P, 3, 0.5), {
      tone: 'mid',
    }),
  );
  const F = alongY(ROLLERS.x, ROLLERS.low);
  out.push(S(G.disc(...ROLLER_Y, ROLLERS.r, F, P), { tone: 'mid' }));
  return out.join('');
}

function rollersFront() {
  const out = [];
  const F = alongY(ROLLERS.x, ROLLERS.high);
  out.push(
    S(G.disc(...ROLLER_Y, ROLLERS.r, F, P), { tone: 'mid', crease: 'lo' }),
  );
  out.push(
    L([-42, -38, -34, -30.5].map((s) => G.arcOf(F, s, ROLLERS.r, P)).join(''), {
      tone: 'faint',
    }),
  );
  out.push(
    S(k.slabOf(cheek(-28), 0, 26, P, 3, 0.5), {
      tone: 'mid',
      inner: L(k.sideSeam(cheek(-28), 4, P, 3), { tone: 'faint' }),
    }),
  );
  // Bearing caps on the near cheek, and the feed knob on the upper axle.
  for (const z of [ROLLERS.low, ROLLERS.high]) {
    const C = alongY(ROLLERS.x, z);
    out.push(S(G.disc(-24, -22.8, 3.2, C, P), { tone: 'mid' }));
    out.push(D([at([ROLLERS.x, -22.8, z])], { size: 0.45 }));
  }
  const K = alongY(ROLLERS.x, ROLLERS.high);
  out.push(S(G.disc(-22.8, -20.6, 1.6, K, P), { tone: 'mid', crease: 'none' }));
  out.push(S(G.disc(-20.6, -16, 5.4, K, P), { tone: 'mid' }));
  out.push(L(G.ribsOf(K, -20.6, -16, 5.4, 36, P), { tone: 'lo' }));
  out.push(L(G.circleOf(K, -16, 4.2, P), { tone: 'faint' }));
  out.push(`<path class="iso-line" data-tone="hi" data-pointer="feed" d=""/>`);
  out.push(D([at([ROLLERS.x, -16, ROLLERS.high])], { size: 0.5 }));
  // Bridge across the cheeks with the pinch screw.
  const bridge = { x: ROLLERS.x - 4, y: -50, w: 8, d: 26, r: 0.8 };
  out.push(S(k.slabOf(bridge, 26, 3, P, 3, 0.4), { tone: 'mid' }));
  out.push(
    D(
      [-48, -26].map((y) => at([ROLLERS.x, y, 29])),
      { size: 0.45 },
    ),
  );
  out.push(
    S(k.cylinder(ROLLERS.x, TAPE_Y, 2.8, 29, 4.4, P, 24), { tone: 'mid' }),
  );
  out.push(L(k.knurl(ROLLERS.x, TAPE_Y, 2.8, 29, 33.4, 18, P), { tone: 'lo' }));
  return out.join('');
}

function bed() {
  const out = [halo(BED, 0, BED_TOP)];
  out.push(
    S(k.slabOf(BED, 0, BED_TOP, P, 4, 0.8), {
      tone: 'mid',
      inner: L(k.sideSeam(BED, 3, P, 4), { tone: 'faint' }),
    }),
  );
  // The anvil slot the blade drops into.
  out.push(
    L(
      k.planOutline(
        { x: -1.4, y: BED.y + 4.5, w: 2.8, d: 25, r: 0.6 },
        BED_TOP,
        P,
        3,
      ),
      { tone: 'lo' },
    ),
  );
  // Far fence, split where the blade passes.
  for (const fence of [
    { x: BED.x + 2, y: TAPE.y0 - 2.4, w: -2 - BED.x - 2, d: 1.6, r: 0.4 },
    { x: 2, y: TAPE.y0 - 2.4, w: BED.x + BED.w - 4, d: 1.6, r: 0.4 },
  ])
    out.push(S(k.slabOf(fence, BED_TOP, 1.8, P, 2), { tone: 'mid' }));
  // Ruler strip along the near edge, zero at the blade, and the index mark.
  const strip = { x: -72, y: -26, w: 66, d: 5, r: 0.8 };
  out.push(
    S(k.slabOf(strip, BED_TOP, 0.5, P, 3), { tone: 'lo', crease: 'none' }),
  );
  const ticks = k.topTicks(
    strip.x + 2,
    strip.x + strip.w - 2,
    4,
    5,
    strip.y + 0.6,
    BED_TOP + 0.5,
    [1.4, 2.8],
    P,
  );
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
  out.push(
    L(
      k.onTop(
        [
          [0, -22],
          [-1.4, -20.6],
          [1.4, -20.6],
        ],
        BED_TOP,
        P,
        true,
      ),
      { tone: 'hi' },
    ),
  );
  const screws = [
    [BED.x + 4, BED.y + 4],
    [BED.x + BED.w - 4, BED.y + 4],
    [BED.x + BED.w - 4, BED.y + BED.d - 4],
  ];
  out.push(
    L(screws.map(([x, y]) => k.ring(x, y, 1.6, BED_TOP, P, 14)).join(''), {
      tone: 'lo',
    }),
  );
  out.push(
    D(
      screws.map(([x, y]) => at([x, y, BED_TOP])),
      { size: 0.45 },
    ),
  );
  return out.join('');
}

function nearFence() {
  const fence = {
    x: BED.x + 2,
    y: TAPE.y1 + 0.4,
    w: -3 - BED.x - 2,
    d: 1.6,
    r: 0.4,
  };
  return S(k.slabOf(fence, BED_TOP, 1.8, P, 2), { tone: 'mid' });
}

// The marks one field prints on the tape, with its cut end at x = from.
function fieldMarks(field, from) {
  const rules = [];
  const ticks = [];
  const dots = [];
  // `|` sits just past the cut, so the blade drops as it reaches the index.
  ticks.push(
    k.lineOnTop(
      [from + 1.4, TAPE.y0 + 2.5],
      [from + 1.4, TAPE.y1 - 2.5],
      TAPE.top,
      P,
    ),
  );
  const gap = 2.4;
  const span = field.length - 3.4 - 2.2 - gap * (field.parts.length - 1);
  const weight = field.parts.reduce((sum, part) => sum + part, 0);
  let x = from + field.length - 2.2;
  field.parts.forEach((part, n) => {
    const length = (span * part) / weight;
    rules.push(k.lineOnTop([x, TAPE_Y], [x - length, TAPE_Y], TAPE.top, P));
    x -= length;
    if (n < field.parts.length - 1) {
      dots.push(at([x - gap / 2, TAPE_Y, TAPE.top]));
      x -= gap;
    }
  });
  return (
    L(rules.join(''), { tone: 'mid', free: true }) +
    L(ticks.join(''), { tone: 'hi', free: true }) +
    (dots.length ? D(dots, { size: 0.5, tone: 'hi' }) : '')
  );
}

const tapeSlab = (x, w) => ({ x, y: TAPE.y0, w, d: TAPE.y1 - TAPE.y0, r: 0.3 });

// The uncut tape at the loop's start: field 0 ends at the blade, and the
// segment repeats back past the spool so the loop can wrap without a jump.
function strip() {
  const reach = PERIOD - SPOOL.x + 12;
  const out = [
    S(k.slabOf(tapeSlab(-reach, reach), TAPE.z, 0.6, P, 2), {
      tone: 'hi',
      crease: 'lo',
    }),
  ];
  for (let start = 0; start < reach; start += PERIOD)
    FIELDS.forEach((field, i) => {
      const end = -start - STARTS[i];
      if (end - field.length > -reach)
        out.push(fieldMarks(field, end - field.length));
    });
  return out.join('');
}

// Clip regions in the tape's plane, between two values of x.
const between = (x0, x1) =>
  k.onTop(
    [
      [x0, -90],
      [x1, -90],
      [x1, 20],
      [x0, 20],
    ],
    TAPE.z + 0.3,
    P,
    true,
  );

// The cut end of the tape at the blade, shown while nothing hangs past it.
function head() {
  return L(
    k.pathOf([
      at([0, TAPE.y0, TAPE.top]),
      at([0, TAPE.y1, TAPE.top]),
      at([0, TAPE.y1, TAPE.z]),
    ]),
    { tone: 'hi' },
  );
}

function piece(field, i) {
  return `<g data-piece="${i}" visibility="hidden"><g data-move>${S(
    k.slabOf(tapeSlab(0, field.length), TAPE.z, 0.6, P, 2),
    { tone: 'hi', crease: 'lo' },
  )}${fieldMarks(field, 0)}</g></g>`;
}

// The carriage: blade, its clamp, the shoe on the rail and the arm, plus the
// plunger rod that runs up into the housing.
function carriage() {
  const out = [];
  const blade = {
    x: -0.6,
    y: TAPE.y0 - 3,
    w: 1.2,
    d: TAPE.y1 - TAPE.y0 + 6,
    r: 0.2,
  };
  out.push(
    S(k.slabOf(blade, BLADE_Z, CARRIAGE_Z - BLADE_Z, P, 2), {
      tone: 'mid',
      inner: L(k.sideSeam(blade, BLADE_Z + 1.6, P, 2), { tone: 'lo' }),
    }),
  );
  const clamp = { x: 0.6, y: blade.y + 2, w: 1.4, d: blade.d - 4, r: 0.3 };
  out.push(S(k.slabOf(clamp, 26.6, CARRIAGE_Z - 26.6, P, 2), { tone: 'mid' }));
  out.push(
    D(
      [blade.y + 5, blade.y + blade.d / 2, blade.y + blade.d - 5].map((y) =>
        at([2, y, 28.3]),
      ),
      { size: 0.45 },
    ),
  );
  const shoe = { x: -9, y: COLUMN.y + COLUMN.d + 2, w: 18, d: 7, r: 1 };
  out.push(S(k.slabOf(shoe, CARRIAGE_Z, 10, P, 3, 0.5), { tone: 'mid' }));
  out.push(
    D(
      [-6, 6].map((x) => at([x, shoe.y + 3.5, CARRIAGE_Z + 10])),
      { size: 0.45 },
    ),
  );
  const arm = {
    x: -5,
    y: shoe.y + shoe.d,
    w: 10,
    d: -24 - shoe.y - shoe.d,
    r: 1,
  };
  out.push(S(k.slabOf(arm, CARRIAGE_Z, 7, P, 3, 0.5), { tone: 'mid' }));
  out.push(
    D(
      [arm.y + 3, arm.y + arm.d - 3].map((y) => at([0, y, CARRIAGE_Z + 7])),
      { size: 0.45 },
    ),
  );
  const F = G.frameAlong([ROD.x, ROD.y, CARRIAGE_Z + 7], [0, 0, 1]);
  out.push(S(G.disc(0, 1.2, 3, F, P), { tone: 'mid' }));
  out.push(S(G.disc(1.2, 19, ROD.r, F, P), { tone: 'mid', crease: 'none' }));
  return out.join('');
}

// The top arm off the column, and the housing the rod drives from.
function housing() {
  const out = [];
  const F = G.frameAlong([ROD.x, ROD.y, 0], [0, 0, 1]);
  out.push(S(G.disc(HOUSING.z0 - 1.6, HOUSING.z0, 3, F, P), { tone: 'mid' }));
  out.push(
    S(G.disc(HOUSING.z0, HOUSING.z1, HOUSING.r, F, P), {
      tone: 'mid',
    }),
  );
  out.push(
    L(
      [HOUSING.z0 + 3, HOUSING.z0 + 4.2]
        .map((z) => k.sideArc(ROD.x, ROD.y, HOUSING.r, z, P, 24))
        .join(''),
      { tone: 'faint' },
    ),
  );
  const top = { x: -7, y: COLUMN.y, w: 14, d: ROD.y + 6 - COLUMN.y, r: 1.5 };
  out.push(S(k.slabOf(top, COLUMN_TOP, 6, P, 3, 0.6), { tone: 'mid' }));
  out.push(
    D(
      [COLUMN.y + 4, ROD.y].map((y) => at([0, y, COLUMN_TOP + 6])),
      { size: 0.5 },
    ),
  );
  return out.join('');
}

function trayBack() {
  const out = [];
  const plan = { x: TRAY.x, y: TRAY.y, w: TRAY_W, d: TRAY.d, r: 1.2 };
  out.push(halo(plan, 0, TRAY.z));
  out.push(S(k.slabOf(plan, 0, FLOOR, P, 3, 0.4), { tone: 'lo' }));
  out.push(
    S(
      k.slabOf(
        { x: TRAY.x, y: TRAY.y, w: TRAY_W, d: WALL, r: 0.5 },
        FLOOR,
        TRAY.z - FLOOR,
        P,
        2,
      ),
      { tone: 'mid' },
    ),
  );
  return out.join('');
}

const divider = (x) =>
  S(
    k.slabOf(
      { x, y: TRAY.y + WALL, w: WALL, d: TRAY.d - WALL * 2, r: 0.4 },
      FLOOR,
      TRAY.z - FLOOR,
      P,
      2,
    ),
    { tone: 'mid' },
  );

function trayFront() {
  const out = [];
  const y = TRAY.y + TRAY.d - WALL;
  out.push(
    S(
      k.slabOf(
        { x: TRAY.x, y, w: TRAY_W, d: WALL, r: 0.5 },
        FLOOR,
        TRAY.z - FLOOR,
        P,
        2,
      ),
      {
        tone: 'mid',
        inner: L(
          k.sideSeam(
            { x: TRAY.x, y, w: TRAY_W, d: WALL, r: 0.5 },
            FLOOR + 1.4,
            P,
            2,
          ),
          { tone: 'faint' },
        ),
      },
    ),
  );
  out.push(
    D(
      [TRAY.x + 1, TRAY.x + TRAY_W - 1].map((x) => at([x, y + 1, TRAY.z])),
      { size: 0.4 },
    ),
  );
  // A label holder on each bin, engraved with its own short marks.
  const face = TRAY.y + TRAY.d;
  BINS.forEach(({ x, w }, i) => {
    const holder = { x: x + w / 2 - 6, y: face, w: 12, d: 0.8, r: 0.3 };
    out.push(S(k.slabOf(holder, 1.2, 3.8, P, 2), { tone: 'mid' }));
    const front = face + 0.8;
    const marks = [
      [5, 3],
      [7, 2],
      [4, 6],
      [8, 4],
      [3, 5],
    ][i];
    out.push(
      L(
        marks
          .map((length, n) => {
            const z = 4.1 - n * 1.4;
            return k.segment(
              [holder.x + 2, front, z],
              [holder.x + 2 + length, front, z],
              P,
            );
          })
          .join(''),
        { tone: 'lo', free: true },
      ),
    );
  });
  return out.join('');
}

// ---------------------------------------------------------------- assemble
const group = (attrs, content) =>
  `<g ${Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${content}</g>`;
const layer = (name, content = '') => group({ 'data-layer': name }, content);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    'A tape slitter. Paper tape printed with an HL7 message feeds off a spool through pinch rollers onto a cutting bed. Each time a field delimiter reaches the blade, the blade drops and cuts that field off, and the piece slides into its own bin in a sorting tray, until the message lies in the tray as separate typed fields.',
  body: [
    `<defs><clipPath id="hl7-tape"><path d="${between(SPOOL.x, 0)}"/></clipPath><clipPath id="hl7-exit"><path d="${between(0, 80)}"/></clipPath></defs>`,
    plate(),
    column(),
    springs(),
    spoolBack(),
    rollersBack(),
    bed(),
    group(
      { 'clip-path': 'url(#hl7-tape)' },
      group({ 'data-tape': '' }, strip()),
    ),
    group({ 'data-head': '' }, head()),
    layer('table', FIELDS.map(piece).join('')),
    nearFence(),
    spoolFront(),
    rollersFront(),
    group({ 'data-carriage': '' }, carriage()),
    housing(),
    trayBack(),
    ...BINS.flatMap(({ x }, i) => [divider(x - WALL), layer(`bin${i}`)]),
    divider(BINS.at(-1).x + BINS.at(-1).w),
    trayFront(),
    layer('air'),
  ],
});

const round = (n) => Math.round(n * 100) / 100;
const data = {
  P,
  period: PERIOD,
  drop: DROP,
  tape: TAPE,
  pieces: FIELDS.map((field, i) => ({
    length: field.length,
    start: STARTS[i],
    // Offsets from the cut position: off the tape line, over the bin, in it.
    path: [
      [0, 22, 0],
      [round(BINS[i].x + 3), round(BIN_Y - 7 - TAPE_Y), -1],
      [round(BINS[i].x + 3), round(BIN_Y - TAPE_Y), FLOOR - TAPE.z],
    ],
  })),
  springs: SPRINGS.map(({ x, y, r }) => ({ x, y, r })),
  spring: { z: SHELF_TOP, top: CARRIAGE_Z, turns: 5 },
  pointers: {
    feed: { x: ROLLERS.x, y: -16, z: ROLLERS.high, r: 3.8, roll: ROLLERS.r },
    spool: { x: SPOOL.x, y: -24.6, z: SPOOL.z, r: 3, roll: SPOOL.r },
  },
};

writeFileSync(
  OUT,
  `// Generated by scripts/anatomy/project-hl7kit.mjs. Do not edit by hand.\n` +
    `export const svg = ${JSON.stringify(svg)};\n` +
    `export const data = ${JSON.stringify(data)} as const;\n`,
);
console.log('wrote', OUT, `${(svg.length / 1024).toFixed(0)} KB`);
