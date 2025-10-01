import type { Game } from "../games/GameService";
import { AnimationEvents } from "./AnimationEvents";

/**
 * Lightweight domain → animation-intent orchestrator.
 *
 * It does NOT touch the DOM. It only inspects game state deltas and
 * publishes semantic AnimationEvents that components can react to safely.
 */
export class AnimationOrchestrator {
  private static instance: AnimationOrchestrator;
  private readonly lastStateByGame: Map<string, Partial<Game>> = new Map();

  static getInstance(): AnimationOrchestrator {
    if (!this.instance) {this.instance = new AnimationOrchestrator();}
    return this.instance;
  }

  /**
   * Ingest a fresh game state (typically from realtime subscription) and
   * publish intents for meaningful changes.
   */
  ingestGameUpdate(next: Partial<Game> & { id: string }): void {
    const gameId = next.id;
    const prev = this.lastStateByGame.get(gameId);

    // Board intro when entering game_intro status
    if (next.status === ("game_intro" as GameStatus) && prev?.status !== ("game_intro" as GameStatus) && next.current_round) {
      AnimationEvents.publish({ type: "BoardIntro", gameId, round: next.current_round });
    }

    // Category introduction during introducing_categories flow
    const nextIntroCat = (next).current_introduction_category as number | undefined;
    const prevIntroCat = prev ? (prev).current_introduction_category as number | undefined : undefined;
    if (next.status === ("introducing_categories" as GameStatus) && typeof nextIntroCat === "number" && nextIntroCat > 0 && nextIntroCat !== prevIntroCat) {
      AnimationEvents.publish({ type: "CategoryIntro", gameId, categoryNumber: nextIntroCat });
    }

    // Clue reveal when focused_clue_id is set/changed
    if (next.focused_clue_id && next.focused_clue_id !== prev?.focused_clue_id) {
      AnimationEvents.publish({ type: "ClueReveal", gameId, clueId: next.focused_clue_id });
    }

    // Persist last state snapshot
    this.lastStateByGame.set(gameId, next);
  }

  clear(gameId: string): void {
    this.lastStateByGame.delete(gameId);
  }
}
