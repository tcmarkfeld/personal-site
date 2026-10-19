// Builds the Revise project figure for the homepage with the anatomy kit
// (scripts/anatomy/kit, MIT). Run: node scripts/anatomy/project-revise.mjs
//
// An open PDF page on a base plate. A word is typed into the second
// paragraph: the words after it shift right, the last word of the line wraps
// to the next line, and the edit is undone again.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from './kit/iso-kit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../src/components/projectFigures/revise.gen.ts');

const WIDTH = 480;
const HEIGHT = 360;

// ---------------------------------------------------------------- world
const PLATE = { x: -58, y: -70, w: 116, d: 140, r: 6 };
const PLATE_H = 5;
const PAGE = { x: -44, y: -56, w: 88, d: 112 };
const PAGE_H = 1;
const FOLD = 12;
const TOP = PAGE_H;

const MARGIN = PAGE.x + 10;
const MEASURE = PAGE.w - 20;
const CH = 1.6;
const SP = 2;
const LINE = 5.6;

// The paragraph being edited, as characters per word; the new word goes in
// before word INSERT_AT on its first line.
const PARA = [5, 3, 7, 4, 2, 5, 5, 4, 3, 6, 2, 5, 3, 4, 8, 3, 5, 4, 6, 2];
const PARA_Y = -14;
const INSERT_AT = 3;
const TYPED = 5;

// Greedy wrap at the measure: where each word starts, by id.
function wrap(words, top) {
  const at = {};
  let [x, y] = [MARGIN, top];
  for (const { id, len } of words) {
    if (x > MARGIN && x + len > MARGIN + MEASURE) [x, y] = [MARGIN, y + LINE];
    at[id] = [x, y];
    x += len + SP;
  }
  return at;
}
const words = (chars) => chars.map((c, id) => ({ id, len: c * CH }));

// The paragraph with n characters of the new word typed.
function layout(n) {
  const list = words(PARA);
  if (n) list.splice(INSERT_AT, 0, { id: 'new', len: n * CH });
  return wrap(list, PARA_Y);
}
const LAYOUTS = Array.from({ length: TYPED + 1 }, (_, n) => layout(n));
const [INSERT_X] = LAYOUTS[0][INSERT_AT];
const MOVING = PARA.map((_, id) => id).filter(
  (id) => LAYOUTS[0][id].join() !== LAYOUTS[TYPED][id].join(),
);

const P = k.fitProjection(k.boxCorners(PLATE, -PLATE_H, TOP), WIDTH, HEIGHT, {
  pad: 62,
  azimuth: 58,
  elevation: 38,
});
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);

// A word is a rule line on the page; its length stands in for the text.
const ruleOf = (x, y, len) =>
  k.lineOnTop([x + 0.3, y], [x + len - 0.3, y], TOP, P);
const rules = (d, tone, extra = '', width = 1.3) =>
  `<path class="iso-line" data-tone="${tone}" data-free="" style="stroke-width:${width}"${extra} d="${d}"/>`;

// ---------------------------------------------------------------- parts
function plate() {
  const screws = k.corners(PLATE, 7);
  return [
    S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 6, 1.2), {
      tone: 'lo',
      halo: true,
      inner: L(k.sideSeam(PLATE, -PLATE_H + 1.8, P, 6), { tone: 'faint' }),
    }),
    L(k.planOutline(k.insetPlan(PLATE, 3.5), 0, P, 6), { tone: 'faint' }),
    L(screws.map(([x, y]) => k.ring(x, y, 1.8, 0, P, 16)).join(''), {
      tone: 'lo',
    }),
    k.dotsSvg(
      screws.map(([x, y]) => at([x, y, 0])),
      { size: 0.5 },
    ),
  ].join('');
}

// The sheet, its far right corner folded over onto the page.
function page() {
  const { x, y, w, d } = PAGE;
  const sheet = [
    [x, y],
    [x + w - FOLD, y],
    [x + w, y + FOLD],
    [x + w, y + d],
    [x, y + d],
  ];
  const flap = [
    [x + w - FOLD, y],
    [x + w, y + FOLD],
    [x + w - FOLD, y + FOLD],
  ];
  return [
    `<path class="iso-halo" d="${k.extrude(sheet, 0, PAGE_H, P).fill}" style="filter:blur(4px)"/>`,
    S(k.extrude(sheet, 0, PAGE_H, P), { tone: 'hi' }),
    S(k.extrude(flap, TOP, 0.3, P), { tone: 'mid', crease: 'none' }),
    k.faceTextSvg(k.topMatrix([MARGIN, y + 8.6], TOP, P), 'PDF', {
      size: 3.2,
      tone: 'mid',
    }),
  ].join('');
}

// The heading, the paragraph above, the edited one and the one below.
function text() {
  const still = [];
  const prose = (chars, top) => {
    const where = wrap(words(chars), top);
    words(chars).forEach(({ id, len }) =>
      still.push(ruleOf(...where[id], len)),
    );
  };
  prose([4, 6, 3, 7, 5, 2, 6, 4, 5, 3, 7, 4, 6, 5, 3, 4], -32);
  prose([6, 4, 5, 3, 7, 4, 2, 6, 5, 4, 3, 7, 5, 4, 6, 3, 5, 4, 6], 10);
  prose([5, 3, 6, 4, 7, 2, 5], 34);

  const fixed = [];
  const moving = [];
  PARA.forEach((c, id) => {
    const d = ruleOf(...LAYOUTS[0][id], c * CH);
    if (MOVING.includes(id)) moving.push(rules(d, 'mid', ` data-word="${id}"`));
    else fixed.push(d);
  });
  return [
    rules(ruleOf(MARGIN, PAGE.y + 16, 36), 'mid', '', 2),
    rules(still.join(''), 'lo'),
    rules(fixed.join(''), 'mid'),
    ...moving,
    rules('', 'lit', ' data-typed=""'),
    L(
      k.lineOnTop(
        [INSERT_X - 1, PARA_Y - 2.2],
        [INSERT_X - 1, PARA_Y + 2.2],
        TOP,
        P,
      ),
      { tone: 'hi', free: true },
    ).replace('<path', '<path data-caret="" style="stroke-width:1"'),
  ].join('');
}

// ---------------------------------------------------------------- assemble
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    'An open PDF page lying on a base plate, its text drawn as lines. A word is typed into the second paragraph: the words after it shift right, the last word of the line wraps to the start of the next line, and the edit is undone again.',
  body: [plate(), page(), text()],
});

const round = (n) => Math.round(n * 100) / 100;
const point = (p) => p.map(round);
const data = {
  P,
  typed: TYPED,
  ch: CH,
  ux: point(k.axisVector(P, [1, 0, 0])),
  uy: point(k.axisVector(P, [0, 1, 0])),
  start: point(at([INSERT_X + 0.3, PARA_Y, TOP])),
  // Each moving word's offset from where it's drawn, after each character.
  words: MOVING.map((id) => ({
    id,
    steps: LAYOUTS.map((l) => [
      round(l[id][0] - LAYOUTS[0][id][0]),
      round(l[id][1] - LAYOUTS[0][id][1]),
    ]),
  })),
};

writeFileSync(
  OUT,
  `// Generated by scripts/anatomy/project-revise.mjs. Do not edit by hand.\n` +
    `export const svg = ${JSON.stringify(svg)};\n` +
    `export const data = ${JSON.stringify(data)} as const;\n`,
);
console.log('wrote', OUT, `${(svg.length / 1024).toFixed(0)} KB`);
