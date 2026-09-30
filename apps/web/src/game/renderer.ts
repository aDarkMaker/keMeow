import { FRUITS, type Body, type FruitSpec } from "@kemeow/game-core";
import { DROP_Y } from "./theme";

export interface RenderOptions {
  width: number;
  height: number;
  dropLine: number;
  baseUrl: string;
  pendingLevel: number;
  nextLevel: number;
  pendingX: number;
  ready: boolean;
}

const AIM_BOB = 2.5;
const NEXT_BUBBLE_RADIUS = 15;
const NEXT_BUBBLE_Y = 26;

const textureCache = new Map<string, HTMLImageElement>();
const failedTextures = new Set<string>();
const pendingLoads = new Map<string, Promise<HTMLImageElement | null>>();

export function loadTexture(baseUrl: string, spec: FruitSpec): HTMLImageElement | null {
  if (!spec.texture) return null;
  const url = resolveAssetUrl(baseUrl, spec.texture);
  if (failedTextures.has(url)) return null;

  const cached = textureCache.get(url);
  if (cached?.complete && cached.naturalWidth > 0) return cached;

  void ensureTexture(baseUrl, spec);
  return null;
}

function ensureTexture(baseUrl: string, spec: FruitSpec): Promise<HTMLImageElement | null> {
  if (!spec.texture) return Promise.resolve(null);
  const url = resolveAssetUrl(baseUrl, spec.texture);
  if (failedTextures.has(url)) return Promise.resolve(null);

  const cached = textureCache.get(url);
  if (cached?.complete && cached.naturalWidth > 0) return Promise.resolve(cached);

  const pending = pendingLoads.get(url);
  if (pending) return pending;

  const job = new Promise<HTMLImageElement | null>((resolve) => {
    const image = textureCache.get(url) ?? new Image();
    image.decoding = "async";
    textureCache.set(url, image);

    const finishOk = (): void => {
      pendingLoads.delete(url);
      resolve(image.naturalWidth > 0 ? image : null);
    };
    const finishErr = (): void => {
      failedTextures.add(url);
      textureCache.delete(url);
      pendingLoads.delete(url);
      resolve(null);
    };

    if (image.complete && image.naturalWidth > 0) {
      void image.decode().then(finishOk, finishOk);
      return;
    }

    image.addEventListener("load", () => {
      void image.decode().then(finishOk, finishOk);
    }, { once: true });
    image.addEventListener("error", finishErr, { once: true });
    if (!image.src) image.src = url;
  });

  pendingLoads.set(url, job);
  return job;
}

function resolveAssetUrl(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${base}${path}`;
}

/** Wait until every mood texture is decoded (or failed) before first paint. */
export async function preloadTextures(baseUrl: string): Promise<void> {
  await Promise.all(FRUITS.map((spec) => ensureTexture(baseUrl, spec)));
}

export function render(
  ctx: CanvasRenderingContext2D,
  bodies: readonly Body[],
  options: RenderOptions,
): void {
  ctx.clearRect(0, 0, options.width, options.height);
  drawDropLine(ctx, options);

  for (const body of bodies) {
    drawBody(ctx, body, options);
  }

  drawNextBubble(ctx, options);
  drawAim(ctx, options);
}

function drawAim(ctx: CanvasRenderingContext2D, options: RenderOptions): void {
  const spec = FRUITS[options.pendingLevel - 1];
  if (!spec) return;

  const x = options.pendingX;
  const bob = Math.sin(performance.now() / 320) * AIM_BOB;
  const y = DROP_Y + bob;
  const ready = options.ready;

  if (ready) {
    ctx.save();
    ctx.setLineDash([5, 8]);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "rgba(240, 113, 160, 0.34)";
    ctx.beginPath();
    ctx.moveTo(x, DROP_Y + spec.radius + 4);
    ctx.lineTo(x, options.height - 10);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.arc(x, y, spec.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  if (!ready) ctx.globalAlpha = 0.4;
  drawCircle(ctx, x, y, spec, options);
  ctx.restore();
}

function drawNextBubble(ctx: CanvasRenderingContext2D, options: RenderOptions): void {
  const spec = FRUITS[options.nextLevel - 1];
  if (!spec) return;

  const x = options.width - 34;
  const y = NEXT_BUBBLE_Y;
  const labelY = y;

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.font = '600 11px "Drawably Pen", system-ui, sans-serif';
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(240, 113, 160, 0.85)";
  ctx.fillText("Next", x - NEXT_BUBBLE_RADIUS - 10, labelY);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.72;
  if (typeof ctx.filter === "string") ctx.filter = "blur(0.6px)";
  drawCircle(ctx, x, y, spec, options, NEXT_BUBBLE_RADIUS / spec.radius);
  ctx.filter = "none";
  ctx.restore();

  /* Ghost halo around the next bubble. */
  ctx.save();
  const halo = ctx.createRadialGradient(x, y, NEXT_BUBBLE_RADIUS * 0.2, x, y, NEXT_BUBBLE_RADIUS * 1.35);
  halo.addColorStop(0, "rgba(255, 250, 252, 0)");
  halo.addColorStop(0.7, "rgba(255, 250, 252, 0.08)");
  halo.addColorStop(1, "rgba(255, 250, 252, 0.42)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, NEXT_BUBBLE_RADIUS * 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spec: FruitSpec,
  options: RenderOptions,
  scale = 1,
): void {
  ctx.save();
  ctx.translate(x, y);

  if (scale !== 1) ctx.scale(scale, scale);

  ctx.beginPath();
  ctx.arc(0, 0, spec.radius, 0, Math.PI * 2);
  ctx.closePath();

  const texture = loadTexture(options.baseUrl, spec);
  if (texture) {
    drawTexture(ctx, spec.radius, texture, 0);
  } else {
    ctx.fillStyle = sphereGradient(ctx, spec.radius, spec);
    ctx.fill();
  }

  ctx.restore();
}

function drawDropLine(ctx: CanvasRenderingContext2D, options: RenderOptions): void {
  ctx.save();
  ctx.setLineDash([14, 12]);
  ctx.strokeStyle = "rgba(240, 113, 160, 0.34)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, options.dropLine);
  ctx.lineTo(options.width, options.dropLine);
  ctx.stroke();
  ctx.restore();
}

export { drawCircle };

function drawBody(ctx: CanvasRenderingContext2D, body: Body, options: RenderOptions): void {
  const spec = FRUITS[body.level - 1];
  if (!spec) return;

  ctx.save();
  ctx.translate(body.x, body.y);

  /* Squash along contact normal. */
  if (body.squash > 0.001) {
    const along = 1 - body.squash;
    const across = 1 + body.squash * 0.6;
    ctx.rotate(body.squashAngle);
    ctx.scale(along, across);
    ctx.rotate(-body.squashAngle);
  }

  const texture = loadTexture(options.baseUrl, spec);
  if (texture) {
    drawTexture(ctx, body.radius, texture, body.angle);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, body.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = sphereGradient(ctx, body.radius, spec);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draw a silhouette texture fitted inside the radius box.
 * The PNG owns its outline, so no circular clip is applied.
 */
function drawTexture(
  ctx: CanvasRenderingContext2D,
  radius: number,
  texture: HTMLImageElement,
  angle: number,
): void {
  const box = radius * 2;
  const scale = Math.min(box / texture.naturalWidth, box / texture.naturalHeight);
  const width = texture.naturalWidth * scale;
  const height = texture.naturalHeight * scale;

  ctx.save();
  ctx.rotate(angle);
  ctx.drawImage(texture, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function sphereGradient(
  ctx: CanvasRenderingContext2D,
  radius: number,
  spec: FruitSpec,
): CanvasGradient {
  const gradient = ctx.createRadialGradient(
    -radius * 0.34,
    -radius * 0.34,
    radius * 0.12,
    0,
    0,
    radius,
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.22, spec.color);
  gradient.addColorStop(0.78, spec.color);
  gradient.addColorStop(1, spec.shade);
  return gradient;
}

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  options: RenderOptions,
): CanvasRenderingContext2D | null {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(options.width * ratio);
  canvas.height = Math.floor(options.height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}
