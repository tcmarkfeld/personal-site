// Builds the HL7Kit project figure with the anatomy kit (scripts/anatomy/kit,
// MIT). Run: node scripts/anatomy/project-hl7kit.mjs
//
// An HL7 v2 message card (MSH, PID, PV1 rows of `|`-separated fields) and a
// FHIR Patient card. The PID fields lift off one at a time and settle into
// the Patient's id, name, birthDate and gender slots.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from './kit/iso-kit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../src/components/projectFigures/hl7kit.gen.ts');

const WIDTH = 480;
const HEIGHT = 360;

// ---------------------------------------------------------------- world
// The message card sits front left, the Patient card behind it to the right.
const BASE_H = 4;
const CARD_H = 1.2;
const CHIP_H = 0.8;
const MESSAGE = { x: -90, y: 20, w: 96, d: 52, r: 3 };
const PATIENT = { x: -44, y: -116, w: 80, d: 62, r: 3 };
const cardOf = (base) => k.insetPlan(base, 5);
const MESSAGE_CARD = cardOf(MESSAGE);
const PATIENT_CARD = cardOf(PATIENT);

// Each message row: a segment-name block, then fields between `|` ticks.
// PID's field lengths follow `PID|1|12345|DOE^JANE|19800101|F`; the last four
// are the ones that move.
const ROW_X = MESSAGE_CARD.x + 4;
const ROWS = [
  { y: MESSAGE.y + 14, fields: [10, 16, 12, 8, 6] },
  { y: MESSAGE.y + 26, fields: [2, 10, 16, 13, 4], moving: [1, 2, 3, 4] },
  { y: MESSAGE.y + 38, fields: [6, 14, 20, 9] },
];
const BLOCK = { w: 9, d: 5 };
const GAP = 2;

// Patient rows, in the order the PID fields land: id, name, birthDate, gender.
const HEADER = { x: PATIENT_CARD.x + 4, y: PATIENT_CARD.y + 4, w: 62, d: 8 };
const SLOT = { x: PATIENT_CARD.x + 22, w: 40 };
const PATIENT_ROWS = [17, 26, 35, 44].map((y) => PATIENT_CARD.y + y);
const LABELS = [6, 9, 14, 11];

const LIFT = 26;

const P = k.fitProjection(
  [
    ...k.boxCorners(MESSAGE, -BASE_H, CARD_H),
    ...k.boxCorners(PATIENT, -BASE_H, CARD_H),
    [-25, -15, LIFT],
  ],
  WIDTH,
  HEIGHT,
  { pad: 56, elevation: 36 },
);

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);

// ---------------------------------------------------------------- parts
// A thin base with corner screws and the card lying on it.
function base(plan) {
  const card = cardOf(plan);
  return [
    `<path class="iso-halo" d="${k.haloOf(plan, -BASE_H, BASE_H, P)}"/>`,
    S(k.slabOf(plan, -BASE_H, BASE_H, P, 6, 0.8), { tone: 'mid' }),
    k.dotsSvg(
      k.corners(plan, 2.5).map(([x, y]) => k.iso([x, y, 0], P)),
      { size: 0.5 },
    ),
    S(k.slabOf(card, 0, CARD_H, P, 4, 0.4), { tone: 'mid' }),
  ].join('');
}

// One message row's ticks, rules and the plans of its fields.
function rowOf({ y, fields }) {
  const block = { x: ROW_X, y: y - BLOCK.d / 2, ...BLOCK, r: 0.6 };
  const ticks = [];
  const plans = [];
  let x = ROW_X + BLOCK.w + GAP;
  for (const length of fields) {
    ticks.push(k.lineOnTop([x, y - 1.6], [x, y + 1.6], CARD_H, P));
    plans.push({ x: x + GAP, y: y - 1.6, w: length, d: 3.2, r: 0.5 });
    x += length + GAP * 2;
  }
  return { block, ticks, plans };
}

function message() {
  const out = [base(MESSAGE)];
  const chips = [];
  for (const row of ROWS) {
    const { block, ticks, plans } = rowOf(row);
    out.push(S(k.slabOf(block, CARD_H, 1.6, P, 3, 0.3), { tone: 'mid' }));
    out.push(L(ticks.join(''), { tone: 'mid', free: true }));
    plans.forEach((plan, i) => {
      if (row.moving?.includes(i)) {
        // The empty place a field leaves behind, and the field itself.
        out.push(L(k.planOutline(plan, CARD_H, P, 3), { tone: 'faint' }));
        chips.push(plan);
      } else {
        const rule = k.lineOnTop(
          [plan.x, row.y],
          [plan.x + plan.w, row.y],
          CARD_H,
          P,
        );
        out.push(L(rule, { tone: 'lo', free: true }));
      }
    });
  }
  return { svg: out.join(''), chips };
}

function patient() {
  const out = [base(PATIENT)];
  out.push(
    S(k.slabOf({ ...HEADER, r: 1 }, CARD_H, 1.4, P, 3, 0.4), { tone: 'mid' }),
  );
  out.push(
    k.faceTextSvg(
      k.topMatrix([HEADER.x + 4, HEADER.y + 5.4], CARD_H + 1.4, P),
      'Patient',
      { size: 3.6, tone: 'lo' },
    ),
  );
  // Rules between the rows run edge to edge across the card.
  const { x, w } = PATIENT_CARD;
  out.push(
    L(
      PATIENT_ROWS.slice(1)
        .map((y) => k.lineOnTop([x, y - 4.5], [x + w, y - 4.5], CARD_H, P))
        .join(''),
      { tone: 'faint' },
    ),
  );
  PATIENT_ROWS.forEach((y, i) => {
    const label = k.lineOnTop([x + 5, y], [x + 5 + LABELS[i], y], CARD_H, P);
    out.push(L(label, { tone: 'lo', free: true }));
  });
  return out.join('');
}

// ---------------------------------------------------------------- assemble
const m = message();

// One value slot per row; each field lands at the start of its slot.
const slotsSvg = L(
  PATIENT_ROWS.map((y) =>
    k.planOutline({ ...SLOT, y: y - 2.4, d: 4.8, r: 0.8 }, CARD_H, P, 3),
  ).join(''),
  { tone: 'lo' },
);

const chipsSvg = m.chips
  .map(
    (chip, i) =>
      `<g data-chip="${i}">${S(k.slabOf(chip, CARD_H, CHIP_H, P, 3, 0.2), {
        tone: 'hi',
      })}</g>`,
  )
  .join('');

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    'An HL7 v2 message card with MSH, PID and PV1 segment rows beside a FHIR Patient card. The PID fields lift off one at a time and settle into the Patient card’s id, name, birth date and gender slots.',
  body: [m.svg, patient(), slotsSvg, chipsSvg],
});

const screen = (by) =>
  k.axisVector(P, by).map((n) => Math.round(n * 100) / 100);
const data = {
  P,
  lift: screen([0, 0, LIFT]),
  chips: m.chips.map((chip, i) =>
    screen([SLOT.x + 1.5 - chip.x, PATIENT_ROWS[i] - 1.6 - chip.y, 0]),
  ),
};

writeFileSync(
  OUT,
  `// Generated by scripts/anatomy/project-hl7kit.mjs. Do not edit by hand.\n` +
    `export const svg = ${JSON.stringify(svg)};\n` +
    `export const data = ${JSON.stringify(data)} as const;\n`,
);
console.log('wrote', OUT, `${(svg.length / 1024).toFixed(0)} KB`);
