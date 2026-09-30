import type { StepResult } from "@kemeow/game-core";
import { resketch } from "@kemeow/ui";
import { hudTargets } from "@/lib/hud";
import { formatScore, readBest, writeBest } from "@/lib/storage";
import { arrowDirection, clientToBoardX, isDropKey, isKeyboardTarget } from "./input";
import { drawChainPreview, drawNextPreview } from "./previews";
import { preloadTextures, render, resizeCanvas, type RenderOptions } from "./renderer";
import { getSession, restartSession } from "./session";
import { GameSound } from "./sound";
import { BOARD_HEIGHT, BOARD_WIDTH, KEY_STEP } from "./theme";

export interface MountOptions {
  canvas: HTMLCanvasElement;
  nextCanvas: HTMLCanvasElement;
  chainCanvas: HTMLCanvasElement;
  restartBtn: HTMLButtonElement;
  muteBtn: HTMLButtonElement;
  root?: ParentNode;
}

const DROP_COOLDOWN = 0.36;

export function mount({
  canvas,
  nextCanvas,
  chainCanvas,
  restartBtn,
  muteBtn,
  root = document,
}: MountOptions): () => void {
  const hud = hudTargets(root);
  if (!hud) return () => undefined;

  const baseUrl = import.meta.env.BASE_URL;

  const sound = new GameSound({ baseUrl });
  const session = getSession();
  let { game } = session;
  let phase = game.over ? "over" : session.phase;
  let cooldown = session.cooldown;
  session.phase = phase;

  const controllers: AbortController[] = [];
  const listen = (
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
  ): void => {
    const controller = new AbortController();
    target.addEventListener(type, handler, { signal: controller.signal });
    controllers.push(controller);
  };

  let paused = document.hidden;
  let frameId = 0;
  let alive = true;
  let texturesReady = false;
  /* Touch: drag aim, release drop. Mouse: move aim, press drop. */
  let touchAiming = false;

  const renderOptions: RenderOptions = {
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    dropLine: game.dropLine,
    baseUrl,
    pendingLevel: game.pendingLevel,
    nextLevel: game.nextLevel,
    pendingX: game.pendingX,
    ready: false,
  };

  let ctx = resizeCanvas(canvas, renderOptions);
  const mapping = { canvas, boardWidth: BOARD_WIDTH };
  let last = performance.now();

  const syncPreview = (): void => {
    if (!texturesReady) return;
    const compact = window.matchMedia("(max-width: 48rem)").matches;
    drawNextPreview(nextCanvas, game.nextLevel, { render: renderOptions }, compact);
    drawChainPreview(chainCanvas, { render: renderOptions }, compact);
  };

  const syncHud = (): void => {
    hud.score.textContent = formatScore(game.score);
    hud.best.textContent = formatScore(Math.max(readBest(), game.score));
    if (hud.state) hud.state.textContent = phase === "over" ? "Game over" : "Playing";
    syncPreview();
  };

  const persist = (): void => {
    session.game = game;
    session.phase = phase;
    session.cooldown = cooldown;
  };

  const finish = (): void => {
    phase = "over";
    sound.over();
    writeBest(game.score);
    persist();
    syncHud();
  };

  const frame = (now: number): void => {
    if (!alive) return;
    const dt = (now - last) / 1000;
    last = now;

    if (texturesReady && !paused && phase !== "over") {
      cooldown = Math.max(0, cooldown - dt);
      const result: StepResult = game.step(dt);
      if (result.merges.length > 0) {
        for (const merge of result.merges) sound.merge(merge.level);
        syncHud();
      }
      if (result.over) finish();
    }

    renderOptions.pendingLevel = game.pendingLevel;
    renderOptions.nextLevel = game.nextLevel;
    renderOptions.pendingX = game.pendingX;
    renderOptions.ready = texturesReady && phase !== "over" && cooldown <= 0;

    if (ctx) {
      if (texturesReady) {
        render(ctx, game.bodies, renderOptions);
        syncPreview();
      } else {
        ctx.clearRect(0, 0, renderOptions.width, renderOptions.height);
      }
    }
    frameId = requestAnimationFrame(frame);
  };

  const drop = (): void => {
    if (!texturesReady || phase === "over" || cooldown > 0) return;
    const body = game.drop();
    if (!body) return;
    sound.unlock();
    sound.drop();
    cooldown = DROP_COOLDOWN;
    persist();
    syncHud();
  };

  const restart = (): void => {
    const next = restartSession();
    game = next.game;
    phase = next.phase;
    cooldown = next.cooldown;
    touchAiming = false;
    sound.unlock();
    syncHud();
  };

  const paintMute = (): void => {
    const on = !sound.isMuted;
    muteBtn.setAttribute("aria-pressed", String(on));
    const label = muteBtn.querySelector<HTMLElement>(".lbl");
    if (label) label.textContent = `音效${on ? "开" : "关"}`;
    const onIcon = muteBtn.querySelector<HTMLImageElement>(".icon-on");
    const offIcon = muteBtn.querySelector<HTMLImageElement>(".icon-off");
    if (onIcon) onIcon.hidden = !on;
    if (offIcon) offIcon.hidden = on;
    resketch(muteBtn);
  };

  listen(muteBtn, "click", () => {
    const muted = sound.toggle();
    paintMute();
    if (!muted) {
      sound.unlock();
      sound.merge(1);
    }
  });

  /* Mouse drops on press; touch drops on release. */
  listen(canvas, "pointerdown", ((event: PointerEvent) => {
    if (phase === "over") return;
    sound.unlock();
    game.moveTop(clientToBoardX(event, mapping));
    if (event.pointerType === "touch") {
      touchAiming = true;
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }
    drop();
  }) as EventListener);

  listen(canvas, "pointermove", ((event: PointerEvent) => {
    if (phase === "over") return;
    if (event.pointerType === "touch" && !touchAiming) return;
    game.moveTop(clientToBoardX(event, mapping));
  }) as EventListener);

  listen(canvas, "pointerup", ((event: PointerEvent) => {
    if (event.pointerType !== "touch" || !touchAiming) return;
    touchAiming = false;
    if (phase === "over") return;
    game.moveTop(clientToBoardX(event, mapping));
    drop();
  }) as EventListener);

  listen(canvas, "pointercancel", (() => {
    touchAiming = false;
  }) as EventListener);

  listen(canvas, "contextmenu", ((event: Event) => event.preventDefault()) as EventListener);

  listen(window, "keydown", ((event: KeyboardEvent) => {
    if (isKeyboardTarget(event.target)) return;

    const direction = arrowDirection(event.key);
    if (direction !== 0) {
      event.preventDefault();
      game.moveTop(game.pendingX + direction * KEY_STEP);
      return;
    }

    if (isDropKey(event.key) && phase !== "over") {
      event.preventDefault();
      drop();
      return;
    }

    if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      restart();
    }
  }) as EventListener);

  listen(document, "visibilitychange", () => {
    paused = document.hidden;
    last = performance.now();
  });

  listen(window, "resize", () => {
    ctx = resizeCanvas(canvas, renderOptions);
    syncPreview();
  });

  listen(restartBtn, "click", restart);

  paintMute();
  syncHud();
  frameId = requestAnimationFrame(frame);

  void preloadTextures(baseUrl).then(() => {
    if (!alive) return;
    texturesReady = true;
    last = performance.now();
    syncHud();
  });

  return () => {
    persist();
    alive = false;
    cancelAnimationFrame(frameId);
    for (const controller of controllers) controller.abort();
  };
}
