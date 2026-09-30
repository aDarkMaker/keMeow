import { describe, expect, it } from "vitest";
import { FIXED_STEP, Game } from "../src/engine";
import { hitOf, isOverlapping } from "../src/physics";
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

describe("collision", () => {
  it("keeps every resting pair mostly separated", () => {
    const game = new Game(OPTIONS, 77);
    playDrops(game, 25, seededRandom(5));

    const bodies = game.bodies;
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const a = bodies[i]!;
        const b = bodies[j]!;
        if (!isOverlapping(a, b)) continue;
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        expect(dist).toBeGreaterThan((a.radius + b.radius) * 0.85);
      }
    }
  });

  it("never keeps a vertical column interpenetrating after settling", () => {
    const game = new Game(OPTIONS, 88);
    const centre = OPTIONS.width / 2;

    for (let i = 0; i < 12; i += 1) {
      game.requestSpawn(1, centre);
      game.step(FIXED_STEP);
      for (let s = 0; s < 30; s += 1) game.step(FIXED_STEP);
    }
    for (let s = 0; s < 600; s += 1) game.step(FIXED_STEP);

    const bodies = [...game.bodies].sort((a, b) => a.y - b.y);
    for (let i = 1; i < bodies.length; i += 1) {
      const upper = bodies[i - 1]!;
      const lower = bodies[i]!;
      const gap = hitOf(upper, lower)?.gap ?? 0;
      expect(gap).toBeGreaterThan(-10);
    }
  });

  it("keeps horizontal spread within the container", () => {
    const game = new Game(OPTIONS, 99);
    playDrops(game, 25, seededRandom(13));

    const left = Math.min(...game.bodies.map((b) => b.x - b.radius));
    const right = Math.max(...game.bodies.map((b) => b.x + b.radius));
    expect(left).toBeGreaterThanOrEqual(-2);
    expect(right).toBeLessThanOrEqual(OPTIONS.width + 2);
  });
});
