export interface PointerMapping {
  canvas: HTMLCanvasElement;
  boardWidth: number;
}

export function clientToBoardX(event: PointerEvent | MouseEvent, mapping: PointerMapping): number {
  const rect = mapping.canvas.getBoundingClientRect();
  if (rect.width <= 0) return mapping.boardWidth / 2;
  const ratio = mapping.boardWidth / rect.width;
  return (event.clientX - rect.left) * ratio;
}

export function isKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

export function arrowDirection(key: string): number {
  if (key === "ArrowLeft" || key === "a" || key === "A") return -1;
  if (key === "ArrowRight" || key === "d" || key === "D") return 1;
  return 0;
}

export function isDropKey(key: string): boolean {
  return key === " " || key === "Spacebar" || key === "Enter" || key === "ArrowDown" || key === "s";
}
