import type { FruitSpec } from "./fruits";

export interface EngineOptions {
  width: number;
  height: number;
  dropLine: number;
  /** Soft ceiling inset (optional). */
  topPad?: number;
  /** Spawn Y for a dropped body. */
  dropY?: number;
  /** Initial vy on drop. */
  dropSpeed?: number;
}

export interface Body {
  id: number;
  level: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  px: number;
  py: number;
  pvx: number;
  pvy: number;
  angle: number;
  spin: number;
  radius: number;
  mass: number;
  invMass: number;
  contacts: number;
  overTime: number;
  squash: number;
  squashAngle: number;
  merged: boolean;
}

export interface MergeEvent {
  level: number;
  x: number;
  y: number;
  gained: number;
}

export interface StepResult {
  merges: MergeEvent[];
  over: boolean;
}

export interface Contact {
  a: Body | null;
  b: Body | null;
  nx: number;
  ny: number;
}export interface PairHit {
  gap: number;
  nx: number;
  ny: number;
}

export function createBody(id: number, spec: FruitSpec, x: number, y: number): Body {
  const mass = spec.radius * spec.radius;
  return {
    id,
    level: spec.level,
    x,
    y,
    vx: 0,
    vy: 0,
    px: x,
    py: y,
    pvx: 0,
    pvy: 0,
    angle: 0,
    spin: 0,
    radius: spec.radius,
    mass,
    invMass: 1 / mass,
    contacts: 0,
    overTime: 0,
    squash: 0,
    squashAngle: 0,
    merged: false,
  };
}

export function isOverlap(a: Body, b: Body): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const reach = a.radius + b.radius;
  return dx * dx + dy * dy < reach * reach;
}
