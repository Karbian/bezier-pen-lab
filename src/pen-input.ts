import type { Point } from "./pen-data";

type ScreenMatrix = { a: number; b: number; c: number; d: number; e: number; f: number };
type Handles = { in: Point; out: Point };
type PointerStart = { button: number; isPrimary: boolean };

// The SVG may be letterboxed or scaled independently of its element rectangle.
export function clientToCanvas(point: Point, matrix: ScreenMatrix | null): Point | null {
  if (!matrix) return null;
  const { a, b, c, d, e, f } = matrix;
  const determinant = a * d - b * c;
  if (!Number.isFinite(determinant) || determinant === 0) return null;
  const x = (d * (point.x - e) - c * (point.y - f)) / determinant;
  const y = (a * (point.y - f) - b * (point.x - e)) / determinant;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

export function canStartPointer(event: PointerStart, activePointerId: number | null) {
  return event.isPrimary && event.button === 0 && activePointerId === null;
}

export function handlePositions(
  anchor: Point & Handles,
  pointer: Point,
  side: "in" | "out",
  constrain: boolean,
  independent: boolean,
): Handles {
  let dx = pointer.x - anchor.x;
  let dy = pointer.y - anchor.y;
  if (constrain) {
    const length = Math.hypot(dx, dy);
    const step = Math.PI / 4;
    const angle = Math.round(Math.atan2(dy, dx) / step) * step;
    dx = Math.cos(angle) * length;
    dy = Math.sin(angle) * length;
  }
  const handles = { in: { ...anchor.in }, out: { ...anchor.out } };
  handles[side] = { x: anchor.x + dx, y: anchor.y + dy };
  if (!independent) {
    const opposite = side === "in" ? "out" : "in";
    handles[opposite] = { x: anchor.x - dx, y: anchor.y - dy };
  }
  return handles;
}
