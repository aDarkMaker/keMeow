import {
  drawablyBadge,
  drawablyButton,
  drawablyCard,
  drawablyDivider,
  type ButtonSketch,
  type DrawablyBadgeOptions,
  type DrawablyButtonOptions,
  type DrawablyOptions,
  type Sketch,
} from "drawably";

export type Kind = "button" | "card" | "badge" | "divider";

export interface Attached {
  el: HTMLElement;
  kind: Kind;
  sketch: Sketch;
}

const registry = new Set<Attached>();

export function attachButton(el: HTMLElement, options?: DrawablyButtonOptions): ButtonSketch {
  const existing = sketchOf(el);
  if (existing) return existing as ButtonSketch;
  const sketch = drawablyButton(el, options);
  track(el, "button", sketch);
  return sketch;
}

export function attachCard(el: HTMLElement, options?: DrawablyOptions): Sketch {
  const existing = sketchOf(el);
  if (existing) return existing;
  const sketch = drawablyCard(el, options);
  track(el, "card", sketch);
  return sketch;
}

export function attachBadge(el: HTMLElement, options?: DrawablyBadgeOptions): Sketch {
  const existing = sketchOf(el);
  if (existing) return existing;
  const sketch = drawablyBadge(el, options);
  track(el, "badge", sketch);
  return sketch;
}

export function attachDivider(el: HTMLElement, options?: DrawablyOptions): Sketch {
  const existing = sketchOf(el);
  if (existing) return existing;
  const sketch = drawablyDivider(el, options);
  track(el, "divider", sketch);
  return sketch;
}

export function attachTree(root: ParentNode = document): Attached[] {
  const attached: Attached[] = [];
  for (const el of root.querySelectorAll<HTMLElement>("[data-drawably]")) {
    if (el.classList.contains("drawably-host")) continue;
    const kind = el.dataset.drawably as Kind | undefined;
    if (!kind) continue;
    attached.push({ el, kind, sketch: attachOne(el, kind) });
  }
  return attached;
}

export function destroyTree(root: ParentNode): void {
  for (const entry of [...registry]) {
    const inRoot = containsNode(root, entry.el);
    const orphan = !document.documentElement.contains(entry.el);
    if (!inRoot && !orphan) continue;
    entry.sketch.destroy();
    registry.delete(entry);
  }
}

export function destroyAll(): void {
  for (const entry of registry) entry.sketch.destroy();
  registry.clear();
}

export function resketch(el: HTMLElement): void {
  sketchOf(el)?.resketch();
}

export function sketchOf(el: HTMLElement): Sketch | null {
  for (const entry of registry) {
    if (entry.el === el) return entry.sketch;
  }
  return null;
}

function attachOne(el: HTMLElement, kind: Kind): Sketch {
  switch (kind) {
    case "button":
      return attachButton(el);
    case "card":
      return attachCard(el);
    case "badge":
      return attachBadge(el);
    case "divider":
      return attachDivider(el);
  }
}

function track(el: HTMLElement, kind: Kind, sketch: Sketch): void {
  registry.add({ el, kind, sketch });
}

function containsNode(root: ParentNode, el: HTMLElement): boolean {
  if (root === document) return document.documentElement.contains(el);
  if (root instanceof Node) return root === el || root.contains(el);
  return false;
}

export type { ButtonSketch };
