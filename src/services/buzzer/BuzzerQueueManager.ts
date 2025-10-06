/**
 * Buzzer Queue Manager for Real-Time Buzzer System.
 *
 * This service manages the in-memory buzzer queue for the host, tracking
 * all player buzzes with reaction times and determining the fastest player
 * for automatic focusing. It handles late buzz corrections when faster
 * buzzes arrive after slower ones.
 *
 * **Responsibilities:**
 * - Maintain ordered list of buzzes by reaction time
 * - Determine current fastest player
 * - Handle late buzz insertions and corrections
 * - Provide queue state for UI display
 * - Track buzz history for current clue
 *
 * **Queue Ordering:**
 * - Buzzes sorted by reaction time (fastest first)
 * - Late buzzes automatically inserted in correct position
 * - Duplicate buzzes from same player ignored
 *
 * **Usage:**
 * ```typescript
 * const queueManager = new BuzzerQueueManager();
 *
 * // Add buzz
 * queueManager.addBuzz('player-1', 'Alice', 450);
 * queueManager.addBuzz('player-2', 'Bob', 380);
 *
 * // Get fastest player
 * const fastest = queueManager.getFastestPlayer(); // 'player-2' (Bob, 380ms)
 *
 * // Get full queue for display
 * const queue = queueManager.getQueue();
 *
 * // Clear for next clue
 * queueManager.clear();
 * ```
 *
 * @since 0.2.0
 * @author Euno's Jeopardy Team
 */

/**
 * Buzz entry in the queue.
 */
export interface BuzzEntry {
  /** Player ID who buzzed */
  playerId: string;
  /** Player nickname for display */
  playerNickname: string;
  /** Reaction time in milliseconds */
  reactionTimeMs: number;
  /** Timestamp when buzz was received (for debugging) */
  receivedAt: number;
}

/**
 * Manager for buzzer queue with automatic fastest player selection.
 */
export class BuzzerQueueManager {
  /**
   * Ordered list of buzzes (fastest first).
   */
  private queue: BuzzEntry[] = [];

  /**
   * Set of player IDs who have already buzzed (for duplicate detection).
   */
  private readonly buzzedPlayers = new Set<string>();

  /**
   * Adds a buzz to the queue.
   *
   * Inserts buzz in correct position based on reaction time.
   * Ignores duplicate buzzes from the same player.
   * Returns true if this is a new fastest buzz.
   *
   * @param playerId - Player ID who buzzed
   * @param playerNickname - Player nickname for display
   * @param reactionTimeMs - Reaction time in milliseconds
   * @returns True if this buzz is now the fastest
   */
  addBuzz(
    playerId: string,
    playerNickname: string,
    reactionTimeMs: number
  ): boolean {
    // Ignore duplicate buzzes from same player
    if (this.buzzedPlayers.has(playerId)) {
      console.log(`⚠️ Duplicate buzz from ${playerNickname} ignored`);
      return false;
    }

    const entry: BuzzEntry = {
      playerId,
      playerNickname,
      reactionTimeMs,
      receivedAt: Date.now(),
    };

    // Track that this player has buzzed
    this.buzzedPlayers.add(playerId);

    // Find insertion position (maintain sorted order by reaction time)
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (reactionTimeMs < this.queue[i].reactionTimeMs) {
        insertIndex = i;
        break;
      }
    }

    // Insert at correct position
    this.queue.splice(insertIndex, 0, entry);

    // Log queue state
    console.log(
      `📊 Buzzer queue updated: ${this.queue.map(
        (b) => `${b.playerNickname}(${b.reactionTimeMs}ms)`
      ).join(', ')}`
    );

    // Return true if this is the new fastest buzz
    return insertIndex === 0;
  }

  /**
   * Gets the fastest player (first in queue).
   *
   * @returns Player ID of fastest player, or null if queue is empty
   */
  getFastestPlayer(): string | null {
    return this.queue.length > 0 ? this.queue[0].playerId : null;
  }

  /**
   * Gets the fastest player's nickname.
   *
   * @returns Nickname of fastest player, or null if queue is empty
   */
  getFastestPlayerNickname(): string | null {
    return this.queue.length > 0 ? this.queue[0].playerNickname : null;
  }

  /**
   * Gets the fastest player's reaction time.
   *
   * @returns Reaction time of fastest player in ms, or null if queue is empty
   */
  getFastestReactionTime(): number | null {
    return this.queue.length > 0 ? this.queue[0].reactionTimeMs : null;
  }

  /**
   * Gets the full buzzer queue.
   *
   * Returns a copy of the queue to prevent external modification.
   *
   * @returns Array of buzz entries sorted by reaction time
   */
  getQueue(): BuzzEntry[] {
    return [...this.queue];
  }

  /**
   * Checks if a player has already buzzed.
   *
   * @param playerId - Player ID to check
   * @returns True if player has buzzed
   */
  hasBuzz(playerId: string): boolean {
    return this.buzzedPlayers.has(playerId);
  }

  /**
   * Gets the number of buzzes in the queue.
   *
   * @returns Number of players who have buzzed
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Checks if the queue is empty.
   *
   * @returns True if no buzzes in queue
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Clears the buzzer queue.
   *
   * Removes all buzzes and resets state for next clue.
   * Should be called when moving to a new clue or resetting buzzer.
   */
  clear(): void {
    this.queue = [];
    this.buzzedPlayers.clear();
    console.log('🧹 Buzzer queue cleared');
  }

  /**
   * Gets queue statistics for debugging.
   *
   * @returns Object with queue statistics
   */
  getStats(): {
    totalBuzzes: number;
    fastestTime: number | null;
    slowestTime: number | null;
    averageTime: number | null;
  } {
    if (this.queue.length === 0) {
      return {
        totalBuzzes: 0,
        fastestTime: null,
        slowestTime: null,
        averageTime: null,
      };
    }

    const times = this.queue.map((b) => b.reactionTimeMs);
    const sum = times.reduce((acc, time) => acc + time, 0);

    return {
      totalBuzzes: this.queue.length,
      fastestTime: Math.min(...times),
      slowestTime: Math.max(...times),
      averageTime: sum / times.length,
    };
  }
}
