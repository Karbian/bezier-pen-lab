export type Point = { x: number; y: number };

export type DrawingSpec = {
  id: string;
  name: string;
  target: string;
  budget: number;
  hints: Point[];
  closed: boolean;
  fill: string;
  stroke: string;
  strokeWidth?: number;
  instruction: string;
};

type StageBase = {
  id: string;
  title: string;
  shortTitle: string;
  skill: string;
  instruction: string;
  coaching: string;
};

export type PracticeStage = StageBase & {
  kind: "practice";
  target: string;
  budget: number;
  hints: Point[];
};

export type BuildStage = StageBase & {
  kind: "build";
  artifactName: string;
  challengeLabel: string;
  parts: DrawingSpec[];
  illustratorAsset: string;
  referenceImage?: string;
  referenceAlt?: string;
  reflectionPrompt: string;
};

export type Stage = PracticeStage | BuildStage;

const PRACTICE_STAGES: PracticeStage[] = [
  {
    kind: "practice",
    id: "corners",
    title: "Exercise 1 · Corner Points",
    shortTitle: "Corners",
    skill: "Click, don’t drag",
    instruction:
      "Trace the angular path. Click once at every direction change, then click the first anchor to close it.",
    coaching:
      "Straight segments need corner anchors. Place them exactly where the line changes direction.",
    target: "M 175 365 L 295 205 L 390 315 L 520 155 L 705 365 Z",
    budget: 5,
    hints: [
      { x: 175, y: 365 },
      { x: 295, y: 205 },
      { x: 390, y: 315 },
      { x: 520, y: 155 },
      { x: 705, y: 365 },
    ],
  },
  {
    kind: "practice",
    id: "smooth",
    title: "Exercise 2 · Smooth Curves",
    shortTitle: "Smooth curves",
    skill: "Click and drag",
    instruction:
      "Build the capsule with four smooth anchors. Drag while placing each point to create direction handles.",
    coaching:
      "Place smooth anchors at the extreme top, right, bottom and left. Longer handles create broader curves.",
    target:
      "M 440 105 C 585 105 690 160 690 250 C 690 340 585 395 440 395 C 295 395 190 340 190 250 C 190 160 295 105 440 105 Z",
    budget: 4,
    hints: [
      { x: 440, y: 105 },
      { x: 690, y: 250 },
      { x: 440, y: 395 },
      { x: 190, y: 250 },
    ],
  },
  {
    kind: "practice",
    id: "heart",
    title: "Exercise 3 · Curves and Corners",
    shortTitle: "Heart",
    skill: "Mix node types",
    instruction:
      "Trace the heart. Use smooth curves for the lobes and a corner point at the bottom tip.",
    coaching:
      "A corner can connect two curved segments. Drag its handles, then hold Alt/Option while adjusting one side.",
    target:
      "M 440 402 C 375 335 265 275 265 180 C 265 105 350 88 440 182 C 530 88 615 105 615 180 C 615 275 505 335 440 402 Z",
    budget: 4,
    hints: [
      { x: 440, y: 402 },
      { x: 265, y: 180 },
      { x: 440, y: 182 },
      { x: 615, y: 180 },
    ],
  },
  {
    kind: "practice",
    id: "ribbon",
    title: "Exercise 4 · Broken Handles",
    shortTitle: "Ribbon mark",
    skill: "Alt/Option handles",
    instruction:
      "Trace this flowing ribbon. Use Alt/Option when one side of an anchor needs a different direction.",
    coaching:
      "Fewer well-placed anchors create cleaner logos. Break a handle only where the curve changes character.",
    target:
      "M 245 350 C 180 270 210 150 305 120 C 365 100 410 130 440 178 C 470 130 515 100 575 120 C 670 150 700 270 635 350 C 570 420 505 380 440 330 C 375 380 310 420 245 350 Z",
    budget: 6,
    hints: [
      { x: 245, y: 350 },
      { x: 305, y: 120 },
      { x: 440, y: 178 },
      { x: 575, y: 120 },
      { x: 635, y: 350 },
      { x: 440, y: 330 },
    ],
  },
];

const ECO_SUMMIT_PARTS: DrawingSpec[] = [
  {
    id: "badge",
    name: "1. Organic badge",
    target:
      "M 440 52 C 575 52 670 135 670 242 C 670 350 575 420 440 450 C 305 420 210 350 210 242 C 210 135 305 52 440 52 Z",
    budget: 4,
    hints: [
      { x: 440, y: 52 },
      { x: 670, y: 242 },
      { x: 440, y: 450 },
      { x: 210, y: 242 },
    ],
    closed: true,
    fill: "#15224f",
    stroke: "#15224f",
    instruction:
      "Draw the enclosing badge with four smooth extreme points. This shape establishes the logo silhouette.",
  },
  {
    id: "sun",
    name: "2. Rising sun",
    target:
      "M 440 112 C 490 112 522 142 522 183 C 522 224 490 252 440 252 C 390 252 358 224 358 183 C 358 142 390 112 440 112 Z",
    budget: 4,
    hints: [
      { x: 440, y: 112 },
      { x: 522, y: 183 },
      { x: 440, y: 252 },
      { x: 358, y: 183 },
    ],
    closed: true,
    fill: "#ffdd57",
    stroke: "#ffdd57",
    instruction:
      "Build the sun as a separate closed curve. Use horizontal handles at the top and bottom.",
  },
  {
    id: "mountains",
    name: "3. Mountain ridge",
    target:
      "M 265 338 L 370 188 L 435 272 L 510 170 L 618 338 C 532 317 354 317 265 338 Z",
    budget: 6,
    hints: [
      { x: 265, y: 338 },
      { x: 370, y: 188 },
      { x: 435, y: 272 },
      { x: 510, y: 170 },
      { x: 618, y: 338 },
      { x: 265, y: 338 },
    ],
    closed: true,
    fill: "#ff765f",
    stroke: "#ff765f",
    instruction:
      "Mix corner anchors for the peaks with one smooth curved base. Keep the ridge readable at a small size.",
  },
  {
    id: "river",
    name: "4. River ribbon",
    target:
      "M 267 342 C 355 316 438 370 616 329 C 568 405 359 425 267 342 Z",
    budget: 3,
    hints: [
      { x: 267, y: 342 },
      { x: 616, y: 329 },
      { x: 267, y: 342 },
    ],
    closed: true,
    fill: "#4da8ff",
    stroke: "#4da8ff",
    instruction:
      "Create a broad S-curve ribbon with only three anchors. Adjust handle length before adding a point.",
  },
  {
    id: "leaf",
    name: "5. Direction leaf",
    target:
      "M 510 292 C 520 205 583 151 650 154 C 644 230 594 282 528 298 C 574 254 608 201 650 154 C 590 194 548 246 510 292 Z",
    budget: 5,
    hints: [
      { x: 510, y: 292 },
      { x: 650, y: 154 },
      { x: 528, y: 298 },
      { x: 650, y: 154 },
      { x: 510, y: 292 },
    ],
    closed: true,
    fill: "#46c98a",
    stroke: "#46c98a",
    instruction:
      "Finish with an asymmetric leaf. Break handles where the inner vein changes direction.",
  },
];

const HOMER_PARTS: DrawingSpec[] = [
  {
    id: "head",
    name: "1. Head and neck",
    target:
      "M 345 445 L 337 354 C 334 310 321 280 302 238 C 272 171 291 89 360 62 C 444 30 520 75 538 151 C 554 159 558 181 544 196 C 524 225 521 274 526 317 L 537 441 C 478 463 406 466 345 445 Z",
    budget: 8,
    hints: [
      { x: 345, y: 445 },
      { x: 337, y: 354 },
      { x: 302, y: 238 },
      { x: 360, y: 62 },
      { x: 538, y: 151 },
      { x: 544, y: 196 },
      { x: 526, y: 317 },
      { x: 537, y: 441 },
    ],
    closed: true,
    fill: "#fcd80d",
    stroke: "#181818",
    strokeWidth: 4,
    instruction:
      "Trace the skull, forehead, face edge, chin connection and neck as one smooth base shape.",
  },
  {
    id: "ear",
    name: "2. Ear",
    target:
      "M 339 278 C 310 265 294 292 303 322 C 312 348 344 347 360 325 C 348 313 332 312 322 325 C 323 309 338 300 352 307 C 355 294 350 283 339 278 Z",
    budget: 5,
    hints: [
      { x: 339, y: 278 },
      { x: 303, y: 322 },
      { x: 360, y: 325 },
      { x: 322, y: 325 },
      { x: 352, y: 307 },
    ],
    closed: true,
    fill: "#fcd80d",
    stroke: "#181818",
    strokeWidth: 4,
    instruction:
      "Build the ear as its own shape, including the small inner curl described in the guide.",
  },
  {
    id: "left-eye",
    name: "3. Left eye",
    target:
      "M 414 145 C 454 145 476 169 474 205 C 472 241 448 260 410 256 C 374 252 362 225 367 190 C 371 160 389 145 414 145 Z",
    budget: 4,
    hints: [
      { x: 414, y: 145 },
      { x: 474, y: 205 },
      { x: 410, y: 256 },
      { x: 367, y: 190 },
    ],
    closed: true,
    fill: "#ffffff",
    stroke: "#181818",
    strokeWidth: 4,
    instruction:
      "Create the first eye as a slightly irregular oval, not a perfect geometric circle.",
  },
  {
    id: "right-eye",
    name: "4. Right eye",
    target:
      "M 483 143 C 519 143 541 165 539 198 C 537 231 516 249 482 246 C 454 243 447 218 451 184 C 454 157 467 143 483 143 Z",
    budget: 4,
    hints: [
      { x: 483, y: 143 },
      { x: 539, y: 198 },
      { x: 482, y: 246 },
      { x: 451, y: 184 },
    ],
    closed: true,
    fill: "#ffffff",
    stroke: "#181818",
    strokeWidth: 4,
    instruction:
      "Draw the second overlapping oval. Compare its height and width with the first eye.",
  },
  {
    id: "nose",
    name: "5. Rounded nose",
    target:
      "M 472 227 C 505 212 547 219 554 240 C 563 266 531 276 496 270 C 475 267 460 245 472 227 Z",
    budget: 3,
    hints: [
      { x: 472, y: 227 },
      { x: 554, y: 240 },
      { x: 496, y: 270 },
    ],
    closed: true,
    fill: "#fcd80d",
    stroke: "#181818",
    strokeWidth: 4,
    instruction:
      "Use three curved anchors for the rounded nose, following the two-curve strategy in the guide.",
  },
  {
    id: "muzzle",
    name: "6. Mouth and beard area",
    target:
      "M 401 250 C 442 230 507 233 542 253 C 565 266 571 294 550 309 C 536 319 518 319 499 316 C 506 350 486 379 452 388 C 409 399 373 371 369 333 C 365 298 378 269 401 250 Z",
    budget: 6,
    hints: [
      { x: 401, y: 250 },
      { x: 542, y: 253 },
      { x: 550, y: 309 },
      { x: 499, y: 316 },
      { x: 452, y: 388 },
      { x: 369, y: 333 },
    ],
    closed: true,
    fill: "#d4b776",
    stroke: "#181818",
    strokeWidth: 4,
    instruction:
      "Trace the upper lip, cheek and rounded chin as one continuous filled shape.",
  },
  {
    id: "left-pupil",
    name: "7. Left pupil",
    target:
      "M 418 193 C 426 193 431 198 431 205 C 431 212 426 217 418 217 C 410 217 405 212 405 205 C 405 198 410 193 418 193 Z",
    budget: 4,
    hints: [
      { x: 418, y: 193 },
      { x: 431, y: 205 },
      { x: 418, y: 217 },
      { x: 405, y: 205 },
    ],
    closed: true,
    fill: "#181818",
    stroke: "#181818",
    instruction: "Add the first pupil as a small closed circle centered inside the eye.",
  },
  {
    id: "right-pupil",
    name: "8. Right pupil",
    target:
      "M 499 187 C 507 187 512 192 512 199 C 512 206 507 211 499 211 C 491 211 486 206 486 199 C 486 192 491 187 499 187 Z",
    budget: 4,
    hints: [
      { x: 499, y: 187 },
      { x: 512, y: 199 },
      { x: 499, y: 211 },
      { x: 486, y: 199 },
    ],
    closed: true,
    fill: "#181818",
    stroke: "#181818",
    instruction: "Place the second pupil so both eyes appear to look in the same direction.",
  },
  {
    id: "hair",
    name: "9. Hair curves",
    target:
      "M 330 103 C 321 50 368 29 397 77 C 400 39 449 34 470 76",
    budget: 3,
    hints: [
      { x: 330, y: 103 },
      { x: 397, y: 77 },
      { x: 470, y: 76 },
    ],
    closed: false,
    fill: "none",
    stroke: "#181818",
    strokeWidth: 5,
    instruction:
      "Draw both top hairs as one open path. Use Finish stroke instead of closing the path.",
  },
  {
    id: "sideburn",
    name: "10. Sideburn",
    target: "M 335 250 L 314 219 L 316 310 L 338 288",
    budget: 4,
    hints: [
      { x: 335, y: 250 },
      { x: 314, y: 219 },
      { x: 316, y: 310 },
      { x: 338, y: 288 },
    ],
    closed: false,
    fill: "none",
    stroke: "#181818",
    strokeWidth: 5,
    instruction:
      "Use four corner anchors to create the M-shaped sideburn as an open path.",
  },
  {
    id: "mouth-line",
    name: "11. Mouth line",
    target: "M 399 325 C 438 341 482 342 516 330",
    budget: 2,
    hints: [
      { x: 399, y: 325 },
      { x: 516, y: 330 },
    ],
    closed: false,
    fill: "none",
    stroke: "#181818",
    strokeWidth: 4,
    instruction:
      "Finish with one short open curve inside the muzzle to define the mouth.",
  },
];

export const STAGES: Stage[] = [
  ...PRACTICE_STAGES,
  {
    kind: "build",
    id: "logo-build",
    title: "Evidence 1 · Multi-shape Logo",
    shortTitle: "Logo build",
    skill: "5 vector layers",
    instruction:
      "Build the Eco Summit mark one layer at a time. Each path has a different job, curve behavior and color.",
    coaching:
      "Complete the active layer, check it, then move to the next. The canvas assembles your accepted paths into one logo.",
    artifactName: "Eco Summit Logo",
    challengeLabel: "Complex logo evidence",
    parts: ECO_SUMMIT_PARTS,
    illustratorAsset: "illustrator/eco-summit-logo.svg",
    reflectionPrompt:
      "Which separate shape contributes most to the logo’s visual message, and how did you make it editable?",
  },
  {
    kind: "build",
    id: "homer-build",
    title: "Evidence 2 · Homer Head in Parts",
    shortTitle: "Homer head",
    skill: "11 assembled parts",
    instruction:
      "Follow the supplied Illustrator guide: draw separate shapes, assemble them in position and apply the specified colors.",
    coaching:
      "Work in the listed order. Completed parts stay visible, so you can check overlap, proportion and visual hierarchy.",
    artifactName: "Homer Head Study",
    challengeLabel: "Character construction evidence",
    parts: HOMER_PARTS,
    illustratorAsset: "illustrator/homer-head-study.svg",
    referenceImage: "homer-reference.png",
    referenceAlt: "Completed Homer head reference from the supplied Illustrator drawing guide",
    reflectionPrompt:
      "Which separate part was hardest to align, and what anchor or handle adjustment improved the assembly?",
  },
];
