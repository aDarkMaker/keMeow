export type FruitId =
  | "probe"
  | "daze"
  | "squint"
  | "innocent"
  | "grin"
  | "guilty"
  | "ponder"
  | "cry"
  | "hurt"
  | "love"
  | "stunned";

export interface FruitSpec {
  id: FruitId;
  level: number;
  /** Label for HUD / merge chain. */
  name: string;
  radius: number;
  color: string;
  shade: string;
  texture: string | null;
}

const TABLE: readonly FruitSpec[] = [
  {
    id: "probe",
    level: 1,
    name: "探头",
    radius: 20,
    color: "#f7b6c3",
    shade: "#d1748c",
    texture: "textures/meows/01-probe.png",
  },
  {
    id: "daze",
    level: 2,
    name: "发呆",
    radius: 28,
    color: "#f9c6d0",
    shade: "#db8c9e",
    texture: "textures/meows/02-daze.png",
  },
  {
    id: "squint",
    level: 3,
    name: "眯眼",
    radius: 37,
    color: "#fbd9e0",
    shade: "#dfa2b0",
    texture: "textures/meows/03-squint.png",
  },
  {
    id: "innocent",
    level: 4,
    name: "无辜",
    radius: 47,
    color: "#f8cfd8",
    shade: "#d9929f",
    texture: "textures/meows/04-innocent.png",
  },
  {
    id: "grin",
    level: 5,
    name: "欸嘿",
    radius: 58,
    color: "#f9c1cd",
    shade: "#dc8496",
    texture: "textures/meows/05-grin.png",
  },
  {
    id: "guilty",
    level: 6,
    name: "心虚",
    radius: 70,
    color: "#efa9bb",
    shade: "#c97387",
    texture: "textures/meows/06-guilty.png",
  },
  {
    id: "ponder",
    level: 7,
    name: "思考",
    radius: 84,
    color: "#f6c2cd",
    shade: "#d68e9e",
    texture: "textures/meows/07-ponder.png",
  },
  {
    id: "cry",
    level: 8,
    name: "哭泣",
    radius: 100,
    color: "#fbd2dc",
    shade: "#d49aa8",
    texture: "textures/meows/08-cry.png",
  },
  {
    id: "hurt",
    level: 9,
    name: "受伤",
    radius: 118,
    color: "#f5c0cb",
    shade: "#cf8494",
    texture: "textures/meows/09-hurt.png",
  },
  {
    id: "love",
    level: 10,
    name: "喜欢",
    radius: 138,
    color: "#f9aec1",
    shade: "#d1738b",
    texture: "textures/meows/10-love.png",
  },
  {
    id: "stunned",
    level: 11,
    name: "懵",
    radius: 160,
    color: "#f8d5dd",
    shade: "#d79fac",
    texture: "textures/meows/11-stunned.png",
  },
];

export const FRUITS: readonly FruitSpec[] = TABLE;
export const MAX_LEVEL = TABLE.length;
export const DROPPABLE_LEVELS = 5;

export function specOfLevel(level: number): FruitSpec {
  const spec = TABLE[level - 1];
  if (!spec) {
    throw new RangeError(`no fruit for level ${level}`);
  }
  return spec;
}

export function radiusOfLevel(level: number): number {
  return specOfLevel(level).radius;
}

export function nameOfLevel(level: number): string {
  return specOfLevel(level).name;
}

export const MAX_RADIUS = TABLE[TABLE.length - 1]?.radius ?? 160;
