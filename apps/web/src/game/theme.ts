/**
 * Fixed board size for deterministic physics.
 * CSS scales the canvas; do not change these for layout alone.
 */
export const BOARD_WIDTH = 640;
export const BOARD_HEIGHT = 900;
export const BOARD_RATIO = BOARD_WIDTH / BOARD_HEIGHT;

/** Aim / spawn row Y. */
export const DROP_Y = 92;

/** Danger line Y. */
export const DROP_LINE = 182;

/** Initial drop vy (px/s). */
export const DROP_SPEED = 130;

/** Arrow-key aim nudge (px). */
export const KEY_STEP = 22;
