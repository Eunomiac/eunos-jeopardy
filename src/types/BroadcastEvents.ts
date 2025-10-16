/**
 * Broadcast Event Types for Real-Time Buzzer System.
 *
 * This module defines all broadcast event types, payloads, and handlers for the
 * real-time buzzer system using Supabase Realtime broadcast channels. These events
 * enable immediate (<50ms) communication between host and players for time-sensitive
 * buzzer operations.
 *
 * **Architecture:**
 * - Broadcast for immediacy: All time-sensitive UI updates via broadcast
 * - Host as database authority: Only Host writes to database
 * - Database as source of truth: Database updates can override broadcast state
 * - Client-side timing: Players calculate reaction times locally
 * - Automatic selection: Fastest player immediately focused
 *
 * **Event Flow:**
 * 1. Host unlocks buzzer → broadcasts `buzzer_unlock` → updates database
 * 2. Players receive unlock → enable buzzer UI
 * 3. Player clicks buzzer → broadcasts `player_buzz` → all clients lock buzzers
 * 4. All clients auto-focus fastest player
 * 5. Host writes buzz to database
 *
 * @since 0.2.0
 * @author Euno's Jeopardy Team
 */

/**
 * Event name constants for type-safe event handling.
 */
export const BROADCAST_EVENTS = {
  /** Host signals buzzers are now active */
  BUZZER_UNLOCK: 'buzzer_unlock',
  /** Host signals buzzers are now locked */
  BUZZER_LOCK: 'buzzer_lock',
  /** Player submits buzz with reaction time */
  PLAYER_BUZZ: 'player_buzz',
  /** Host or system sets focused player */
  FOCUS_PLAYER: 'focus_player',
  /** Player buzzed early and is now frozen */
  PLAYER_FROZEN: 'player_frozen',
} as const;

/**
 * Type for broadcast event names.
 */
export type BroadcastEventName = typeof BROADCAST_EVENTS[keyof typeof BROADCAST_EVENTS];

/**
 * Buzzer unlock event payload.
 *
 * Sent by host when unlocking buzzers for player responses.
 * Includes server timestamp for client synchronization.
 */
export interface BuzzerUnlockPayload {
  /** Game ID where buzzer is being unlocked */
  gameId: string;
  /** Clue ID for which buzzer is being unlocked */
  clueId: string;
  /** Server timestamp for client sync (milliseconds since epoch) */
  timestamp: number;
}

/**
 * Buzzer lock event payload.
 *
 * Sent by host when locking buzzers (after buzz, timeout, or manual lock).
 */
export interface BuzzerLockPayload {
  /** Game ID where buzzer is being locked */
  gameId: string;
  /** Server timestamp (milliseconds since epoch) */
  timestamp: number;
}

/**
 * Player buzz event payload.
 *
 * Sent by player when they click the buzzer. Includes client-calculated
 * reaction time to eliminate server latency bias.
 */
export interface PlayerBuzzPayload {
  /** Game ID where buzz occurred */
  gameId: string;
  /** Clue ID being answered */
  clueId: string;
  /** Player ID who buzzed */
  playerId: string;
  /** Player nickname for display */
  playerNickname: string;
  /** Client-calculated reaction time in milliseconds */
  reactionTimeMs: number;
  /** Client timestamp for audit/debugging (milliseconds since epoch) */
  clientTimestamp: number;
}

/**
 * Focus player event payload.
 *
 * Sent by host or automatically by system when setting focused player.
 * Indicates which player should be highlighted across all clients.
 */
export interface FocusPlayerPayload {
  /** Game ID where player is being focused */
  gameId: string;
  /** Player ID to focus */
  playerId: string;
  /** Player nickname for display */
  playerNickname: string;
  /** Source of focus change */
  source: 'auto' | 'manual' | 'correction';
}

/**
 * Player frozen event payload.
 *
 * Sent by player when they buzz early (while locked) and become frozen.
 * Notifies all clients that this player is locked out.
 */
export interface PlayerFrozenPayload {
  /** Game ID where player was frozen */
  gameId: string;
  /** Clue ID where early buzz occurred */
  clueId: string;
  /** Player ID who was frozen */
  playerId: string;
  /** Player nickname for display */
  playerNickname: string;
  /** Client timestamp for audit/debugging (milliseconds since epoch) */
  clientTimestamp: number;
}

/**
 * Union type of all broadcast event payloads.
 */
export type BroadcastPayload =
  | BuzzerUnlockPayload
  | BuzzerLockPayload
  | PlayerBuzzPayload
  | FocusPlayerPayload
  | PlayerFrozenPayload;

/**
 * Handler function for buzzer unlock events.
 * Handlers are called synchronously for immediate UI updates.
 * Any async operations (e.g., database writes) should be fired off
 * in the background without blocking the handler.
 */
export type BuzzerUnlockHandler = (payload: BuzzerUnlockPayload) => void;

/**
 * Handler function for buzzer lock events.
 * Handlers are called synchronously for immediate UI updates.
 * Any async operations (e.g., database writes) should be fired off
 * in the background without blocking the handler.
 */
export type BuzzerLockHandler = (payload: BuzzerLockPayload) => void;

/**
 * Handler function for player buzz events.
 * Handlers are called synchronously for immediate UI updates.
 * Any async operations (e.g., database writes) should be fired off
 * in the background without blocking the handler.
 */
export type PlayerBuzzHandler = (payload: PlayerBuzzPayload) => void;

/**
 * Handler function for focus player events.
 * Handlers are called synchronously for immediate UI updates.
 * Any async operations (e.g., database writes) should be fired off
 * in the background without blocking the handler.
 */
export type FocusPlayerHandler = (payload: FocusPlayerPayload) => void;

/**
 * Handler function for player frozen events.
 * Handlers are called synchronously for immediate UI updates.
 * Any async operations (e.g., database writes) should be fired off
 * in the background without blocking the handler.
 */
export type PlayerFrozenHandler = (payload: PlayerFrozenPayload) => void;

/**
 * Collection of event handlers for buzzer broadcast events.
 *
 * All handlers are optional to allow selective subscription to events.
 */
export interface BuzzerEventHandlers {
  /** Handler for buzzer unlock events */
  onBuzzerUnlock?: BuzzerUnlockHandler;
  /** Handler for buzzer lock events */
  onBuzzerLock?: BuzzerLockHandler;
  /** Handler for player buzz events */
  onPlayerBuzz?: PlayerBuzzHandler;
  /** Handler for focus player events */
  onFocusPlayer?: FocusPlayerHandler;
  /** Handler for player frozen events */
  onPlayerFrozen?: PlayerFrozenHandler;
}

/**
 * Broadcast message wrapper for type-safe event handling.
 *
 * Wraps payload with event type for runtime type discrimination.
 */
export interface BroadcastMessage<T extends BroadcastPayload = BroadcastPayload> {
  /** Event type identifier */
  event: BroadcastEventName;
  /** Event payload */
  payload: T;
}

/**
 * Subscription handle for managing broadcast channel lifecycle.
 */
export interface BroadcastSubscription {
  /** Unsubscribe from broadcast channel */
  unsubscribe: () => void;
  /** Channel ID for debugging */
  channelId: string;
}
