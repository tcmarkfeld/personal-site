// Builds the Conductor project figure with the anatomy kit (scripts/anatomy/kit,
// MIT). Run: node scripts/anatomy/project-conductor.mjs
//
// Front left, the app's messaging config lying flat: two queues and a topic.
// Back right, the IAM policy Conductor writes for it, standing on a stand. Each
// entry sends one chip across and fills exactly one statement row, so the
// policy grants what the app uses and no more.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from './kit/iso-kit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../src/components/projectFigures/conductor.gen.ts');

const WIDTH = 480;
const HEIGHT = 360;

// ---------------------------------------------------------------- world
const BASE_H = 3;
const TOP = BASE_H + 1; // the config sheet's face
const CONFIG = { x: -64, y: 0, w: 60, d: 58, r: 3 };
const ENTRY_Y = [20, 33, 46].map((y) => CONFIG.y + y);
const KINDS = ['queue', 'queue', 'topic'];
const ICON_X = CONFIG.x + 9;

// The policy page stands in its stand with its face toward +y.
const STAND = { x: -22, y: -32, w: 60, d: 14, r: 3 };
const PAGE = { x: -18, y: -26.5, w: 52, d: 2.5, r: 0.4 };
const PAGE_H = 60;
const FACE_Y = PAGE.y + PAGE.d;
const HEADER_Z = BASE_H + 50;
const ROW_Z = [38, 27, 16].map((z) => BASE_H + z);
const SLOT_X = PAGE.x + 6;
const CHIP = { w: 7, d: 2.2, h: 5 };
const ARC = 16;

const P = k.fitProjection(
  [
    ...k.boxCorners(CONFIG, 0, TOP),
    ...k.boxCorners(STAND, 0, BASE_H),
    ...k.boxCorners(PAGE, BASE_H, BASE_H + PAGE_H),
  ],
  WIDTH,
  HEIGHT,
  { pad: 70 },
);

const slab = (plan, z, h, opts) => k.solidSvg(k.slabOf(plan, z, h, P), opts);
const flatLine = (from, to, opts) =>
  k.lineSvg(k.lineOnTop(from, to, TOP, P), opts);
const onFace = (x, z) => k.iso([x, FACE_Y, z], P);
const faceLine = (x0, x1, z, opts) =>
  k.lineSvg(k.pathOf([onFace(x0, z), onFace(x1, z)]), opts);

// A queue: a tray holding a short row of message tiles, drawn back to front.
function queue(y) {
  const tray = { x: ICON_X, y: y - 4, w: 13, d: 8, r: 1 };
  const tiles = [0, 1, 2].map((i) =>
    slab(
      { x: ICON_X + 1.6 + i * 3.6, y: y - 3, w: 2.6, d: 6, r: 0.4 },
      TOP + 1.2,
      3.4,
      { tone: 'hi' },
    ),
  );
  return {
    svg: slab(tray, TOP, 1.2, { tone: 'mid' }) + tiles.join(''),
    chip: [ICON_X + 3, y - CHIP.d / 2, TOP + 4.6],
  };
}

// A topic: a hub with three stubs fanning out toward the rule.
function topic(y) {
  const hub = [ICON_X + 3.5, y];
  const stubs = [-40, 0, 40].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const at = (r) =>
      k.iso([hub[0] + r * Math.cos(a), hub[1] + r * Math.sin(a), TOP], P);
    return k.wireSvg(at(2), at(9.5), { tone: 'mid', ends: 'to', size: 0.9 });
  });
  return {
    svg:
      stubs.join('') +
      k.solidSvg(k.cylinder(...hub, 3, TOP, 4, P, 28), { tone: 'hi' }),
    chip: [hub[0] - CHIP.w / 2, y - CHIP.d / 2, TOP + 4],
  };
}

const entries = ENTRY_Y.map((y, i) =>
  (KINDS[i] === 'queue' ? queue : topic)(y),
);

const config = [
  slab(CONFIG, 0, BASE_H, { tone: 'lo', halo: true }),
  slab(k.insetPlan(CONFIG, 4), BASE_H, 1, { tone: 'mid' }),
  flatLine([ICON_X, CONFIG.y + 9], [ICON_X + 20, CONFIG.y + 9], {
    tone: 'mid',
    free: true,
  }),
  ...entries.map(
    ({ svg }, i) =>
      k.groupSvg(svg, { 'data-entry': i }) +
      flatLine(
        [ICON_X + 17, ENTRY_Y[i]],
        [CONFIG.x + CONFIG.w - 9, ENTRY_Y[i]],
        { tone: 'lo', free: true },
      ),
  ),
];

// A padlock in the page's header, its shackle seated on the body's top.
function lock() {
  const body = { x: SLOT_X - 0.5, y: FACE_Y, w: 8, d: 3, r: 0.6 };
  const [cx, cy, top] = [SLOT_X + 3.5, FACE_Y + 1.5, HEADER_Z + 3];
  const shackle = Array.from({ length: 17 }, (_, n) => {
    const a = (n / 16) * Math.PI;
    return k.iso([cx + 2.6 * Math.cos(a), cy, top + 2 + 2.6 * Math.sin(a)], P);
  });
  shackle.unshift(k.iso([cx + 2.6, cy, top], P));
  shackle.push(k.iso([cx - 2.6, cy, top], P));
  return (
    slab(body, HEADER_Z - 3, 6, { tone: 'hi' }) +
    k.lineSvg(k.pathOf(shackle), { tone: 'hi' })
  );
}

const rowEnd = PAGE.x + PAGE.w - 6;
const policy = [
  slab(STAND, 0, BASE_H, { tone: 'lo', halo: true }),
  slab(PAGE, BASE_H, PAGE_H, { tone: 'mid' }),
  lock(),
  faceLine(SLOT_X + 12, SLOT_X + 32, HEADER_Z, { tone: 'mid', free: true }),
  ...ROW_Z.map((z, i) => {
    const [x0, x1] = [SLOT_X - 0.5, SLOT_X + 7.5];
    const slot = [
      onFace(x0, z - 3),
      onFace(x1, z - 3),
      onFace(x1, z + 3),
      onFace(x0, z + 3),
    ];
    return (
      k.lineSvg(k.pathOf(slot, true), { tone: 'faint' }) +
      faceLine(SLOT_X + 12, rowEnd, z, { tone: 'faint', free: true }) +
      faceLine(SLOT_X + 12, rowEnd, z, { tone: 'hi', free: true }).replace(
        '<path',
        `<path data-fill="${i}" pathLength="1" stroke-dasharray="1 1"`,
      )
    );
  }),
];

// Each chip is built where it lands; the live code offsets it back to its entry.
const landing = ROW_Z.map((z) => [SLOT_X, FACE_Y, z - CHIP.h / 2]);
const chips = landing.map(([x, y, z], i) =>
  k.groupSvg(slab({ x, y, ...CHIP, r: 0.5 }, z, CHIP.h, { tone: 'hi' }), {
    'data-chip': i,
  }),
);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    'An app’s messaging config, two queues and a topic, lies beside an empty IAM policy standing on a stand. One entry at a time lights up and sends a chip across to the policy, where it fills exactly one statement row, until the policy holds three permissions for the three things the app uses.',
  body: [...policy, ...config, ...chips],
});

const fine = ([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
const data = {
  P,
  // Screen offset from each chip's landing back to its entry, and one unit up.
  from: entries.map(({ chip }, i) =>
    fine(
      k.axisVector(
        P,
        chip.map((v, n) => v - landing[i][n]),
      ),
    ),
  ),
  rise: fine(k.axisVector(P, [0, 0, 1])),
  arc: ARC,
};

writeFileSync(
  OUT,
  `// Generated by scripts/anatomy/project-conductor.mjs. Do not edit by hand.\n` +
    `export const svg = ${JSON.stringify(svg)};\n` +
    `export const data = ${JSON.stringify(data)} as const;\n`,
);
console.log('wrote', OUT, `${(svg.length / 1024).toFixed(0)} KB`);
