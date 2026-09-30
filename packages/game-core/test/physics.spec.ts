import { describe, expect, it } from "vitest";
import { hitOf, separate, clampInside, wallsOf } from "../src/physics";
import { createBody, type Body } from "../src/types";
import { specOfLevel } from "../src/fruits";

const OPTIONS = { width: 640, height: 900, dropLine: 144 };

function bodyAt(level: number, x: number, y: number, id = 1): Body {
  return createBody(id, specOfLevel(level), x, y);
}

describe("hitOf", () => {
  it("returns null when bodies are apart", () => {
    const a = bodyAt(1, 0, 0, 1);
    const b = bodyAt(1, 100, 0, 2);
    expect(hitOf(a, b)).toBeNull();
  });

  it("reports a negative gap when overlapping", () => {
    const a = bodyAt(1, 0, 0, 1);
    const b = bodyAt(1, 30, 0, 2);
    const hit = hitOf(a, b);
    expect(hit).not.toBeNull();
    expect(hit?.gap).toBeCloseTo(-10, 5);
    expect(hit?.nx).toBeCloseTo(1, 5);
    expect(hit?.ny).toBeCloseTo(0, 5);
  });

  it("falls back to a horizontal normal for coincident centres", () => {
    const a = bodyAt(1, 50, 50, 1);
    const b = bodyAt(1, 50, 50, 2);
    const hit = hitOf(a, b);
    expect(hit?.nx).toBe(1);
    expect(hit?.ny).toBe(0);
  });

  it("ignores touching bodies that are exactly adjacent", () => {
    const a = bodyAt(1, 0, 0, 1);
    const b = bodyAt(1, 40, 0, 2);
    expect(hitOf(a, b)).toBeNull();
  });
});

describe("separate", () => {
  it("pushes overlapping bodies apart", () => {
    const a = bodyAt(1, 0, 0, 1);
    const b = bodyAt(1, 30, 0, 2);
    const hit = hitOf(a, b);
    expect(hit).not.toBeNull();
    if (hit) separate(a, b, hit);
    expect(b.x - a.x).toBeGreaterThan(30);
    const after = hitOf(a, b);
    if (after) expect(after.gap).toBeGreaterThan(hit ? hit.gap : 0);
  });

  it("weights the lighter body more", () => {
    const small = bodyAt(1, 0, 0, 1);
    const big = bodyAt(5, 30, 0, 2);
    const start = big.x;
    const hit = hitOf(small, big);
    expect(hit).not.toBeNull();
    if (hit) separate(small, big, hit);
    expect(Math.abs(big.x - start)).toBeLessThan(Math.abs(small.x));
  });

  it("does nothing when both bodies are merged", () => {
    const a = bodyAt(1, 0, 0, 1);
    const b = bodyAt(1, 30, 0, 2);
    a.merged = true;
    b.merged = true;
    const hit = hitOf(a, b);
    if (hit) {
      const ax = a.x;
      separate(a, b, hit);
      expect(a.x).toBe(ax);
    }
  });
});

describe("clampInside", () => {
  it("pushes a body back inside the left wall", () => {
    const body = bodyAt(1, -10, 100, 1);
    const moved = clampInside(body, OPTIONS);
    expect(moved).toBe(true);
    expect(body.x).toBe(wallsOf(OPTIONS).left + body.radius);
  });

  it("pushes a body back up off the floor", () => {
    const body = bodyAt(1, 100, 999, 1);
    clampInside(body, OPTIONS);
    expect(body.y).toBe(wallsOf(OPTIONS).floor - body.radius);
  });

  it("leaves an inside body untouched", () => {
    const body = bodyAt(1, 300, 300, 1);
    expect(clampInside(body, OPTIONS)).toBe(false);
  });
});
