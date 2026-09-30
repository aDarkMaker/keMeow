import { describe, expect, it } from "vitest";
import { FIXED_STEP, Game } from "../src/engine";
import { hitOf } from "../src/physics";
import type { EngineOptions } from "../src/types";

const OPTIONS: EngineOptions = { width: 640, height: 900, dropLine: 144 };

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function playDrops(game: Game, drops: number, random: () => number): void {
  for (let i = 0; i < drops; i += 1) {
    game.moveTop(120 + random() * (OPTIONS.width - 240));
    game.drop();
    for (let s = 0; s < 30; s += 1) game.step(FIXED_STEP);
  }
}

function maxSpeed(game: Game): number {
  let peak = 0;
  for (const body of game.bodies) peak = Math.max(peak, Math.hypot(body.vx, body.vy));
  return peak;
}

describe("stability", () => {
  it("never lets a body escape the container while dropping", () => {
    const game = new Game(OPTIONS, 21);
    const random = seededRandom(7);

    for (let i = 0; i < 40; i += 1) {
      game.moveTop(120 + random() * (OPTIONS.width - 240));
      game.drop();
      for (let s = 0; s < 30; s += 1) {
        game.step(FIXED_STEP);
        for (const body of game.bodies) {
          expect(body.x - body.radius).toBeGreaterThan(-2);
          expect(body.x + body.radius).toBeLessThan(OPTIONS.width + 2);
          expect(body.y - body.radius).toBeGreaterThan(-2);
          expect(body.y + body.radius).toBeLessThan(OPTIONS.height + 2);
        }
      }
    }
  });

  it("comes to a full stop once dropping ends", () => {
    const game = new Game(OPTIONS, 33);
    playDrops(game, 25, seededRandom(11));
    for (let s = 0; s < 600; s += 1) game.step(FIXED_STEP);

    expect(game.over).toBe(false);
    expect(maxSpeed(game)).toBeLessThan(5);
  });

  it("resolves overlaps once the pile settles", () => {
    const game = new Game(OPTIONS, 55);
    playDrops(game, 30, seededRandom(3));
    for (let s = 0; s < 600; s += 1) game.step(FIXED_STEP);

    const bodies = game.bodies;
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const a = bodies[i]!;
        const b = bodies[j]!;
        const hit = hitOf(a, b);
        if (hit) expect(hit.gap).toBeGreaterThan(-3);
      }
    }
  });

  it("never lets energy build up across repeated drops", () => {
    const game = new Game(OPTIONS, 91);
    const random = seededRandom(19);

    for (let i = 0; i < 30; i += 1) {
      game.moveTop(120 + random() * (OPTIONS.width - 240));
      game.drop();
      for (let s = 0; s < 30; s += 1) game.step(FIXED_STEP);
    }

    for (let s = 0; s < 300; s += 1) game.step(FIXED_STEP);
    expect(maxSpeed(game)).toBeLessThan(5);
  });
});
