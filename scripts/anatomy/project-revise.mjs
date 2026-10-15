// Builds the Revise project figure for the homepage with the anatomy kit
// (scripts/anatomy/kit, MIT). Run: node scripts/anatomy/project-revise.mjs
//
// A typewriter carriage over a page explains editing a PDF like a doc:
//   page of rule lines        = the PDF, rebuilt into lines and a paragraph
//   carriage on the rail      = the cursor, riding one line of the page
//   typeball striking         = typing a word into the middle of the line
//   words sliding, one wrapping = the paragraph re-wrapping at the margin
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from './kit/iso-kit.mjs';
import * as G from './kit/lathe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../src/components/projectFigures/revise.gen.ts');

const WIDTH = 480;
const HEIGHT = 360;

// ---------------------------------------------------------------- world
const PLATE = { x: -96, y: -60, w: 192, d: 132, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;

// The page lies on a bed; its text is rule lines, one per word.
const BED = { x: -70, y: -58, w: 140, d: 118, r: 2 };
const BED_H = 1.6;
const PAGE = { x: -60, y: -54, w: 120, d: 110, r: 0.6 };
const PAGE_TOP = BED_H + 0.5;
const TEXT_Z = PAGE_TOP;
const MARGIN = PAGE.x + 10;
const MEASURE = 100;

const CH = 2; // one character
const SP = 2.4; // one space
const LINE_STEP = 8;

// The paragraph being edited, as characters per word. Its first line is the
// one the carriage rides; the new word goes in after the third word.
const PARA_Y = -6;
const PARA = [3, 6, 4, 5, 7, 3, 5, 4, 6, 4, 7, 3, 6, 5, 4, 7, 6, 5, 4, 6, 3];
const INSERT_AT = 3;
const TYPED = 6;

// Greedy wrap at the measure: the start of every word, by id.
function wrap(words, top) {
  const lines = [[]];
  let used = 0;
  for (const word of words) {
    if (used && used + SP + word.len > MEASURE) {
      lines.push([]);
      used = 0;
    }
    used += (used ? SP : 0) + word.len;
    lines[lines.length - 1].push(word);
  }
  const at = {};
  lines.forEach((line, n) => {
    let x = MARGIN;
    for (const word of line) {
      at[word.id] = [x, top + n * LINE_STEP];
      x += word.len + SP;
    }
  });
  return { lines, at };
}

// The paragraph with n characters of the new word typed.
function layout(n) {
  const words = PARA.map((chars, id) => ({ id, len: chars * CH }));
  if (n) words.splice(INSERT_AT, 0, { id: 'new', len: n * CH });
  return wrap(words, PARA_Y);
}
const LAYOUTS = Array.from({ length: TYPED + 1 }, (_, n) => layout(n));
const lineOf = (n, id) =>
  Math.round((LAYOUTS[n].at[id][1] - PARA_Y) / LINE_STEP);
const WRAPS = LAYOUTS.slice(1).map((_, n) =>
  PARA.some((_, id) => lineOf(n, id) !== lineOf(n + 1, id)),
);
// The figure shows one word wrapping, on one step, and nothing cascading.
if (
  WRAPS.filter(Boolean).length !== 1 ||
  LAYOUTS[0].lines.length !== LAYOUTS[TYPED].lines.length ||
  PARA.filter((_, id) => lineOf(0, id) !== lineOf(TYPED, id)).length !== 1
)
  throw new Error('the paragraph no longer re-wraps the way the figure shows');
const INSERT_X = LAYOUTS[0].at[INSERT_AT][0];
const MOVING = PARA.map((_, id) => id).filter(
  (id) => LAYOUTS[0].at[id][0] !== LAYOUTS[TYPED].at[id][0],
);

// The rest of the page: a heading, a paragraph above and one below.
const prose = (chars, top) =>
  wrap(
    chars.map((c, id) => ({ id, len: c * CH })),
    top,
  );
const ABOVE = prose(
  [5, 3, 7, 4, 6, 2, 5, 8, 4, 3, 6, 5, 4, 7, 3, 5, 6, 4, 2, 6, 5, 7, 4],
  -34,
);
const BELOW = prose(
  [4, 6, 3, 7, 5, 4, 6, 3, 5, 8, 4, 2, 6, 5, 3, 7, 4, 6, 5, 3, 4],
  PARA_Y + 4 * LINE_STEP,
);

// The rail: end standards on the plate, a back bar with margin stops, and a
// round guide rod the carriage's bushing rides.
const STANDARD_X = 80;
const STANDARD = { y: -50, d: 34, w: 8 };
const STANDARD_TOP = 35;
const BAR = { x: -76, y: -46, w: 152, d: 8, r: 0.8 };
const BAR_Z = 24;
const BAR_TOP = 30;
const ROD = { y: -24, z: 28, r: 2 };
const ROD_END = STANDARD_X - STANDARD.w / 2;
const COLLAR = { r: 3.6, w: 3, at: 66 };

// The carriage, built with the ball at x = 0 and moved along x.
const CAR = { x: -11, y: -47, w: 22, d: 27, r: 1.2 };
const CAR_Z = 31.5;
const CAR_H = 6;
const CAR_TOP = CAR_Z + CAR_H;
const BUSHING = { x: -11, y: -28.2, w: 22, d: 8.4, r: 1 };
const BUSHING_Z = 24.6;
const BALL = { y: PARA_Y, z: PAGE_TOP + 7.6, r: 7 };
const CAP_R = 3;
const CAP_Z = BALL.z + Math.sqrt(BALL.r ** 2 - CAP_R ** 2);
// The typeball's bracket: a mounting block on the body's front face, a
// stout arm out over the line, and a hanger block dropping to a collar that
// holds the ball's post.
const MOUNT = { x: -5.5, y: CAR.y + CAR.d, w: 11, d: 3, r: 0.6 };
const MOUNT_Z = CAR_Z - 1;
const ARM_Z = CAR_Z + 0.5;
const ARM_TOP = ARM_Z + 5;
const ARM = {
  x: -3.5,
  y: MOUNT.y + MOUNT.d,
  w: 7,
  d: BALL.y - 4 - (MOUNT.y + MOUNT.d),
  r: 0.6,
};
const HANGER = { x: -4, y: BALL.y - 4, w: 8, d: 8, r: 1 };
const COLLAR_Z = CAP_Z + 1 + 2.4;
const HANGER_Z = COLLAR_Z + 1.4;
const KNOB = { x: 0, y: -36, r: 4, h: 4 };
// The ball's type rows: height above its centre and characters per row.
const ROWS = [
  [-2.4, 24],
  [0, 24],
  [2.4, 24],
  [4.6, 20],
];

// Ball centre from the left margin to where the new word goes in.
const PARK = MARGIN + CH / 2;
const START = INSERT_X + CH / 2;
const STOP_W = 4;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...k.boxCorners(
      {
        x: -STANDARD_X - 4,
        y: STANDARD.y,
        w: STANDARD_X * 2 + 8,
        d: STANDARD.d,
      },
      0,
      STANDARD_TOP + 2,
    ),
    [0, KNOB.y, CAR_TOP + KNOB.h],
  ],
  WIDTH,
  HEIGHT,
  { pad: 40, azimuth: 52 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const depth = (x, y, z = 0) => k.depthOf([x, y, z], P);
const byDepth = (points) =>
  [...points].sort((a, b) => depth(...a) - depth(...b));
const alongX = (x, y, z) => G.frameAlong([x, y, z], [1, 0, 0]);

// A word is a rule line on the page; its width stands in for the text.
const rule = (x, y, len, tone, extra = '') =>
  `<path class="iso-line" data-tone="${tone}" data-free="" style="stroke-width:1.2"${extra} d="${k.lineOnTop([x + 0.3, y], [x + len - 0.3, y], TEXT_Z, P)}"/>`;

// ---------------------------------------------------------------- parts
function plate() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`,
  ];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
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
    S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), {
      tone: 'mid',
      inner: L(seam, { tone: 'faint' }),
    }),
  );
  out.push(L(k.planOutline(k.insetPlan(PLATE, 4.5), 0, P), { tone: 'lo' }));
  const screws = k.corners(PLATE, 10);
  out.push(
    L(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(''), {
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
  const strip = { x: -84, y: PLATE.y + PLATE.d - 10, w: 104, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const ticks = k.topTicks(
    strip.x + 4,
    strip.x + strip.w - 4,
    2,
    5,
    strip.y + 0.6,
    0.6,
    [1.6, 3],
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
  const label = { x: 40, y: PLATE.y + PLATE.d - 10.5, w: 36, d: 8, r: 1.2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'mid' }));
  out.push(
    L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 4), { tone: 'faint' }),
  );
  [
    [0.32, 20],
    [0.52, 25],
    [0.72, 14],
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
        at([label.x + 2.4, label.y + 2.4, 0.8]),
        at([label.x + label.w - 2.4, label.y + label.d - 2.4, 0.8]),
      ],
      { size: 0.4 },
    ),
  );
  return out.join('');
}

function page() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(BED, 0, BED_H, P)}" style="filter:blur(3px)"/>`,
  ];
  out.push(S(k.slabOf(BED, 0, BED_H, P, 4, 0.4), { tone: 'lo' }));
  // The paper guide the left edge of the sheet is set against.
  const guide = { x: PAGE.x - 3, y: BED.y + 6, w: 2, d: BED.d - 12, r: 0.5 };
  out.push(S(k.slabOf(guide, BED_H, 1.6, P, 2, 0.3), { tone: 'mid' }));
  out.push(
    D(
      [guide.y + 5, guide.y + guide.d - 5].map((y) =>
        at([guide.x + 1, y, BED_H + 1.6]),
      ),
      { size: 0.4 },
    ),
  );
  out.push(
    S(k.slabOf(PAGE, BED_H, 0.5, P, 2), { tone: 'hi', crease: 'faint' }),
  );
  // Margin marks at both margins, rooted on the far and near edges.
  const marks = [MARGIN, MARGIN + MEASURE]
    .flatMap((x) => [
      k.lineOnTop([x, PAGE.y], [x, PAGE.y + 3], PAGE_TOP, P),
      k.lineOnTop([x, PAGE.y + PAGE.d], [x, PAGE.y + PAGE.d - 3], PAGE_TOP, P),
    ])
    .join('');
  out.push(L(marks, { tone: 'mid' }));

  // The heading and the text around the paragraph being edited.
  out.push(
    `<path class="iso-line" data-tone="mid" data-free="" style="stroke-width:1.8" d="${k.lineOnTop([MARGIN + 0.3, -44], [MARGIN + 46, -44], TEXT_Z, P)}"/>`,
  );
  const still = [];
  for (const prose of [ABOVE, BELOW])
    for (const line of prose.lines)
      for (const word of line) {
        const [x, y] = prose.at[word.id];
        still.push(rule(x, y, word.len, 'lo'));
      }
  out.push(still.join(''));
  return out.join('');
}

// The paragraph being edited. Words that never move are drawn once; each word
// that moves is its own path, drawn where it starts and moved from there.
function paragraph() {
  const out = [];
  PARA.forEach((chars, id) => {
    if (MOVING.includes(id)) return;
    const [x, y] = LAYOUTS[0].at[id];
    out.push(rule(x, y, chars * CH, 'mid'));
  });
  for (const id of MOVING) {
    const [x, y] = LAYOUTS[0].at[id];
    out.push(rule(x, y, PARA[id] * CH, 'mid', ` data-word="${id}"`));
  }
  // The word being typed: lit, and redrawn as it grows.
  out.push(
    `<path class="iso-line" data-tone="lit" data-free="" style="stroke-width:1.6" data-typed d=""/>`,
  );
  return out.join('');
}

// The paper bail: a rod with rubber rollers holding the sheet down, on two
// brackets standing on the bed beside the page.
const BAIL = { y: PAGE.y + 5, z: PAGE_TOP + 1.6, x: PAGE.x - 6 };
function bailBracket(x) {
  const plan = { x: x - 2, y: BAIL.y - 2.5, w: 4, d: 5, r: 0.8 };
  return (
    S(k.slabOf(plan, BED_H, BAIL.z + 2 - BED_H, P, 3, 0.3), { tone: 'mid' }) +
    D([at([x, BAIL.y, BAIL.z + 2])], { size: 0.4 })
  );
}
function bail() {
  const out = [bailBracket(BAIL.x - 2)];
  const rollers = [-34, 0, 34];
  const ends = [BAIL.x, ...rollers.flatMap((x) => [x - 3, x + 3]), -BAIL.x];
  // Rod pieces between the rollers, each drawn after the roller behind it.
  for (let n = 0; n < ends.length; n += 2) {
    const F = alongX(ends[n], BAIL.y, BAIL.z);
    out.push(S(G.disc(0, ends[n + 1] - ends[n], 0.7, F, P), { tone: 'mid' }));
    if (n / 2 < rollers.length) {
      const R = alongX(rollers[n / 2] - 3, BAIL.y, BAIL.z);
      out.push(S(G.disc(0, 6, 1.6, R, P), { tone: 'mid', crease: 'lo' }));
    }
  }
  out.push(bailBracket(-BAIL.x + 2));
  return out.join('');
}

function standard(x) {
  const out = [];
  const foot = {
    x: x - 8,
    y: STANDARD.y - 4,
    w: 16,
    d: STANDARD.d + 8,
    r: 1.6,
  };
  out.push(S(k.slabOf(foot, 0, 3, P, 4, 0.5), { tone: 'mid' }));
  out.push(
    D(
      [foot.y + 3, foot.y + foot.d - 3].map((y) => at([x, y, 3])),
      { size: 0.5 },
    ),
  );
  const upright = {
    x: x - STANDARD.w / 2,
    y: STANDARD.y,
    w: STANDARD.w,
    d: STANDARD.d,
    r: 1,
  };
  const seam = k.sideSeam(upright, STANDARD_TOP - 5, P, 3);
  out.push(
    S(k.slabOf(upright, 3, STANDARD_TOP - 3, P, 3, 0.5), {
      tone: 'mid',
      inner: L(seam, { tone: 'faint' }),
    }),
  );
  const cap = k.insetPlan(
    {
      ...upright,
      x: upright.x - 1,
      w: upright.w + 2,
      y: upright.y - 1,
      d: upright.d + 2,
      r: 1.4,
    },
    0,
  );
  out.push(S(k.slabOf(cap, STANDARD_TOP, 2, P, 3, 0.4), { tone: 'mid' }));
  out.push(
    D(
      [cap.y + 4, cap.y + cap.d - 4].map((y) => at([x, y, STANDARD_TOP + 2])),
      { size: 0.45 },
    ),
  );
  return out.join('');
}

function bar() {
  const out = [
    S(k.slabOf(BAR, BAR_Z, BAR_TOP - BAR_Z, P, 3, 0.4), { tone: 'mid' }),
  ];
  // A scale along the bar, ticks hanging from its front edge.
  const ticks = k.topTicks(
    MARGIN - 10,
    MARGIN + MEASURE + 10,
    2,
    5,
    BAR.y + BAR.d,
    BAR_TOP,
    [-1.2, -2.4],
    P,
  );
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
  return out.join('');
}

// A margin stop clamped on the bar: a block, a thumb tab and a screw.
function marginStop(x) {
  const block = { x, y: BAR.y + 0.6, w: STOP_W, d: 5, r: 0.6 };
  const tab = { x: x + 1.2, y: BAR.y + 1.2, w: 1.6, d: 3.8, r: 0.4 };
  return (
    S(k.slabOf(block, BAR_TOP, 3, P, 2, 0.3), { tone: 'mid' }) +
    S(k.slabOf(tab, BAR_TOP + 3, 2.6, P, 2, 0.2), { tone: 'mid' }) +
    D([at([x + STOP_W / 2, BAR.y + 4.6, BAR_TOP + 3])], { size: 0.4 })
  );
}

const rodPiece = (x0, x1) =>
  S(G.disc(0, x1 - x0, ROD.r, alongX(x0, ROD.y, ROD.z), P), {
    tone: 'mid',
    crease: 'lo',
  });

function collar(x) {
  const F = alongX(x, ROD.y, ROD.z);
  return (
    S(G.disc(0, COLLAR.w, COLLAR.r, F, P), { tone: 'mid' }) +
    D([at([x + COLLAR.w / 2, ROD.y, ROD.z + COLLAR.r])], { size: 0.45 })
  );
}

// The carriage, built with the ball's centre at x = 0.
function carriage() {
  // A soft contact shadow on the page under the ball.
  const out = [
    `<path class="iso-halo" d="${k.haloOf({ x: -5, y: BALL.y - 5, w: 10, d: 10, r: 5 }, PAGE_TOP, 0, P)}" style="filter:blur(2px);transform:none;opacity:calc(var(--anatomy-halo-opacity) * 0.6)"/>`,
  ];
  // Back shoe riding the bar, and the bushing block round the rod.
  const shoe = { x: CAR.x, y: BAR.y + 0.4, w: CAR.w, d: 6, r: 0.8 };
  out.push(
    S(k.slabOf(shoe, BAR_TOP, CAR_Z - BAR_TOP, P, 3, 0.3), { tone: 'mid' }),
  );
  const bushingSeam = k.sideSeam(BUSHING, BUSHING_Z + 2, P, 3);
  out.push(
    S(k.slabOf(BUSHING, BUSHING_Z, CAR_Z - BUSHING_Z, P, 3, 0.4), {
      tone: 'mid',
      inner: L(bushingSeam, { tone: 'faint' }),
    }),
  );
  const face = alongX(BUSHING.x + BUSHING.w, ROD.y, ROD.z);
  out.push(L(G.circleOf(face, 0, ROD.r + 0.7, P), { tone: 'lo' }));
  out.push(
    D(
      [BUSHING.y + 1.6, BUSHING.y + BUSHING.d - 1.6].map((y) =>
        at([BUSHING.x + BUSHING.w, y, BUSHING_Z + 1.4]),
      ),
      { size: 0.4 },
    ),
  );

  // Body, with screws at its corners and a seam round its sides.
  const seam = k.sideSeam(CAR, CAR_Z + 2, P, 4);
  out.push(
    S(k.slabOf(CAR, CAR_Z, CAR_H, P, 4, 0.6), {
      tone: 'mid',
      inner: L(seam, { tone: 'faint' }),
    }),
  );
  out.push(
    L(k.planOutline(k.insetPlan(CAR, 1.6), CAR_TOP, P, 4), { tone: 'faint' }),
  );
  out.push(
    D(
      k.corners(CAR, 3.2).map(([x, y]) => at([x, y, CAR_TOP])),
      { size: 0.45 },
    ),
  );

  // The return lever: a boss, an arm out past the front, a ball grip.
  const lever = { x: CAR.x + 1.4, y: CAR.y + 6, w: 2.6, d: CAR.d + 4, r: 0.8 };
  const leverZ = CAR_TOP + 1.2;
  out.push(
    S(k.cylinder(lever.x + 1.3, lever.y + 2, 2.4, CAR_TOP, 1.2, P, 24), {
      tone: 'mid',
    }),
  );
  out.push(S(k.slabOf(lever, leverZ, 1.6, P, 2, 0.3), { tone: 'mid' }));
  out.push(D([at([lever.x + 1.3, lever.y + 2, leverZ + 1.6])], { size: 0.45 }));
  out.push(
    S(
      G.sphereOf(
        [lever.x + 1.3, lever.y + lever.d + 1.6, leverZ + 0.8],
        2.6,
        P,
      ),
      { tone: 'mid', crease: 'lo' },
    ),
  );

  // Knurled knob on top, with a pointer.
  const knobZ = CAR_TOP;
  out.push(
    S(k.cylinder(KNOB.x, KNOB.y, KNOB.r + 1.2, knobZ, 1, P, 32), {
      tone: 'mid',
    }),
  );
  out.push(
    S(k.cylinder(KNOB.x, KNOB.y, KNOB.r, knobZ + 1, KNOB.h, P, 36), {
      tone: 'mid',
    }),
  );
  out.push(
    L(k.knurl(KNOB.x, KNOB.y, KNOB.r, knobZ + 1, knobZ + 1 + KNOB.h, 40, P), {
      tone: 'lo',
    }),
  );
  out.push(
    L(
      k.lineOnTop(
        [KNOB.x, KNOB.y],
        [KNOB.x + KNOB.r * 0.6, KNOB.y + KNOB.r * 0.6],
        knobZ + 1 + KNOB.h,
        P,
      ),
      { tone: 'hi', free: 'end' },
    ),
  );
  out.push(D([at([KNOB.x, KNOB.y, knobZ + 1 + KNOB.h])], { size: 0.5 }));

  // The bracket: mounting block, arm, and the hanger over the line.
  out.push(
    S(k.slabOf(MOUNT, MOUNT_Z, CAR_TOP - MOUNT_Z, P, 2, 0.4), { tone: 'mid' }),
  );
  out.push(
    D(
      [MOUNT.x + 1.6, MOUNT.x + MOUNT.w - 1.6].map((x) =>
        at([x, MOUNT.y + MOUNT.d / 2, CAR_TOP]),
      ),
      { size: 0.45 },
    ),
  );
  out.push(
    S(k.slabOf(ARM, ARM_Z, ARM_TOP - ARM_Z, P, 2, 0.5), {
      tone: 'mid',
      inner: L(k.sideSeam(ARM, ARM_Z + 1.4, P, 2), { tone: 'faint' }),
    }),
  );
  out.push(
    S(k.slabOf(HANGER, HANGER_Z, ARM_TOP - HANGER_Z, P, 3, 0.5), {
      tone: 'mid',
      inner: L(k.sideSeam(HANGER, HANGER_Z + 2, P, 3), { tone: 'faint' }),
    }),
  );
  out.push(
    D(
      k.corners(HANGER, 1.8).map(([x, y]) => at([x, y, ARM_TOP])),
      { size: 0.45 },
    ),
  );
  // The collar under the hanger and the post down to the ball's cap.
  out.push(
    S(k.cylinder(0, BALL.y, 2.6, COLLAR_Z, HANGER_Z - COLLAR_Z, P, 28), {
      tone: 'mid',
    }),
  );
  out.push(
    S(k.cylinder(0, BALL.y, 1.4, CAP_Z, COLLAR_Z - CAP_Z, P, 20), {
      tone: 'mid',
      crease: 'none',
    }),
  );
  out.push(
    `<g data-ball>${S(G.sphereOf([0, BALL.y, BALL.z], BALL.r, P), {
      tone: 'hi',
      crease: 'lo',
    })}${S(k.cylinder(0, BALL.y, CAP_R, CAP_Z, 1, P, 28), {
      tone: 'mid',
    })}${D(ballDots(0), { size: 0.42, tone: 'hi' })}</g>`,
  );
  return out.join('');
}

// The ball's type: dots round its rows, faded toward the limb. The page
// redraws them as the ball turns, with the same sums.
function ballDots(turn) {
  const [vx, vy, vz] = G.viewOf(P);
  const points = [];
  for (const [s, count] of ROWS) {
    const r = Math.sqrt(BALL.r ** 2 - s ** 2);
    for (let n = 0; n < count; n++) {
      const a = turn + (n / count) * Math.PI * 2 + s * 0.3;
      const nx = r * Math.cos(a);
      const ny = r * Math.sin(a);
      const facing = (nx * vx + ny * vy + s * vz) / BALL.r;
      const u = Math.min(1, Math.max(0, (facing - 0.08) / 0.4));
      const [x, y] = at([nx, BALL.y + ny, BALL.z + s]);
      points.push([x, y, u * u * (3 - 2 * u)]);
    }
  }
  return points;
}

// ---------------------------------------------------------------- assemble
// The rod in front of the bushing moves with the carriage. A band along the
// rod clips it, ending under the near collar, so it never pokes past it.
function rodClip() {
  const a = at([-STANDARD_X, ROD.y, ROD.z]);
  const b = at([COLLAR.at + COLLAR.w / 2, ROD.y, ROD.z]);
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = [((a[1] - b[1]) / length) * 9, ((b[0] - a[0]) / length) * 9];
  return k.pathOf(
    [
      [a[0] + n[0], a[1] + n[1]],
      [b[0] + n[0], b[1] + n[1]],
      [b[0] - n[0], b[1] - n[1]],
      [a[0] - n[0], a[1] - n[1]],
    ],
    true,
  );
}

const move = (by) => k.translateAlong(P, by);
const group = (attrs, content) =>
  `<g ${Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${content}</g>`;
const face = BUSHING.x + BUSHING.w;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    'A typewriter carriage on a rail over a printed page. The carriage rides to the middle of a line and its typeball types a new word there; the words after it slide right, the last one no longer fits the margin and wraps to the start of the next line, which shifts along to make room. Then the word is taken back out and the carriage returns.',
  body: [
    plate(),
    page(),
    group({ 'data-paragraph': '' }, paragraph()),
    bail(),
    standard(-STANDARD_X),
    bar(),
    marginStop(PARK - CAR.w / 2 - STOP_W),
    rodPiece(-ROD_END, -COLLAR.at - COLLAR.w),
    collar(-COLLAR.at - COLLAR.w),
    rodPiece(-COLLAR.at, ROD_END),
    group({ 'data-carriage': '', 'transform': move([PARK, 0, 0]) }, carriage()),
    `<clipPath id="rv-rod"><path d="${rodClip()}"/></clipPath>`,
    group(
      { 'clip-path': 'url(#rv-rod)' },
      group(
        { 'data-rod': '', 'transform': move([PARK, 0, 0]) },
        rodPiece(face, face + 2 * ROD_END),
      ),
    ),
    marginStop(MARGIN + MEASURE - CH / 2 + CAR.w / 2),
    collar(COLLAR.at),
    rodPiece(COLLAR.at + COLLAR.w, ROD_END),
    standard(STANDARD_X),
  ],
});

const round = (n) => Math.round(n * 100) / 100;
const data = {
  P,
  park: PARK,
  start: START,
  ch: CH,
  typed: TYPED,
  line: { x: INSERT_X, y: PARA_Y, z: TEXT_Z },
  // Where each moving word sits after each character, from where it's drawn.
  words: MOVING.map((id) => {
    const [x0, y0] = LAYOUTS[0].at[id];
    return {
      id,
      steps: LAYOUTS.map(({ at }) => [
        round(at[id][0] - x0),
        round(at[id][1] - y0),
      ]),
      // Steps where it moves off the typed line, or along the line below:
      // the reflow, which runs slower than the typing.
      slow: LAYOUTS.slice(1).map(
        ({ at }, n) => at[id][1] !== PARA_Y || LAYOUTS[n].at[id][1] !== PARA_Y,
      ),
    };
  }),
  ball: { y: BALL.y, z: BALL.z, r: BALL.r, rows: ROWS },
};

writeFileSync(
  OUT,
  `// Generated by scripts/anatomy/project-revise.mjs. Do not edit by hand.\n` +
    `export const svg = ${JSON.stringify(svg)};\n` +
    `export const data = ${JSON.stringify(data)} as const;\n`,
);
console.log('wrote', OUT, `${(svg.length / 1024).toFixed(0)} KB`);
