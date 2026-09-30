import { FRUITS, type FruitSpec } from "@kemeow/game-core";
import { drawCircle, type RenderOptions } from "./renderer";

export interface PreviewOptions {
  render: RenderOptions;
}

export function drawNextPreview(
  canvas: HTMLCanvasElement,
  level: number,
  options: PreviewOptions,
  fitToBox = false,
): void {
  const prepared = prepare(canvas, fitToBox);
  if (!prepared) return;

  const { ctx, width, height } = prepared;
  const spec = FRUITS[level - 1];
  if (!spec) return;

  const size = Math.min(width, height);
  const scale = (size * (fitToBox ? 0.46 : 0.42)) / spec.radius;
  drawCircle(ctx, width / 2, height / 2, spec, options.render, scale);
}

export function drawChainPreview(
  canvas: HTMLCanvasElement,
  options: PreviewOptions,
  fitToBox = false,
): void {
  if (fitToBox) {
    drawChainWrapped(canvas, options);
    return;
  }
  drawChainRow(canvas, options);
}

/** Desktop: one fixed row, unchanged from the original layout. */
function drawChainRow(canvas: HTMLCanvasElement, options: PreviewOptions): void {
  const prepared = prepare(canvas, false);
  if (!prepared) return;

  const { ctx, width, height } = prepared;
  const slot = width / FRUITS.length;
  const radius = slot * 0.34;
  const cy = height / 2;

  for (let i = 0; i < FRUITS.length; i += 1) {
    const spec: FruitSpec | undefined = FRUITS[i];
    if (!spec) continue;

    const x = slot * (i + 0.5);
    drawCircle(ctx, x, cy, spec, options.render, radius / spec.radius);

    if (i < FRUITS.length - 1) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = "#f071a0";
      ctx.font = `600 ${Math.round(height * 0.28)}px "Drawably Pen", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("›", x + slot * 0.5, cy);
      ctx.restore();
    }
  }
}

/** Mobile: wrap into rows that fit the box, then fill it with the largest spheres. */
function drawChainWrapped(canvas: HTMLCanvasElement, options: PreviewOptions): void {
  const prepared = prepare(canvas, true);
  if (!prepared) return;

  const { ctx, width, height } = prepared;
  const count = FRUITS.length;
  const gap = Math.max(1, Math.min(width, height) * 0.06);
  const layout = bestLayout(count, width, height, gap);
  const { perRow, rows, size } = layout;
  const radius = size * 0.42;
  const contentH = rows * size + (rows - 1) * gap;
  const originY = Math.max(0, (height - contentH) / 2);

  ctx.font = `400 ${Math.max(6, Math.round(size * 0.34))}px "Drawably Pen", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f071a0";

  for (let i = 0; i < count; i += 1) {
    const spec: FruitSpec | undefined = FRUITS[i];
    if (!spec) continue;

    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const rowCount = Math.min(perRow, count - row * perRow);
    const rowWidth = rowCount * size + (rowCount - 1) * gap;
    const originX = (width - rowWidth) / 2;
    const cx = originX + col * (size + gap) + size / 2;
    const cy = originY + row * (size + gap) + size / 2;

    drawCircle(ctx, cx, cy, spec, options.render, radius / spec.radius);

    if (col < rowCount - 1 && i < count - 1) {
      ctx.globalAlpha = 0.4;
      ctx.fillText("›", cx + (size + gap) / 2, cy);
      ctx.globalAlpha = 1;
    }
  }
}

interface ChainLayout {
  perRow: number;
  rows: number;
  size: number;
}

/** Find the wrapping that keeps every sphere inside the box at the largest size. */
function bestLayout(count: number, width: number, height: number, gap: number): ChainLayout {
  let best: ChainLayout = { perRow: count, rows: 1, size: 0 };

  for (let n = 1; n <= count; n += 1) {
    const rows = Math.ceil(count / n);
    const slotW = (width - gap * (n - 1)) / n;
    const slotH = (height - gap * (rows - 1)) / rows;
    const size = Math.min(slotW, slotH);
    if (size <= 0) continue;
    if (size > best.size + 0.01) best = { perRow: n, rows, size };
  }

  return best;
}

function prepare(
  canvas: HTMLCanvasElement,
  fitToBox = false,
): { ctx: CanvasRenderingContext2D; width: number; height: number } | null {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = Number(canvas.dataset.logicalWidth || canvas.getAttribute("width") || 160);
  let height = Number(canvas.dataset.logicalHeight || canvas.getAttribute("height") || 160);

  if (fitToBox) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 1 && rect.height > 1) {
      width = rect.width;
      height = rect.height;
    }
  }

  const pixelW = Math.max(1, Math.floor(width * dpr));
  const pixelH = Math.max(1, Math.floor(height * dpr));

  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW;
    canvas.height = pixelH;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
}
