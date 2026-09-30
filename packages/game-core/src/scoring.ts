import type { Body } from "./types";

export interface ScoreState {
  score: number;
  best: number;
  maxLevel: number;
}

export function bestOf(previous: number, current: number): number {
  return current > previous ? current : previous;
}

export function maxLevelOf(bodies: readonly Body[]): number {
  let level = 1;
  for (const body of bodies) {
    if (body.level > level) level = body.level;
  }
  return level;
}

export function nextScoreState(previous: ScoreState, gained: number): ScoreState {
  const score = previous.score + gained;
  return {
    score,
    best: bestOf(previous.best, score),
    maxLevel: previous.maxLevel,
  };
}

export function toScoreState(score: number, best: number, bodies: readonly Body[]): ScoreState {
  return {
    score,
    best: bestOf(best, score),
    maxLevel: maxLevelOf(bodies),
  };
}
