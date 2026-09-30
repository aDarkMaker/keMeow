import { FRUITS, radiusOfLevel, specOfLevel, DROPPABLE_LEVELS } from "./fruits";
import {
  ITERATIONS,
  SUBSTEPS,
  applyElasticity,
  clampInside,
  deriveVelocity,
  decaySquash,
  hitOf,
  integrate,
  separate,
  wallContacts,
} from "./physics";
import { mulberry32, pickIndex } from "./rng";
import {
  createBody,
  type Body,
  type Contact,
  type EngineOptions,
  type MergeEvent,
  type StepResult,
} from "./types";

export const FIXED_STEP = 1 / 60;
export const DROP_LINE_MARGIN = 0.16;
export const OVER_TIME = 1.5;
export const OVER_SPEED = 140;

export function mergeScore(level: number): number {
  return (level * (level + 1)) / 2;
}

export class Game {
  readonly options: EngineOptions;
  private random: () => number;
  private items: Body[] = [];
  private nextId = 1;
  private currentScore = 0;
  private currentPending = 1;
  private currentNext = 1;
  private accumulator = 0;
  private finished = false;
  private topX: number;
  private spawnQueue: { level: number; x: number }[] = [];

  constructor(options: EngineOptions, seed: number) {
    this.options = options;
    this.topX = options.width / 2;
    this.random = mulberry32(seed);
    this.currentPending = this.rollLevel();
    this.currentNext = this.rollLevel();
  }

  get bodies(): readonly Body[] {
    return this.items;
  }

  get score(): number {
    return this.currentScore;
  }

  /** Aimed body level. */
  get pendingLevel(): number {
    return this.currentPending;
  }

  /** Previewed next drop level. */
  get nextLevel(): number {
    return this.currentNext;
  }

  get over(): boolean {
    return this.finished;
  }

  get dropLine(): number {
    return this.options.dropLine > 0
      ? this.options.dropLine
      : this.options.height * DROP_LINE_MARGIN;
  }

  get pendingX(): number {
    return this.topX;
  }

  reset(seed: number): void {
    this.items = [];
    this.nextId = 1;
    this.currentScore = 0;
    this.accumulator = 0;
    this.finished = false;
    this.topX = this.options.width / 2;
    this.spawnQueue = [];
    this.random = mulberry32(seed);
    this.currentPending = this.rollLevel();
    this.currentNext = this.rollLevel();
  }

  requestSpawn(level: number, x: number): void {
    if (this.finished) return;
    const safeLevel = clampLevel(level);
    this.spawnQueue.push({
      level: safeLevel,
      x: clampToBoard(x, radiusOfLevel(safeLevel), this.options.width),
    });
  }

  spawn(level: number, x: number): Body | null {
    if (this.finished) return null;
    const safeLevel = clampLevel(level);
    const spec = specOfLevel(safeLevel);
    const dropY = this.options.dropY ?? spec.radius;
    const body = createBody(
      this.nextId,
      spec,
      clampToBoard(x, spec.radius, this.options.width),
      Math.max(dropY, spec.radius),
    );
    body.vy = this.options.dropSpeed ?? 0;
    body.pvy = body.vy;
    this.nextId += 1;
    this.items.push(body);
    return body;
  }

  drop(): Body | null {
    const body = this.spawn(this.currentPending, this.topX);
    if (!body) return null;
    this.currentPending = this.currentNext;
    this.currentNext = this.rollLevel(this.currentPending);
    return body;
  }

  moveTop(x: number): void {
    this.topX = clampToBoard(x, radiusOfLevel(this.currentPending), this.options.width);
  }

  step(dt: number): StepResult {
    if (this.finished) return { merges: [], over: true };

    this.accumulator += Math.min(dt, 0.25);
    const merges: MergeEvent[] = [];
    let guard = 0;

    while (this.accumulator >= FIXED_STEP && guard < 5) {
      this.accumulator -= FIXED_STEP;
      guard += 1;
      merges.push(...this.tick(FIXED_STEP));
    }

    return { merges, over: this.finished };
  }

  private tick(dt: number): MergeEvent[] {
    this.flushSpawn();
    const sub = dt / SUBSTEPS;
    const merges: MergeEvent[] = [];

    for (let s = 0; s < SUBSTEPS; s += 1) {
      merges.push(...this.subStep(sub));
    }

    this.evaluateOver(dt);
    return merges;
  }

  private subStep(dt: number): MergeEvent[] {
    const merges: MergeEvent[] = [];
    const contacts: Contact[] = [];

    for (const body of this.items) {
      if (!body.merged) {
        integrate(body, dt);
      }
    }

    for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
      this.solveWalls(contacts, iteration);
      this.solveBodies(merges, contacts, iteration);
    }

    this.solveWalls(contacts, -1);

    for (const body of this.items) {
      if (body.merged) continue;
      decaySquash(body, dt);
      deriveVelocity(body, dt);
    }

    applyElasticity(contacts);

    if (merges.length > 0) this.compact();
    return merges;
  }

  private solveWalls(contacts: Contact[], iteration: number): void {
    for (const body of this.items) {
      if (body.merged) continue;
      const moved = clampInside(body, this.options);
      if (!moved) continue;
      body.contacts += 1;
      if (iteration === 0) wallContacts(body, this.options, contacts);
    }
  }

  private solveBodies(merges: MergeEvent[], contacts: Contact[], iteration: number): void {
    const items = this.items;
    for (let i = 0; i < items.length; i += 1) {
      const a = items[i];
      if (!a || a.merged) continue;

      for (let j = i + 1; j < items.length; j += 1) {
        const b = items[j];
        if (!b || b.merged) continue;

        const hit = hitOf(a, b);
        if (!hit) continue;

        if (iteration === 0 && a.level === b.level) {
          this.merge(a, b, merges);
          continue;
        }

        if (hit.gap >= 0) continue;
        if (iteration === 0) contacts.push({ a, b, nx: hit.nx, ny: hit.ny });
        separate(a, b, hit);
      }
    }
  }

  private merge(a: Body, b: Body, merges: MergeEvent[]): void {
    if (a.level >= FRUITS.length) return;

    const spec = specOfLevel(a.level + 1);
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;

    a.merged = true;
    b.merged = true;

    const body = createBody(this.nextId, spec, x, y);
    this.nextId += 1;
    body.vx = (a.vx + b.vx) * 0.5;
    body.vy = (a.vy + b.vy) * 0.5;
    body.px = body.x;
    body.py = body.y;
    body.pvx = body.vx;
    body.pvy = body.vy;
    body.x = clampToBoard(body.x, body.radius, this.options.width);
    body.y = Math.min(body.y, this.options.height - body.radius);
    this.items.push(body);

    const gained = mergeScore(a.level + 1);
    this.currentScore += gained;
    merges.push({ level: a.level + 1, x, y, gained });
  }

  private flushSpawn(): void {
    if (this.spawnQueue.length === 0) return;
    const queue = this.spawnQueue;
    this.spawnQueue = [];
    for (const request of queue) this.spawn(request.level, request.x);
  }

  private rollLevel(exclude?: number): number {
    const level = pickIndex(this.random, DROPPABLE_LEVELS) + 1;
    if (exclude !== undefined && level === exclude && DROPPABLE_LEVELS > 1) {
      return pickIndex(this.random, DROPPABLE_LEVELS) + 1;
    }
    return level;
  }

  private compact(): void {
    this.items = this.items.filter((body) => !body.merged);
  }

  private evaluateOver(dt: number): void {
    for (const body of this.items) {
      if (body.merged) continue;
      const above = body.y - body.radius < this.dropLine;
      const speed = Math.hypot(body.vx, body.vy);

      if (above && speed < OVER_SPEED) {
        body.overTime += dt;
      } else {
        body.overTime = Math.max(0, body.overTime - dt * 2);
      }

      if (body.overTime >= OVER_TIME) {
        this.finished = true;
        return;
      }
    }
  }
}

export function clampLevel(level: number): number {
  if (level < 1) return 1;
  if (level > FRUITS.length) return FRUITS.length;
  return Math.floor(level);
}

export function clampToBoard(x: number, radius: number, width: number): number {
  const min = radius;
  const max = width - radius;
  if (max <= min) return width / 2;
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

export { DROPPABLE_LEVELS };
