import type { Game } from "../games/GameService";

// Semantic animation intents published by the domain orchestrator
export type AnimationIntent =
  | { type: "BoardIntro"; gameId: string; round: NonNullable<Game["current_round"]> }
  | { type: "CategoryIntro"; gameId: string; categoryNumber: number }
  | { type: "ClueReveal"; gameId: string; clueId: string };

export type AnimationSubscriber = (intent: AnimationIntent) => void | Promise<void>;

export class AnimationEvents {
  private static subscribers: Set<AnimationSubscriber> = new Set();

  static subscribe(cb: AnimationSubscriber): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  static publish(intent: AnimationIntent): void {
    for (const cb of this.subscribers) {
      try {
        void cb(intent);
      } catch (err) {
        console.warn("AnimationEvents subscriber error:", err);
      }
    }
  }
}

