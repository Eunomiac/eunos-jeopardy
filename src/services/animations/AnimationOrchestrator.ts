import type { Game } from "../games/GameService";
import { AnimationEvents } from "./AnimationEvents";
import { ClueService } from "../clues/ClueService";

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

    const prevIntroCat = prev ? (prev as Partial<Game> & { current_introduction_category?: number }).current_introduction_category : undefined;
    const nextIntroCat = (next as Partial<Game> & { current_introduction_category?: number }).current_introduction_category;

    console.log(`🎬 [AnimationOrchestrator] Ingesting game update for ${gameId}`, {
      prevStatus: prev?.status,
      nextStatus: next.status,
      prevRound: prev?.current_round,
      nextRound: next.current_round,
      prevIntroCat,
      nextIntroCat,
      prevFocusedClue: prev?.focused_clue_id,
      nextFocusedClue: next.focused_clue_id,
      prevFocusedPlayer: prev?.focused_player_id,
      nextFocusedPlayer: next.focused_player_id
    });

    // Round transition when current_round changes (jeopardy → double → final)
    if (next.current_round && prev?.current_round && next.current_round !== prev.current_round) {
      console.log(`🎬 [AnimationOrchestrator] Detected RoundTransition trigger (round: ${prev.current_round} → ${next.current_round})`);
      AnimationEvents.publish({
        type: "RoundTransition",
        gameId,
        fromRound: prev.current_round,
        toRound: next.current_round
      });
    }

    // Board intro when entering game_intro status
    if (next.status === ("game_intro" as GameStatus) && prev?.status !== ("game_intro" as GameStatus) && next.current_round) {
      console.log(`🎬 [AnimationOrchestrator] Detected BoardIntro trigger (status: ${prev?.status} → ${next.status})`);
      AnimationEvents.publish({ type: "BoardIntro", gameId, round: next.current_round });
    }

    // Category introduction during introducing_categories flow
    if (next.status === ("introducing_categories" as GameStatus) && typeof nextIntroCat === "number" && nextIntroCat > 0 && nextIntroCat !== prevIntroCat) {
      console.log(`🎬 [AnimationOrchestrator] Detected CategoryIntro trigger (category: ${prevIntroCat} → ${nextIntroCat})`);
      AnimationEvents.publish({ type: "CategoryIntro", gameId, categoryNumber: nextIntroCat });
    }

    // Daily Double reveal when focused_player_id is set for a daily double clue
    // This happens when host clicks "Daily Double!" button
    if (next.focused_player_id && next.focused_player_id !== prev?.focused_player_id && next.focused_clue_id) {
      // Check if the focused clue is a daily double
      ClueService.isDailyDouble(next.focused_clue_id).then((isDailyDouble) => {
        if (isDailyDouble) {
          console.log(`🎬 [AnimationOrchestrator] Detected DailyDoubleReveal trigger (player focused for daily double)`);
          AnimationEvents.publish({ type: "DailyDoubleReveal", gameId, clueId: next.focused_clue_id! });
        }
      }).catch((error) => {
        console.error(`🎬 [AnimationOrchestrator] Error checking daily double status:`, error);
      });
    }

    // Note: ClueReveal and DailyDoubleClueReveal are triggered by clue_states.revealed changes
    // These are handled by a separate subscription in PlayerDashboard that watches clue_states table

    // Player buzz-in when focused_player_id is set/changed
    if (next.focused_player_id && next.focused_player_id !== prev?.focused_player_id) {
      console.log(`🎬 [AnimationOrchestrator] Detected PlayerBuzzIn trigger (player: ${prev?.focused_player_id} → ${next.focused_player_id})`);
      AnimationEvents.publish({ type: "PlayerBuzzIn", gameId, playerId: next.focused_player_id });
    }

    // Persist last state snapshot
    this.lastStateByGame.set(gameId, next);
  }

  clear(gameId: string): void {
    this.lastStateByGame.delete(gameId);
  }
}
