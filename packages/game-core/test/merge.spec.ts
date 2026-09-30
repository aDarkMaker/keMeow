import { describe, expect, it } from "vitest";
import { Game, FIXED_STEP, clampToBoard, mergeScore } from "../src/engine";
import { MAX_LEVEL } from "../src/fruits";
import type { EngineOptions } from "../src/types";

const OPTIONS: EngineOptions = { width: 640, height: 900, dropLine: 144 };

function newGame(seed = 7): Game {
  return new Game(OPTIONS, seed);
}

function settle(game: Game, steps = 240): number {
  let merges = 0;
  for (let i = 0; i < steps; i += 1) {
    const result = game.step(FIXED_STEP);
    merges += result.merges.length;
  }
  return merges;
}

describe("mergeScore", () => {
  it("grows with level", () => {
    expect(mergeScore(2)).toBe(3);
    expect(mergeScore(3)).toBe(6);
    expect(mergeScore(11)).toBe(66);
  });
});

describe("clampToBoard", () => {
  it("keeps the body inside the walls", () => {
    expect(clampToBoard(-50, 20, 640)).toBe(20);
    expect(clampToBoard(9999, 20, 640)).toBe(620);
    expect(clampToBoard(320, 20, 640)).toBe(320);
  });
});

describe("spawning", () => {
  it("only offers droppable levels", () => {
    const game = newGame();
    for (let i = 0; i < 50; i += 1) {
      expect(game.nextLevel).toBeGreaterThanOrEqual(1);
      expect(game.nextLevel).toBeLessThanOrEqual(5);
      game.drop();
    }
  });

  it("spawns above the board and falls to the floor", () => {
    const game = newGame();
    const body = game.drop();
    expect(body).not.toBeNull();
    settle(game, 180);
    const [first] = game.bodies;
    expect(first).toBeDefined();
    expect(first?.y).toBeGreaterThan(game.dropLine);
  });

  it("caps the body count when many drops happen", () => {
    const game = newGame(11);
    for (let i = 0; i < 30; i += 1) {
      game.drop();
      game.step(FIXED_STEP);
    }
    expect(game.bodies.length).toBeLessThanOrEqual(30);
  });
});

describe("merging", () => {
  it("merges two bodies of the same level into the next level", () => {
    const game = newGame(3);
    game.requestSpawn(1, 300);
    game.requestSpawn(1, 300);
    const merges = settle(game, 60);
    expect(merges).toBeGreaterThan(0);
    expect(game.score).toBeGreaterThan(0);
    expect(game.bodies.some((body) => body.level === 2)).toBe(true);
  });

  it("never exceeds the top level", () => {
    const game = newGame(5);
    game.requestSpawn(MAX_LEVEL, 320);
    game.requestSpawn(MAX_LEVEL, 320);
    settle(game, 60);
    for (const body of game.bodies) {
      expect(body.level).toBeLessThanOrEqual(MAX_LEVEL);
    }
  });

  it("accumulates score from merge events", () => {
    const game = newGame(9);
    game.requestSpawn(2, 300);
    game.requestSpawn(2, 300);
    let gained = 0;
    for (let i = 0; i < 90; i += 1) {
      const result = game.step(FIXED_STEP);
      for (const merge of result.merges) gained += merge.gained;
    }
    expect(gained).toBe(game.score);
  });
});

describe("reset", () => {
  it("clears bodies and score", () => {
    const game = newGame();
    game.drop();
    settle(game, 60);
    game.reset(42);
    expect(game.bodies).toHaveLength(0);
    expect(game.score).toBe(0);
    expect(game.over).toBe(false);
  });
});

describe("determinism", () => {
  it("produces the same sequence for the same seed", () => {
    const a = newGame(123);
    const b = newGame(123);
    const traceA: number[] = [];
    const traceB: number[] = [];
    for (let i = 0; i < 40; i += 1) {
      traceA.push(a.nextLevel);
      traceB.push(b.nextLevel);
      a.drop();
      b.drop();
      a.step(FIXED_STEP);
      b.step(FIXED_STEP);
    }
    expect(traceA).toEqual(traceB);
  });
});
