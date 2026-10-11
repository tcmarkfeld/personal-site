// Builds the "composing bench" figure for the Revise blog post with the anatomy
// kit (scripts/anatomy/kit, MIT). Run: node scripts/anatomy/revise-bench.mjs
//
// The bench explains Revise as typesetting in reverse:
//   page of sorts at loose positions = the PDF: glyphs at positions, no structure
//   bridge gauge                     = baselines measured; close ones share a line
//   galley with a measure stop       = lines stacked into a paragraph that wraps
//   new sort from the dish           = an edit; the paragraph re-wraps
//   proof roller over paper          = saving: a fresh PDF printed from the model
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from './kit/iso-kit.mjs';
import * as G from './kit/lathe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../src/pages/Blog/posts/reviseBench.gen.ts');

const WIDTH = 600;
const HEIGHT = 360;

// ---------------------------------------------------------------- world
const PLATE = { x: -180, y: -90, w: 370, d: 148, r: 9 };
const PLATE_H = 12;
const FOOT_H = 5;

const TYPE_HIGH = 11.5;
const SORT_D = 11;
const EM = 9;

// "Edit any PDF like a doc." one sort per glyph, plus the "s" the edit adds.
// Words hold glyph indices; the page has no space glyphs, as most PDFs don't.
const GLYPHS = [
  6.2, 5.6, 3, 3.6, 5.4, 5.6, 5.2, 6, 6.6, 5.6, 4.6, 2.6, 3, 5.4, 5.2, 5.4, 5.6,
  5.4, 5, 2.4,
];
const NEW_SORT = 10;
const WORDS = [
  [0, 1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  [11, 12, 13, 14],
  [15],
  [16, 17, 18, 19],
];
const EDITED = WORDS.map((word, n) => (n === 2 ? [...word, NEW_SORT] : word));

// The page: a sheet on a board, two rows of sorts with slightly uneven baselines.
const PAGE = { x: -172, y: -80, w: 112, d: 94, r: 3 };
const PAGE_FLOOR = 2.5;
const SHEET = k.insetPlan(PAGE, 7);
const PAGE_TOP = PAGE_FLOOR + 0.5;
const RAIL_H = 4;
const RAIL_TOP = PAGE_FLOOR + RAIL_H;
const ROWS = [
  {
    y: -60,
    words: [0, 1, 2],
    drift: [0.3, -0.4, 0.6, 0.1, -0.5, 0.2, 0.7, -0.2, 0.4, -0.6],
  },
  {
    y: -38,
    words: [3, 4, 5],
    drift: [-0.3, 0.5, 0.1, -0.6, 0.4, 0.2, -0.4, 0.6, 0],
  },
];
const PAGE_SPOTS = [];
const ROW_OF = [];
for (const [r, row] of ROWS.entries()) {
  let x = SHEET.x + 6;
  let n = 0;
  for (const word of row.words) {
    for (const i of WORDS[word]) {
      PAGE_SPOTS[i] = [x, row.y + row.drift[n++], PAGE_TOP];
      ROW_OF[i] = r;
      x += GLYPHS[i] + 0.4;
    }
    x += 7;
  }
}
// How far apart the baselines in each row sit, in em: what the gauge reads.
const SPREADS = ROWS.map(
  (row) => (Math.max(...row.drift) - Math.min(...row.drift)) / EM,
);

// The bridge gauge rides rails on the board's two side edges.
const BAR_Z = 15.5;
const BAR_TOP = BAR_Z + 1.6;
const BRIDGE_PARK = PAGE.y + 6;
const BRIDGE_ROWS = ROWS.map((row) => row.y + SORT_D / 2);
const DIAL = { x: PAGE.x + PAGE.w - 3, r: 6, z: BAR_TOP, h: 2 };
const DIAL_FACE = DIAL.z + DIAL.h;
const DIAL_LIMIT = 60; // degrees of needle swing at 0.25 em

// The dish of spare sorts the edit takes from.
const DISH = { x: 6, y: 22, r: 13 };
const DISH_FLOOR = 1.2;
const SPARE = [DISH.x + 1.5, DISH.y - 5.5, 5.4];
ROW_OF[NEW_SORT] = 2;
PAGE_SPOTS[NEW_SORT] = [DISH.x - 8, DISH.y - 6, DISH_FLOOR];

// The galley, with a stop at the measure: lines wrap before it.
const GALLEY = { x: 74, y: -70, w: 86, d: 54, r: 2 };
const GALLEY_FLOOR = 2.5;
const GALLEY_RAIL_TOP = 12;
const LINE_STEP = 12.6;
const GALLEY_LINE_X = GALLEY.x + 5;
const GALLEY_LINE_Y = GALLEY.y + 5;
const LINES = 3;
const MEASURE = 60;
const WORD_GAP = 2.6;
const STOP = {
  x: GALLEY_LINE_X + MEASURE + 0.6,
  y: GALLEY.y + 3,
  w: 2.4,
  d: GALLEY.d - 3,
  r: 0.5,
};
const STOP_TOP = 8;

// Greedy line wrap at the measure: where every glyph lands, and the lines.
function wrap(words) {
  const width = (word) => word.reduce((sum, i) => sum + GLYPHS[i], 0);
  const lines = [[]];
  let used = 0;
  for (const word of words) {
    const need = (used ? WORD_GAP : 0) + width(word);
    if (used && used + need > MEASURE) {
      lines.push([]);
      used = 0;
    }
    used += used ? WORD_GAP + width(word) : width(word);
    lines[lines.length - 1].push(word);
  }
  const spots = [];
  lines.forEach((line, n) => {
    let x = GALLEY_LINE_X;
    for (const word of line) {
      for (const i of word) {
        spots[i] = [x, GALLEY_LINE_Y + n * LINE_STEP, GALLEY_FLOOR];
        x += GLYPHS[i];
      }
      x += WORD_GAP;
    }
  });
  return { lines, spots };
}
const BEFORE = wrap(WORDS);
const AFTER = wrap(EDITED);
// The figure depends on the edit pushing "PDFs" down and "doc." onto a third line.
if (BEFORE.lines.length !== 2 || AFTER.lines.length !== LINES)
  throw new Error('measure no longer produces the reflow the figure shows');
// Before it lands, the new sort hovers past the end of "PDF", over the stop.
BEFORE.spots[NEW_SORT] = [
  BEFORE.spots[9][0] + GLYPHS[9],
  BEFORE.spots[9][1],
  GALLEY_FLOOR + 9,
];

const PRESS_RAILS = [
  { x: 66, y: -86, w: 5, d: 74, r: 1 },
  { x: 163, y: -86, w: 5, d: 74, r: 1 },
];
const PRESS_TOP = 13.5;
const ROLLER_R = 7;
const ROLLER_X0 = 64;
const ROLLER_X1 = 170;
const ROLLER_REST_Y = -77;
const ROLLER_END_Y = GALLEY_LINE_Y + LINES * LINE_STEP + 4;
const PAPER = {
  x: 76,
  y: GALLEY.y + 3,
  w: 82,
  d: LINES * LINE_STEP + 4,
  r: 0.6,
};
const PAPER_Z = GALLEY_FLOOR + TYPE_HIGH;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [ROLLER_X1 + 8, ROLLER_REST_Y, PRESS_TOP + ROLLER_R * 2],
    [-120, -40, 34],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 36 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const depth = (x, y, z = 0) => k.depthOf([x, y, z], P);

// ---------------------------------------------------------------- parts
function plate() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`,
  ];
  const feet = k.corners(PLATE, 24).sort((a, b) => depth(...a) - depth(...b));
  for (const [x, y] of feet) {
    out.push(
      S(k.cylinder(x, y, 7.5, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: 'lo' }),
    );
    out.push(
      S(k.cylinder(x, y, 5.6, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), {
        tone: 'mid',
      }),
    );
  }
  const seam = k.sideSeam(PLATE, -PLATE_H + 4, P, 8);
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
  const strip = { x: -166, y: PLATE.y + PLATE.d - 15, w: 150, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const ticks = k.topTicks(
    strip.x + 4,
    strip.x + strip.w - 4,
    4,
    5,
    strip.y + 0.8,
    0.6,
    [2, 3.6],
    P,
  );
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
  out.push(
    D(
      [
        at([strip.x + 2, strip.y + 3.5, 0.6]),
        at([strip.x + strip.w - 2, strip.y + 3.5, 0.6]),
      ],
      { size: 0.45 },
    ),
  );

  // Label plate with three rule lines standing in for printed text.
  const label = { x: 24, y: PLATE.y + PLATE.d - 17, w: 38, d: 11, r: 1.2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'mid' }));
  out.push(
    L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: 'faint' }),
  );
  [
    [0.3, 22],
    [0.52, 28],
    [0.74, 16],
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

function sortSolid(x, y, z, w) {
  const plan = { x, y, w, d: SORT_D, r: 0.4 };
  // The nick: a groove across the front face, as on real type.
  const nick = k.sideSeam(plan, z + TYPE_HIGH * 0.32, P, 2);
  return (
    S(k.slabOf(plan, z, TYPE_HIGH, P, 2, 0.3), {
      tone: 'hi',
      crease: 'lo',
      inner: L(nick, { tone: 'faint' }),
    }) +
    // The raised face that prints.
    L(k.planOutline(k.insetPlan(plan, 1), z + TYPE_HIGH, P, 2), {
      tone: 'faint',
    })
  );
}

const pageRail = (x) => ({ x, y: PAGE.y + 2, w: 3, d: PAGE.d - 4, r: 0.6 });

function pageBack() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(PAGE, 0, RAIL_TOP, P)}" style="filter:blur(3px)"/>`,
  ];
  out.push(S(k.slabOf(PAGE, 0, PAGE_FLOOR, P, 6, 0.5), { tone: 'lo' }));
  const rail = pageRail(PAGE.x + 1);
  out.push(S(k.slabOf(rail, PAGE_FLOOR, RAIL_H, P, 2, 0.4), { tone: 'mid' }));
  out.push(
    S(k.slabOf(SHEET, PAGE_FLOOR, 0.5, P, 2), { tone: 'hi', crease: 'faint' }),
  );
  // The rest of the page, already printed: rules standing in for more text.
  const rest = [64, 70, 58, 72, 40];
  out.push(
    L(
      rest
        .map((length, n) => {
          const y = ROWS[1].y + SORT_D + 9 + n * 5.4;
          return k.lineOnTop(
            [SHEET.x + 6, y],
            [SHEET.x + 6 + length, y],
            PAGE_TOP,
            P,
          );
        })
        .join(''),
      { tone: 'lo', free: true },
    ),
  );
  out.push(
    D(
      [rail.y + 6, rail.y + rail.d - 6].map((y) =>
        at([rail.x + 1.5, y, RAIL_TOP]),
      ),
      { size: 0.4 },
    ),
  );
  return out.join('');
}

function pageFront() {
  const rail = pageRail(PAGE.x + PAGE.w - 4);
  return (
    S(k.slabOf(rail, PAGE_FLOOR, RAIL_H, P, 2, 0.4), { tone: 'mid' }) +
    D(
      [rail.y + 6, rail.y + rail.d - 6].map((y) =>
        at([rail.x + 1.5, y, RAIL_TOP]),
      ),
      { size: 0.4 },
    ) +
    // A scale up the rail, for the gauge's travel.
    L(
      Array.from({ length: 18 }, (_, n) => {
        const y = rail.y + 10 + n * 4;
        const long = n % 4 === 0 ? 1.8 : 0.9;
        return k.lineOnTop(
          [rail.x + 3 - long, y],
          [rail.x + 3, y],
          RAIL_TOP,
          P,
        );
      }).join(''),
      { tone: 'lo' },
    )
  );
}

// The bridge gauge, drawn parked: two riders, a crossbar over the sorts, and a
// dial on the near rider that reads how far apart the baselines under it sit.
function bridge() {
  const y = BRIDGE_PARK;
  const out = [];
  const rider = (x) => ({ x, y: y - 4, w: 5, d: 8, r: 0.8 });
  out.push(
    S(k.slabOf(rider(PAGE.x + 0.5), RAIL_TOP, BAR_TOP - RAIL_TOP, P, 3, 0.4), {
      tone: 'mid',
    }),
  );
  out.push(
    S(
      k.slabOf(
        { x: PAGE.x + 3, y: y - 1, w: PAGE.w - 6, d: 2, r: 0.4 },
        BAR_Z,
        BAR_TOP - BAR_Z,
        P,
        2,
        0.3,
      ),
      { tone: 'mid' },
    ),
  );
  out.push(
    S(
      k.slabOf(
        rider(PAGE.x + PAGE.w - 5.5),
        RAIL_TOP,
        BAR_TOP - RAIL_TOP,
        P,
        3,
        0.4,
      ),
      { tone: 'mid' },
    ),
  );
  out.push(
    S(k.cylinder(DIAL.x, y, DIAL.r, DIAL.z, DIAL.h, P, 36), { tone: 'mid' }),
  );
  out.push(
    L(k.knurl(DIAL.x, y, DIAL.r, DIAL.z, DIAL_FACE, 30, P), { tone: 'lo' }),
  );
  out.push(
    L(k.ring(DIAL.x, y, DIAL.r - 0.8, DIAL_FACE, P, 36), { tone: 'faint' }),
  );
  const minor = [];
  const major = [];
  for (let a = -90; a <= 90; a += 15) {
    const limit = Math.abs(a) === DIAL_LIMIT || a === 0;
    const r0 = DIAL.r - (limit ? 2.4 : 1.6);
    const r1 = DIAL.r - 0.9;
    const s = Math.sin(a * (Math.PI / 180));
    const c = Math.cos(a * (Math.PI / 180));
    (limit ? major : minor).push(
      k.lineOnTop(
        [DIAL.x + r0 * s, y - r0 * c],
        [DIAL.x + r1 * s, y - r1 * c],
        DIAL_FACE,
        P,
      ),
    );
  }
  out.push(
    L(minor.join(''), { tone: 'lo' }),
    L(major.join(''), { tone: 'mid' }),
  );
  out.push(`<path class="iso-line" data-tone="hi" data-needle d=""/>`);
  out.push(D([at([DIAL.x, y, DIAL_FACE])], { size: 0.6 }));
  return out.join('');
}

function dish() {
  return (
    `<path class="iso-halo" d="${k.haloOf({ x: DISH.x - DISH.r, y: DISH.y - DISH.r, w: DISH.r * 2, d: DISH.r * 2, r: DISH.r }, 0, 3, P)}" style="filter:blur(3px)"/>` +
    S(k.cylinder(DISH.x, DISH.y, DISH.r, 0, 3, P, 40), { tone: 'mid' }) +
    L(k.ring(DISH.x, DISH.y, DISH.r - 1.6, 3, P, 40), { tone: 'lo' })
  );
}

function galleyMeasure() {
  const ticks = k.topTicks(
    GALLEY_LINE_X,
    STOP.x,
    2,
    5,
    GALLEY.y + 1.5,
    GALLEY_RAIL_TOP,
    [0.9, 1.8],
    P,
  );
  return L(ticks.minor, { tone: 'lo' }) + L(ticks.major, { tone: 'mid' });
}

function galleyStop() {
  return (
    S(k.slabOf(STOP, GALLEY_FLOOR, STOP_TOP - GALLEY_FLOOR, P, 2, 0.4), {
      tone: 'mid',
    }) +
    D(
      [STOP.y + 6, STOP.y + STOP.d - 6].map((y) =>
        at([STOP.x + STOP.w / 2, y, STOP_TOP]),
      ),
      { size: 0.4 },
    )
  );
}

// An ink slab: a glass plate on four feet with ink rolled out and a brayer resting on it.
const SLAB = { x: -40, y: -70, w: 78, d: 50, r: 2.5 };
function inkSlab() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(SLAB, 0, 3, P)}" style="filter:blur(3px)"/>`,
  ];
  const feet = k.corners(SLAB, 6).sort((a, b) => depth(...a) - depth(...b));
  for (const [x, y] of feet)
    out.push(S(k.cylinder(x, y, 2.4, 0, 1.4, P, 16), { tone: 'lo' }));
  out.push(S(k.slabOf(SLAB, 1.4, 2.2, P, 6, 0.6), { tone: 'mid' }));
  out.push(
    L(k.planOutline(k.insetPlan(SLAB, 3), 3.6, P, 6), { tone: 'faint' }),
  );
  const ink = { x: SLAB.x + 8, y: SLAB.y + 8, w: 40, d: 26, r: 6 };
  out.push(
    S(k.slabOf(ink, 3.6, 0.3, P, 8), {
      tone: 'lo',
      crease: 'none',
      flat: true,
    }),
  );
  // The brayer: a short roller on a fork, its handle resting on the glass.
  const zc = 3.6 + 4;
  const F = G.frameAlong([SLAB.x + 52, SLAB.y + 30, zc], [0, 1, 0]);
  out.push(S(G.disc(-1.2, 0, 1.6, F, P), { tone: 'mid' }));
  out.push(S(G.disc(0, 14, 4, F, P), { tone: 'hi', crease: 'lo' }));
  out.push(S(G.disc(14, 15.2, 1.6, F, P), { tone: 'mid' }));
  out.push(
    S(
      k.slabOf(
        { x: SLAB.x + 50.4, y: SLAB.y + 27, w: 3.2, d: 1.6, r: 0.4 },
        zc,
        4.2,
        P,
        2,
      ),
      { tone: 'mid', crease: 'none' },
    ),
  );
  out.push(
    S(
      k.slabOf(
        { x: SLAB.x + 50.4, y: SLAB.y + 45.6, w: 3.2, d: 1.6, r: 0.4 },
        zc,
        4.2,
        P,
        2,
      ),
      { tone: 'mid', crease: 'none' },
    ),
  );
  out.push(
    S(
      k.slabOf(
        { x: SLAB.x + 50.4, y: SLAB.y + 27, w: 3.2, d: 20.2, r: 0.6 },
        zc + 4.2,
        1.6,
        P,
        2,
      ),
      { tone: 'mid' },
    ),
  );
  const H = G.frameAlong([SLAB.x + 53.6, SLAB.y + 37, zc + 5], [1, 0, -0.22]);
  out.push(
    S(
      G.solidOf(
        [
          [0, 1.2],
          [2, 1.6, 1],
          [14, 2, 1],
          [18, 1.4],
        ],
        H,
        P,
      ),
      { tone: 'mid' },
    ),
  );
  return out.join('');
}

function pressRail(rail) {
  const out = [S(k.slabOf(rail, 0, PRESS_TOP, P, 3, 0.5), { tone: 'mid' })];
  for (const y of [rail.y, rail.y + rail.d - 5]) {
    out.push(
      S(
        k.slabOf(
          { x: rail.x - 0.6, y, w: rail.w + 1.2, d: 5, r: 0.8 },
          PRESS_TOP,
          4.5,
          P,
          3,
          0.4,
        ),
        { tone: 'mid' },
      ),
    );
    out.push(
      D([at([rail.x + rail.w / 2, y + 2.5, PRESS_TOP + 4.5])], { size: 0.45 }),
    );
  }
  out.push(
    D(
      [rail.y + 14, rail.y + rail.d / 2, rail.y + rail.d - 14].map((y) =>
        at([rail.x + rail.w / 2, y, PRESS_TOP]),
      ),
      { size: 0.4, tone: 'lo' },
    ),
  );
  return out.join('');
}

function galleyBack() {
  const out = [];
  out.push(
    `<path class="iso-halo" d="${k.haloOf(GALLEY, 0, GALLEY_RAIL_TOP, P)}" style="filter:blur(3px)"/>`,
  );
  out.push(S(k.slabOf(GALLEY, 0, GALLEY_FLOOR, P, 4, 0.5), { tone: 'lo' }));
  out.push(
    S(
      k.slabOf(
        { x: GALLEY.x, y: GALLEY.y, w: GALLEY.w, d: 3, r: 0.6 },
        GALLEY_FLOOR,
        GALLEY_RAIL_TOP - GALLEY_FLOOR,
        P,
        3,
        0.4,
      ),
      { tone: 'mid' },
    ),
  );
  out.push(
    S(
      k.slabOf(
        { x: GALLEY.x, y: GALLEY.y, w: 3, d: GALLEY.d, r: 0.6 },
        GALLEY_FLOOR,
        GALLEY_RAIL_TOP - GALLEY_FLOOR,
        P,
        3,
        0.4,
      ),
      { tone: 'mid' },
    ),
  );
  out.push(
    D(
      [
        at([GALLEY.x + 1.5, GALLEY.y + 8, GALLEY_RAIL_TOP]),
        at([GALLEY.x + 1.5, GALLEY.y + GALLEY.d - 8, GALLEY_RAIL_TOP]),
        at([GALLEY.x + GALLEY.w - 8, GALLEY.y + 1.5, GALLEY_RAIL_TOP]),
      ],
      { size: 0.45 },
    ),
  );
  return out.join('');
}

function galleyFront() {
  const right = {
    x: GALLEY.x + GALLEY.w - 3,
    y: GALLEY.y,
    w: 3,
    d: GALLEY.d,
    r: 0.6,
  };
  return (
    S(
      k.slabOf(right, GALLEY_FLOOR, GALLEY_RAIL_TOP - GALLEY_FLOOR, P, 3, 0.4),
      { tone: 'mid' },
    ) +
    D(
      [
        at([right.x + 1.5, right.y + 8, GALLEY_RAIL_TOP]),
        at([right.x + 1.5, right.y + right.d - 8, GALLEY_RAIL_TOP]),
      ],
      { size: 0.45 },
    )
  );
}

function roller() {
  const zc = PRESS_TOP + ROLLER_R;
  const F = G.frameAlong([ROLLER_X0, 0, zc], [1, 0, 0]);
  const out = [];
  out.push(S(G.disc(-4, 0, 2, F, P), { tone: 'mid' }));
  out.push(S(G.disc(0, 3, ROLLER_R + 0.6, F, P), { tone: 'mid' }));
  out.push(
    S(G.disc(3, ROLLER_X1 - ROLLER_X0 - 3, ROLLER_R, F, P), {
      tone: 'hi',
      crease: 'lo',
    }),
  );
  out.push(
    L([20, 40, 60, 80].map((s) => G.arcOf(F, s + 3, ROLLER_R, P)).join(''), {
      tone: 'faint',
    }),
  );
  out.push(
    S(
      G.disc(
        ROLLER_X1 - ROLLER_X0 - 3,
        ROLLER_X1 - ROLLER_X0,
        ROLLER_R + 0.6,
        F,
        P,
      ),
      { tone: 'mid' },
    ),
  );
  out.push(
    S(G.disc(ROLLER_X1 - ROLLER_X0, ROLLER_X1 - ROLLER_X0 + 3, 2, F, P), {
      tone: 'mid',
    }),
  );
  // Wooden handle on the near end.
  out.push(
    S(
      G.solidOf(
        [
          [ROLLER_X1 - ROLLER_X0 + 3, 2.6],
          [ROLLER_X1 - ROLLER_X0 + 6, 3.2, 1],
          [ROLLER_X1 - ROLLER_X0 + 11, 3, 1],
          [ROLLER_X1 - ROLLER_X0 + 13, 2.4],
        ],
        F,
        P,
      ),
      { tone: 'mid' },
    ),
  );
  return out.join('');
}

// Printed proofs: the saved PDFs, stacked in a shallow tray.
const TRAY = { x: 84, y: -4, w: 72, d: 44, r: 2 };
function proofTray() {
  const out = [
    `<path class="iso-halo" d="${k.haloOf(TRAY, 0, 4, P)}" style="filter:blur(3px)"/>`,
  ];
  out.push(S(k.slabOf(TRAY, 0, 1.6, P, 4, 0.4), { tone: 'lo' }));
  out.push(
    S(
      k.slabOf({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: 2, r: 0.5 }, 1.6, 3, P, 2),
      { tone: 'mid' },
    ),
  );
  out.push(
    S(
      k.slabOf({ x: TRAY.x, y: TRAY.y, w: 2, d: TRAY.d, r: 0.5 }, 1.6, 3, P, 2),
      { tone: 'mid' },
    ),
  );
  const sheets = [
    [0, 0],
    [1.4, -0.8],
    [-0.6, 0.9],
    [0.8, 0.3],
  ];
  sheets.forEach(([dx, dy], n) => {
    const sheet = {
      x: TRAY.x + 6 + dx,
      y: TRAY.y + 5 + dy,
      w: 56,
      d: 34,
      r: 0.4,
    };
    out.push(
      S(k.slabOf(sheet, 1.6 + n * 0.7, 0.7, P, 2), {
        tone: 'hi',
        crease: 'faint',
      }),
    );
  });
  const top = {
    x: TRAY.x + 6.8,
    y: TRAY.y + 5.3,
    z: 1.6 + sheets.length * 0.7,
  };
  const rules = [
    [0, 30],
    [0, 44],
    [0, 38],
    [0, 24],
    [0, 41],
    [0, 33],
  ];
  out.push(
    L(
      rules
        .map(([, length], n) =>
          k.lineOnTop(
            [top.x + 5, top.y + 6 + n * 4.3],
            [top.x + 5 + length, top.y + 6 + n * 4.3],
            top.z,
            P,
          ),
        )
        .join(''),
      { tone: 'lo', free: true },
    ),
  );
  out.push(
    S(
      k.slabOf(
        { x: TRAY.x + TRAY.w - 2, y: TRAY.y, w: 2, d: TRAY.d, r: 0.5 },
        1.6,
        3,
        P,
        2,
      ),
      { tone: 'mid' },
    ),
  );
  out.push(
    S(
      k.slabOf(
        { x: TRAY.x, y: TRAY.y + TRAY.d - 2, w: TRAY.w, d: 2, r: 0.5 },
        1.6,
        3,
        P,
        2,
      ),
      { tone: 'mid' },
    ),
  );
  out.push(
    D(
      k.corners(TRAY, 2.6).map(([x, y]) => at([x, y, 4.6])),
      { size: 0.4 },
    ),
  );
  return out.join('');
}

function paper() {
  return S(k.slabOf(PAPER, PAPER_Z, 0.6, P, 2), {
    tone: 'hi',
    crease: 'faint',
  });
}

// The printed text: one rule per word, in the re-wrapped lines.
function printedRules() {
  const out = [];
  AFTER.lines.forEach((line) => {
    for (const word of line) {
      const first = AFTER.spots[word[0]];
      const last = word[word.length - 1];
      const y = first[1] + SORT_D / 2;
      out.push(
        k.lineOnTop(
          [first[0] + 0.6, y],
          [AFTER.spots[last][0] + GLYPHS[last] - 0.6, y],
          PAPER_Z + 0.6,
          P,
        ),
      );
    }
  });
  return L(out.join(''), { tone: 'hi', free: true });
}

// ---------------------------------------------------------------- assemble
const move = (point) => k.translateAlong(P, point);
const group = (attrs, content) =>
  `<g ${Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${content}</g>`;
const minus = (a, b) => a.map((n, i) => n - b[i]);

// Each sort is drawn once, at its place in the edited paragraph, and moved
// from there. The animation moves it between these layers as it travels.
const sorts = GLYPHS.map((w, i) => {
  const base = AFTER.spots[i];
  return group(
    { 'data-sort': i, 'transform': move(minus(PAGE_SPOTS[i], base)) },
    sortSolid(base[0], base[1], base[2], w),
  );
});
const layer = (name, content = '') => group({ 'data-layer': name }, content);
const onPage = sorts.filter((_, i) => i !== NEW_SORT).join('');

const pressRailsSorted = [...PRESS_RAILS].sort(
  (a, b) => depth(a.x, 0) - depth(b.x, 0),
);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    'A letterpress bench. Type sorts sit on a printed page at loose positions with slightly uneven baselines. A gauge slides over each row and measures the baselines; rows that line up are set as lines in a galley, which stacks them into a paragraph. A new sort is added to the first line, it no longer fits before the galley’s measure stop, and the words re-wrap onto the next lines. A proof roller then presses paper over the galley to print it.',
  body: [
    plate(),
    pageBack(),
    layer('page', onPage),
    pageFront(),
    group({ 'data-bridge': '' }, bridge()),
    inkSlab(),
    dish(),
    layer('dish', sorts[NEW_SORT]),
    sortSolid(SPARE[0], SPARE[1], DISH_FLOOR, SPARE[2]),
    pressRail(pressRailsSorted[0]),
    galleyBack(),
    galleyMeasure(),
    layer('galley'),
    galleyStop(),
    group(
      { 'data-paper': '', 'style': 'opacity:0' },
      paper() +
        `<clipPath id="rb-printed"><path data-printed-clip d=""/></clipPath><g clip-path="url(#rb-printed)">${printedRules()}</g>`,
    ),
    galleyFront(),
    pressRail(pressRailsSorted[1]),
    group(
      { 'data-roller': '', 'transform': move([0, ROLLER_REST_Y, 0]) },
      roller(),
    ),
    proofTray(),
    layer('air'),
  ],
});

const body = k.plateHtml({
  fig: 'Fig 1',
  title: 'Composing bench',
  hint: 'Hover to pause · ← → to step',
  readout: 'Opening · PDFium reads each glyph and its position',
  keys: [
    { mark: 'lit', label: 'Glyphs being measured or placed' },
    { mark: 'raised', label: 'Type sorts, one per glyph' },
  ],
  caption:
    'A PDF is a page of glyphs at positions and nothing else. Revise measures them: glyphs whose baselines sit within a quarter em share a line, and a line joins the one above only when its first word wouldn’t have fit there. That makes an editable paragraph, so adding a letter re-wraps the lines instead of running off the end. Saving prints a fresh PDF from it.',
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Composing bench: arrow keys step through opening, measuring, setting lines, editing, reflowing, and saving">${svg}</div>`,
});

const round = (point) => point.map((n) => Math.round(n * 100) / 100);
const data = {
  P,
  sorts: GLYPHS.map((_, i) => ({
    row: ROW_OF[i],
    page: round(PAGE_SPOTS[i]),
    before: round(BEFORE.spots[i]),
    after: round(AFTER.spots[i]),
  })),
  bridge: {
    rows: BRIDGE_ROWS.map((y) => y - BRIDGE_PARK),
    readings: SPREADS.map((spread) => (spread / 0.25) * DIAL_LIMIT),
  },
  dial: { x: DIAL.x, y: BRIDGE_PARK, z: DIAL_FACE, r: DIAL.r - 1.4 },
  rollerRestY: ROLLER_REST_Y,
  rollerEndY: ROLLER_END_Y,
  paper: {
    x0: PAPER.x - 4,
    x1: PAPER.x + PAPER.w + 4,
    y0: PAPER.y - 2,
    z: PAPER_Z + 0.6,
  },
};

writeFileSync(
  OUT,
  `// Generated by scripts/anatomy/revise-bench.mjs. Do not edit by hand.\n` +
    `export const benchHtml = ${JSON.stringify(body)};\n` +
    `export const bench = ${JSON.stringify(data)} as const;\n`,
);
console.log('wrote', OUT, `${(body.length / 1024).toFixed(0)} KB`);
