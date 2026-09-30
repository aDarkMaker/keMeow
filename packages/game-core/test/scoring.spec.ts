import { describe, expect, it } from "vitest";
import { bestOf, maxLevelOf, nextScoreState, toScoreState } from "../src/scoring";
import { createBody, type Body } from "../src/types";
import { specOfLevel } from "../src/fruits";

function body(level: number): Body {
  return createBody(level, specOfLevel(level), 0, 0);
}

describe("bestOf", () => {
  it("keeps the larger value", () => {
    expect(bestOf(10, 5)).toBe(10);
    expect(bestOf(10, 25)).toBe(25);
    expect(bestOf(0, 0)).toBe(0);
  });
});

describe("maxLevelOf", () => {
  it("returns 1 for an empty board", () => {
    expect(maxLevelOf([])).toBe(1);
  });

  it("returns the highest level on the board", () => {
    expect(maxLevelOf([body(1), body(6), body(4)])).toBe(6);
  });
});

describe("nextScoreState", () => {
  it("adds the gained points and lifts the best", () => {
    const state = nextScoreState({ score: 10, best: 12, maxLevel: 3 }, 20);
    expect(state.score).toBe(30);
    expect(state.best).toBe(30);
    expect(state.maxLevel).toBe(3);
  });

  it("keeps the previous best when the run is worse", () => {
    const state = nextScoreState({ score: 0, best: 900, maxLevel: 5 }, 4);
    expect(state.best).toBe(900);
  });
});

describe("toScoreState", () => {
  it("derives best and max level from the board", () => {
    const state = toScoreState(50, 40, [body(2), body(8)]);
    expect(state.score).toBe(50);
    expect(state.best).toBe(50);
    expect(state.maxLevel).toBe(8);
  });
});
