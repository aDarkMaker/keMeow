const BEST_KEY = "kemeow:best";

export function readBest(): number {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return 0;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function writeBest(score: number): boolean {
  try {
    if (score <= readBest()) return false;
    localStorage.setItem(BEST_KEY, String(Math.floor(score)));
    return true;
  } catch {
    return false;
  }
}

export function formatScore(score: number): string {
  return Math.max(0, Math.floor(score)).toLocaleString("en-US");
}
