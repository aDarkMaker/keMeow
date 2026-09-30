import { FRUITS } from "./fruits";
import type { Body, Contact, EngineOptions, PairHit } from "./types";

export const GRAVITY = 2600;
export const SUBSTEPS = 3;
export const ITERATIONS = 6;

export const RESTITUTION = 0.38;
export const WALL_RESTITUTION = 0.45;
export const REST_THRESHOLD = 55;
export const FRICTION = 0.955;
export const MERGE_PAD = 0.8;

export const SQUASH_DECAY = 9;
export const SQUASH_MAX = 0.3;
export const SQUASH_REFERENCE = 1500;

export const WALL = 10;
export const MAX_SPEED = 4000;
export const ROLL_FACTOR = 0.85;

const EPSILON = 1e-6;

export function invMass(body: Body): number {
  return body.merged ? 0 : body.invMass;
}

export function integrate(body: Body, dt: number): void {
  body.px = body.x;
  body.py = body.y;
  body.vy += GRAVITY * dt;
  body.pvx = body.vx;
  body.pvy = body.vy;
  body.x += body.vx * dt;
  body.y += body.vy * dt;
  body.contacts = 0;
}

export function wallsOf(options: EngineOptions): {
  left: number;
  right: number;
  floor: number;
  ceiling: number;
} {
  return {
    left: WALL,
    right: options.width - WALL,
    floor: options.height - WALL,
    ceiling: options.topPad ?? 0,
  };
}

export function clampInside(body: Body, options: EngineOptions): boolean {
  const walls = wallsOf(options);
  let moved = false;

  const leftPen = walls.left - (body.x - body.radius);
  const rightPen = body.x + body.radius - walls.right;
  const floorPen = body.y + body.radius - walls.floor;
  const ceilPen = -(body.y - body.radius) + walls.ceiling;

  if (leftPen > 0) {
    body.x += leftPen;
    moved = true;
  }
  if (rightPen > 0) {
    body.x -= rightPen;
    moved = true;
  }
  if (floorPen > 0) {
    body.y -= floorPen;
    moved = true;
  }
  if (ceilPen > 0) {
    body.y += ceilPen;
    moved = true;
  }

  return moved;
}

export function wallContacts(
  body: Body,
  options: EngineOptions,
  out: Contact[],
): boolean {
  const walls = wallsOf(options);
  let hit = false;

  if (body.x - body.radius <= walls.left + EPSILON) {
    out.push({ a: null, b: body, nx: 1, ny: 0 });
    hit = true;
  }
  if (body.x + body.radius >= walls.right - EPSILON) {
    out.push({ a: null, b: body, nx: -1, ny: 0 });
    hit = true;
  }
  if (body.y + body.radius >= walls.floor - EPSILON) {
    out.push({ a: null, b: body, nx: 0, ny: -1 });
    hit = true;
  }
  if (body.y - body.radius <= walls.ceiling + EPSILON) {
    out.push({ a: null, b: body, nx: 0, ny: 1 });
    hit = true;
  }

  return hit;
}

export function hitOf(a: Body, b: Body): PairHit | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const reach = a.radius + b.radius;
  const distSq = dx * dx + dy * dy;
  if (distSq >= reach * reach) return null;

  const dist = Math.sqrt(distSq);
  if (dist < 1e-4) return { gap: -reach, nx: 1, ny: 0 };
  return { gap: dist - reach, nx: dx / dist, ny: dy / dist };
}

export function isOverlapping(a: Body, b: Body): boolean {
  return hitOf(a, b) !== null;
}

export function separate(a: Body, b: Body, hit: PairHit): void {
  const invA = invMass(a);
  const invB = invMass(b);
  const invSum = invA + invB;
  if (invSum < EPSILON) return;

  const corr = Math.min(-hit.gap - 0.05, 4) * 0.9;
  if (corr <= 0) return;

  const wa = invA / invSum;
  const wb = invB / invSum;

  a.x -= hit.nx * corr * wa;
  a.y -= hit.ny * corr * wa;
  b.x += hit.nx * corr * wb;
  b.y += hit.ny * corr * wb;

  a.contacts += 1;
  b.contacts += 1;
}

/**
 * Derive velocity from the solved position delta.
 * Rebuilds contact velocity so resting piles stay quiet.
 */
export function deriveVelocity(body: Body, dt: number): void {
  const invDt = 1 / dt;
  let vx = (body.x - body.px) * invDt;
  let vy = (body.y - body.py) * invDt;

  if (body.contacts > 0) vx *= FRICTION;

  const speed = Math.hypot(vx, vy);
  if (speed > MAX_SPEED) {
    const scale = MAX_SPEED / speed;
    vx *= scale;
    vy *= scale;
  }

  body.vx = vx;
  body.vy = vy;
  body.angle += (body.x - body.px) / body.radius * ROLL_FACTOR;
}

export function decaySquash(body: Body, dt: number): void {
  if (body.squash > 0) {
    body.squash = Math.max(0, body.squash - body.squash * SQUASH_DECAY * dt);
  }
}

function squashAgainst(body: Body, nx: number, ny: number, speed: number): void {
  const amount = Math.min(SQUASH_MAX, speed / SQUASH_REFERENCE);
  if (amount <= body.squash) return;
  body.squash = amount;
  body.squashAngle = Math.atan2(ny, nx);
}

export function applyElasticity(contacts: readonly Contact[]): void {
  for (const contact of contacts) {
    if (contact.a && contact.b) {
      bouncePair(contact.a, contact.b, contact.nx, contact.ny);
    } else if (contact.a) {
      bounceWall(contact.a, contact.nx, contact.ny);
    } else if (contact.b) {
      bounceWall(contact.b, contact.nx, contact.ny);
    }
  }
}

function bounceWall(body: Body, nx: number, ny: number): void {
  if (body.merged) return;
  const vnPre = body.pvx * nx + body.pvy * ny;
  if (vnPre >= -REST_THRESHOLD) return;

  const vnPost = body.vx * nx + body.vy * ny;
  const target = -WALL_RESTITUTION * vnPre;
  const j = target - vnPost;
  if (j <= 0) return;

  body.vx += j * nx;
  body.vy += j * ny;
  squashAgainst(body, nx, ny, -vnPre);
}

function bouncePair(a: Body, b: Body, nx: number, ny: number): void {
  if (a.merged || b.merged) return;
  const vnPre = (a.pvx - b.pvx) * nx + (a.pvy - b.pvy) * ny;
  if (vnPre <= REST_THRESHOLD) return;

  const vnPost = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  const target = -RESTITUTION * vnPre;
  const invA = a.invMass;
  const invB = b.invMass;
  const invSum = invA + invB;
  if (invSum < EPSILON) return;

  const j = (vnPost - target) / invSum;
  if (j <= 0) return;

  a.vx -= j * invA * nx;
  a.vy -= j * invA * ny;
  b.vx += j * invB * nx;
  b.vy += j * invB * ny;
  squashAgainst(a, -nx, -ny, vnPre);
  squashAgainst(b, nx, ny, vnPre);
}

export function gridCellSize(): number {
  return 2 * (FRUITS[FRUITS.length - 1]?.radius ?? 160);
}

export function pairKey(a: number, b: number): number {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return lo * 100003 + hi;
}
