export interface HudTargets {
  score: HTMLElement;
  best: HTMLElement;
  state: HTMLElement | null;
}

export function hudTargets(root: ParentNode = document): HudTargets | null {
  const score = root.querySelector<HTMLElement>('[data-hud="score"]');
  const best = root.querySelector<HTMLElement>('[data-hud="best"]');
  if (!score || !best) return null;
  const state = root.querySelector<HTMLElement>('[data-hud="state"]');
  return { score, best, state };
}
