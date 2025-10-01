import type { Game } from "../games/GameService";

// Semantic animation intents published by the domain orchestrator
export type AnimationIntent =
  | { type: "BoardIntro"; gameId: string; round: NonNullable<Game["current_round"]> }
  | { type: "CategoryIntro"; gameId: string; categoryNumber: number }
  | { type: "ClueReveal"; gameId: string; clueId: string };

export type AnimationSubscriber = (intent: AnimationIntent) => void | Promise<void>;

export class AnimationEvents {
  private static readonly subscribers: Set<AnimationSubscriber> = new Set();

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
    for (const cb of this.subscribers) {
      try {
        cb(intent);
      } catch (err) {
        console.warn("🎬 [AnimationEvents] Subscriber error:", err);
      }
    }
  }
}
