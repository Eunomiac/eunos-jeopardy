/**
 * Broadcast Service for Real-Time Buzzer Communication.
 *
 * This service manages Supabase Realtime broadcast channels for immediate
 * buzzer communication between host and players. It provides type-safe
 * methods for broadcasting and receiving buzzer events with <50ms latency.
 *
 * **Architecture:**
 * - Uses Supabase Realtime broadcast (not postgres_changes)
 * - Ephemeral communication for time-sensitive events
 * - Database writes follow broadcasts for persistence
 * - Self-receive enabled for host to see own broadcasts
 * - No acknowledgment required (speed priority)
 *
 * **Channel Naming:**
 * - Format: `game-buzzer:${gameId}`
 * - One channel per game
 * - Automatically cleaned up on unsubscribe
 *
 * **Performance:**
 * - Target latency: <50ms typical, <100ms p99
 * - Non-blocking operations
 * - Immediate UI updates
 *
 * @example
 * ```typescript
 * // Host unlocks buzzer
 * await BroadcastService.broadcastBuzzerUnlock(gameId, clueId);
 *
 * // Player subscribes to events
 * const subscription = BroadcastService.subscribeToGameBuzzer(gameId, {
 *   onBuzzerUnlock: (payload) => enableBuzzer(payload.timestamp),
 *   onPlayerBuzz: (payload) => lockBuzzer(),
 * });
 *
 * // Cleanup
 * subscription.unsubscribe();
 * ```
 *
 * @since 0.2.0
 * @author Euno's Jeopardy Team
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import {
  BROADCAST_EVENTS,
  BuzzerEventHandlers,
  BuzzerUnlockPayload,
  BuzzerLockPayload,
  PlayerBuzzPayload,
  FocusPlayerPayload,
  BroadcastSubscription,
} from '../../types/BroadcastEvents';

/**
 * Service for managing real-time broadcast channels for buzzer events.
 */
export class BroadcastService {
  /**
   * Active channels by game ID for cleanup tracking.
   */
  private static activeChannels = new Map<string, RealtimeChannel>();

  /**
   * Creates a game buzzer broadcast channel.
   *
   * Configures channel for immediate broadcast with self-receive enabled
   * and no acknowledgment required for maximum speed.
   *
   * @param gameId - Game ID for channel
   * @returns Configured Realtime channel
   */
  static createGameBuzzerChannel(gameId: string): RealtimeChannel {
    const channelName = `game-buzzer:${gameId}`;
    
    // Remove existing channel if present
    const existingChannel = this.activeChannels.get(gameId);
    if (existingChannel) {
      existingChannel.unsubscribe();
      this.activeChannels.delete(gameId);
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: {
          self: true,  // Host receives own broadcasts
          ack: false,  // Don't wait for acknowledgment (speed priority)
        },
      },
    });

    this.activeChannels.set(gameId, channel);
    return channel;
  }

  /**
   * Subscribes to game buzzer events with provided handlers.
   *
   * Creates a broadcast channel and sets up event handlers for all
   * buzzer events. Handlers are called immediately when events are
   * received (typically <50ms after broadcast).
   *
   * @param gameId - Game ID to subscribe to
   * @param handlers - Event handler callbacks
   * @returns Subscription handle for cleanup
   */
  static subscribeToGameBuzzer(
    gameId: string,
    handlers: BuzzerEventHandlers
  ): BroadcastSubscription {
    const channel = this.createGameBuzzerChannel(gameId);

    // Set up event handlers
    if (handlers.onBuzzerUnlock) {
      channel.on('broadcast', { event: BROADCAST_EVENTS.BUZZER_UNLOCK }, (message) => {
        handlers.onBuzzerUnlock!(message.payload as BuzzerUnlockPayload);
      });
    }

    if (handlers.onBuzzerLock) {
      channel.on('broadcast', { event: BROADCAST_EVENTS.BUZZER_LOCK }, (message) => {
        handlers.onBuzzerLock!(message.payload as BuzzerLockPayload);
      });
    }

    if (handlers.onPlayerBuzz) {
      channel.on('broadcast', { event: BROADCAST_EVENTS.PLAYER_BUZZ }, (message) => {
        handlers.onPlayerBuzz!(message.payload as PlayerBuzzPayload);
      });
    }

    if (handlers.onFocusPlayer) {
      channel.on('broadcast', { event: BROADCAST_EVENTS.FOCUS_PLAYER }, (message) => {
        handlers.onFocusPlayer!(message.payload as FocusPlayerPayload);
      });
    }

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to buzzer channel: ${gameId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Error subscribing to buzzer channel: ${gameId}`);
      } else if (status === 'TIMED_OUT') {
        console.error(`⏱️ Timeout subscribing to buzzer channel: ${gameId}`);
      }
    });

    return {
      unsubscribe: () => {
        channel.unsubscribe();
        this.activeChannels.delete(gameId);
        console.log(`🔌 Unsubscribed from buzzer channel: ${gameId}`);
      },
      channelId: `game-buzzer:${gameId}`,
    };
  }

  /**
   * Broadcasts buzzer unlock event (Host only).
   *
   * Signals to all clients that buzzers are now active and players
   * can buzz in. Includes server timestamp for client synchronization.
   *
   * @param gameId - Game ID
   * @param clueId - Clue ID being unlocked for
   * @returns Promise resolving when broadcast is sent
   */
  static async broadcastBuzzerUnlock(
    gameId: string,
    clueId: string
  ): Promise<void> {
    const channel = this.activeChannels.get(gameId);
    if (!channel) {
      console.error(`❌ No active channel for game: ${gameId}`);
      return;
    }

    const payload: BuzzerUnlockPayload = {
      gameId,
      clueId,
      timestamp: Date.now(),
    };

    await channel.send({
      type: 'broadcast',
      event: BROADCAST_EVENTS.BUZZER_UNLOCK,
      payload,
    });

    console.log(`🔓 Broadcast buzzer unlock for game ${gameId}, clue ${clueId}`);
  }

  /**
   * Broadcasts buzzer lock event (Host only).
   *
   * Signals to all clients that buzzers are now locked and players
   * cannot buzz in.
   *
   * @param gameId - Game ID
   * @returns Promise resolving when broadcast is sent
   */
  static async broadcastBuzzerLock(gameId: string): Promise<void> {
    const channel = this.activeChannels.get(gameId);
    if (!channel) {
      console.error(`❌ No active channel for game: ${gameId}`);
      return;
    }

    const payload: BuzzerLockPayload = {
      gameId,
      timestamp: Date.now(),
    };

    await channel.send({
      type: 'broadcast',
      event: BROADCAST_EVENTS.BUZZER_LOCK,
      payload,
    });

    console.log(`🔒 Broadcast buzzer lock for game ${gameId}`);
  }

  /**
   * Broadcasts player buzz event (Player only).
   *
   * Signals to all clients that a player has buzzed in with their
   * reaction time. All clients should immediately lock buzzers and
   * focus the fastest player.
   *
   * @param gameId - Game ID
   * @param clueId - Clue ID being answered
   * @param playerId - Player ID who buzzed
   * @param playerNickname - Player nickname for display
   * @param reactionTimeMs - Client-calculated reaction time
   * @returns Promise resolving when broadcast is sent
   */
  static async broadcastPlayerBuzz(
    gameId: string,
    clueId: string,
    playerId: string,
    playerNickname: string,
    reactionTimeMs: number
  ): Promise<void> {
    const channel = this.activeChannels.get(gameId);
    if (!channel) {
      console.error(`❌ No active channel for game: ${gameId}`);
      return;
    }

    const payload: PlayerBuzzPayload = {
      gameId,
      clueId,
      playerId,
      playerNickname,
      reactionTimeMs,
      clientTimestamp: Date.now(),
    };

    await channel.send({
      type: 'broadcast',
      event: BROADCAST_EVENTS.PLAYER_BUZZ,
      payload,
    });

    console.log(`⚡ Broadcast player buzz: ${playerNickname} (${reactionTimeMs}ms)`);
  }

  /**
   * Broadcasts focus player event (Host only).
   *
   * Signals to all clients which player should be focused/highlighted.
   * Used for automatic fastest player selection and manual overrides.
   *
   * @param gameId - Game ID
   * @param playerId - Player ID to focus
   * @param playerNickname - Player nickname for display
   * @param source - Source of focus change ('auto', 'manual', or 'correction')
   * @returns Promise resolving when broadcast is sent
   */
  static async broadcastFocusPlayer(
    gameId: string,
    playerId: string,
    playerNickname: string,
    source: 'auto' | 'manual' | 'correction' = 'auto'
  ): Promise<void> {
    const channel = this.activeChannels.get(gameId);
    if (!channel) {
      console.error(`❌ No active channel for game: ${gameId}`);
      return;
    }

    const payload: FocusPlayerPayload = {
      gameId,
      playerId,
      playerNickname,
      source,
    };

    await channel.send({
      type: 'broadcast',
      event: BROADCAST_EVENTS.FOCUS_PLAYER,
      payload,
    });

    console.log(`👁️ Broadcast focus player: ${playerNickname} (${source})`);
  }

  /**
   * Cleans up all active channels.
   *
   * Unsubscribes from all active broadcast channels. Should be called
   * on application shutdown or when leaving a game.
   */
  static cleanup(): void {
    this.activeChannels.forEach((channel, gameId) => {
      channel.unsubscribe();
      console.log(`🧹 Cleaned up channel for game: ${gameId}`);
    });
    this.activeChannels.clear();
  }
}

