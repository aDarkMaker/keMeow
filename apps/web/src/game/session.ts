import { Game, type EngineOptions } from "@kemeow/game-core";
import { BOARD_HEIGHT, BOARD_WIDTH, DROP_LINE, DROP_SPEED, DROP_Y } from "./theme";

export type Phase = "playing" | "over";

export interface GameSession {
  seed: number;
  game: Game;
  phase: Phase;
  cooldown: number;
}

const OPTIONS: EngineOptions = {
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  dropLine: DROP_LINE,
  dropY: DROP_Y,
  dropSpeed: DROP_SPEED,
};

/** Survives ClientRouter remounts across Play ↔ Changelog. */
let session: GameSession | null = null;

export function engineOptions(): EngineOptions {
  return OPTIONS;
}

export function getSession(): GameSession {
  if (!session) {
    const seed = Date.now() >>> 0;
    session = {
      seed,
      game: new Game(OPTIONS, seed),
      phase: "playing",
      cooldown: 0,
    };
  }
  return session;
}

export function restartSession(): GameSession {
  const seed = ((session?.seed ?? Date.now()) + 1) >>> 0;
  session = {
    seed,
    game: new Game(OPTIONS, seed),
    phase: "playing",
    cooldown: 0,
  };
  return session;
}
