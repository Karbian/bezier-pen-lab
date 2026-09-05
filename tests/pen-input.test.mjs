import assert from "node:assert/strict";
import test from "node:test";
import { canStartPointer, clientToCanvas, handlePositions } from "../src/pen-input.ts";

const anchor = { x: 100, y: 100, in: { x: 70, y: 90 }, out: { x: 125, y: 115 } };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);

test("free movement keeps the existing mirrored-handle behavior", () => {
  const before = structuredClone(anchor);
  assert.deepEqual(handlePositions(anchor, { x: 130, y: 120 }, "out", false, false), {
    in: { x: 70, y: 80 }, out: { x: 130, y: 120 },
  });
  assert.deepEqual(anchor, before, "history snapshots must not be mutated");
});

test("independent mode moves either handle without changing its opposite", () => {
  const pointer = { x: 145, y: 130 };
  for (const side of ["in", "out"]) {
    const opposite = side === "in" ? "out" : "in";
    const result = handlePositions(anchor, pointer, side, false, true);
    assert.deepEqual(result[side], pointer);
    assert.deepEqual(result[opposite], anchor[opposite]);
  }
});

test("angle snapping preserves handle length in all four quadrants", () => {
  for (const [dx, dy] of [[30, 7], [30, 24], [-30, 24], [-30, -24], [30, -24], [0, 0]]) {
    const result = handlePositions(anchor, { x: 100 + dx, y: 100 + dy }, "out", true, false);
    const x = result.out.x - 100;
    const y = result.out.y - 100;
    close(Math.hypot(x, y), Math.hypot(dx, dy));
    const steps = Math.atan2(y, x) / (Math.PI / 4);
    close(steps, Math.round(steps));
    close(result.in.x, 100 - x);
    close(result.in.y, 100 - y);
  }
});

test("snapping and independent handles can be used together", () => {
  for (const side of ["in", "out"]) {
    const opposite = side === "in" ? "out" : "in";
    const result = handlePositions(anchor, { x: 130, y: 124 }, side, true, true);
    close(result[side].x - 100, result[side].y - 100);
    assert.deepEqual(result[opposite], anchor[opposite]);
  }
});

test("turning the modes off returns to free, linked movement", () => {
  const independent = { ...anchor, ...handlePositions(anchor, { x: 135, y: 118 }, "out", true, true) };
  assert.deepEqual(handlePositions(independent, { x: 130, y: 120 }, "out", false, false), {
    in: { x: 70, y: 80 }, out: { x: 130, y: 120 },
  });
});

test("portrait letterboxing maps off-center touches to the actual drawing", () => {
  // A 440 × 500 CSS-pixel element contains 440 × 250 pixels of SVG content.
  // Its content starts 125 pixels below the top of the element, at y = 235.
  const matrix = { a: .5, b: 0, c: 0, d: .5, e: 40, f: 235 };
  assert.deepEqual(clientToCanvas({ x: 127.5, y: 287.5 }, matrix), { x: 175, y: 105 });
  assert.deepEqual(clientToCanvas({ x: 392.5, y: 417.5 }, matrix), { x: 705, y: 365 });
});

test("mapping follows scaling, rotation, and the current scroll offset", () => {
  const matrix = { a: 0, b: 2, c: -2, d: 0, e: 1000, f: -240 };
  assert.deepEqual(clientToCanvas({ x: 500, y: 640 }, matrix), { x: 440, y: 250 });
});

test("unavailable or invalid screen transforms cannot create a bogus point", () => {
  const point = { x: 20, y: 30 };
  assert.equal(clientToCanvas(point, null), null);
  assert.equal(clientToCanvas(point, { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 }), null);
  assert.equal(clientToCanvas(point, { a: 1, b: 0, c: 0, d: 1, e: NaN, f: 0 }), null);
});

test("only a primary press can start a gesture while no other pointer owns it", () => {
  assert.equal(canStartPointer({ button: 0, isPrimary: true }, null), true);
  assert.equal(canStartPointer({ button: 0, isPrimary: false }, null), false);
  assert.equal(canStartPointer({ button: 0, isPrimary: true }, 12), false);
  assert.equal(canStartPointer({ button: 2, isPrimary: true }, null), false);
  assert.equal(canStartPointer({ button: 1, isPrimary: true }, null), false);
});
