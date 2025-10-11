import type { Game } from "../games/GameService";

// Semantic animation intents published by the domain orchestrator
export type AnimationIntent =
  | { type: "BoardIntro"; gameId: string; round: NonNullable<Game["current_round"]> }
  | { type: "CategoryIntro"; gameId: string; categoryNumber: number }
  | { type: "ClueReveal"; gameId: string; clueId: string }
  | { type: "DailyDoubleReveal"; gameId: string; clueId: string }
  | { type: "DailyDoubleClueReveal"; gameId: string; clueId: string }
  | { type: "RoundTransition"; gameId: string; fromRound: NonNullable<Game["current_round"]>; toRound: NonNullable<Game["current_round"]> };

export type AnimationSubscriber = (intent: AnimationIntent) => void | Promise<void>;

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AnimationEvents {
  static readonly subscribers = new Set<AnimationSubscriber>();
  static readonly recentIntents = new Map<string, { intent: AnimationIntent; timestamp: number }>();
  private static readonly INTENT_CACHE_DURATION = 2000; // Keep intents for 2 seconds

  static subscribe(cb: AnimationSubscriber): () => void {
    this.subscribers.add(cb);
    console.log(`🎬 [AnimationEvents] Subscriber added (total: ${this.subscribers.size})`);
    return () => {
      this.subscribers.delete(cb);
      console.log(`🎬 [AnimationEvents] Subscriber removed (total: ${this.subscribers.size})`);
    };
  }

  static publish(intent: AnimationIntent): void {
    console.log(`🎬 [AnimationEvents] Publishing intent:`, intent);
    console.log(`🎬 [AnimationEvents] Notifying ${this.subscribers.size} subscriber(s)`);

    // Cache the intent for components that mount shortly after publication
    const key = `${intent.type}:${intent.gameId}`;
    this.recentIntents.set(key, { intent, timestamp: Date.now() });

    for (const cb of this.subscribers) {
      try {
        void cb(intent); // NOSONAR (Void return is intentional)
      } catch (err) {
        console.warn("🎬 [AnimationEvents] Subscriber error:", err);
      }
    }
  }

  /**
   * Check if an intent was recently published (within INTENT_CACHE_DURATION).
   * Used by components that mount after an intent was published.
   */
  static wasRecentlyPublished(type: AnimationIntent["type"], gameId: string): boolean {
    const key = `${type}:${gameId}`;
    const cached = this.recentIntents.get(key);

    if (!cached) {return false;}

    const age = Date.now() - cached.timestamp;
    if (age > this.INTENT_CACHE_DURATION) {
      // Clean up old intent
      this.recentIntents.delete(key);
      return false;
    }

    console.log(`🎬 [AnimationEvents] Intent ${type} was recently published ${age}ms ago`);
    return true;
  }
}
