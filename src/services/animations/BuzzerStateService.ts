/**
 * Buzzer State Service for managing enhanced buzzer states.
 *
 * This service provides centralized management of the six-state buzzer system
 * for the PlayerDashboard, handling state transitions, validation, and
 * coordination with game flow.
 *
 * **Six Buzzer States:**
 * - HIDDEN: Starting state before game begins
 * - INACTIVE: Default state during round, no clue selected
 * - LOCKED: Clue revealed but players cannot buzz in yet
 * - UNLOCKED: Players can buzz in
 * - BUZZED: Player has buzzed in - waiting for host response
 * - FROZEN: Punishment for buzzing in too early or after being marked wrong
 *
 * **State Flow:**
 * HIDDEN → INACTIVE → LOCKED → UNLOCKED → BUZZED → INACTIVE
 *                                    ↓ (early buzz)
 *                                  FROZEN → INACTIVE
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

import { BuzzerState } from '../../types/BuzzerState';

/**
 * Buzzer state transition configuration.
 */
export interface BuzzerStateTransition {
  /** Current state */
  from: BuzzerState;
  /** Target state */
  to: BuzzerState;
  /** Whether transition is valid */
  valid: boolean;
  /** Reason for invalid transition */
  reason?: string;
}

/**
 * Buzzer state context information.
 */
export interface BuzzerStateContext {
  /** Current game status */
  gameStatus: string;
  /** Whether a clue is currently focused */
  hasClue: boolean;
  /** Whether buzzer is locked by host */
  isLocked: boolean;
  /** Whether player has already buzzed */
  hasBuzzed: boolean;
  /** Whether player is frozen */
  isFrozen: boolean;
}

/**
 * Buzzer State Service class.
 */
export class BuzzerStateService {
  private static instance: Maybe<BuzzerStateService>;

  /**
   * Valid state transitions map.
   */
  private static readonly VALID_TRANSITIONS: Record<BuzzerState, BuzzerState[]> = {
    [BuzzerState.HIDDEN]: [BuzzerState.INACTIVE],
    [BuzzerState.INACTIVE]: [BuzzerState.LOCKED, BuzzerState.HIDDEN],
    [BuzzerState.LOCKED]: [BuzzerState.UNLOCKED, BuzzerState.FROZEN, BuzzerState.INACTIVE],
    [BuzzerState.UNLOCKED]: [BuzzerState.BUZZED, BuzzerState.LOCKED, BuzzerState.INACTIVE],
    [BuzzerState.BUZZED]: [BuzzerState.INACTIVE, BuzzerState.FROZEN],
    [BuzzerState.FROZEN]: [BuzzerState.INACTIVE]
  };

  /**
   * Gets the singleton instance of BuzzerStateService.
   */
  static getInstance(): BuzzerStateService {
    BuzzerStateService.instance ??= new BuzzerStateService();
    return BuzzerStateService.instance;
  }

  /**
   * Determines the appropriate buzzer state based on game context.
   *
   * @param context - Current game context
   * @returns Appropriate buzzer state
   */
  determineState(context: BuzzerStateContext): BuzzerState {
    // Game not started yet
    if (context.gameStatus === 'lobby') {
      return BuzzerState.HIDDEN;
    }

    // Category introductions
    if (context.gameStatus === 'introducing_categories') {
      return BuzzerState.INACTIVE;
    }

    // Player is frozen
    if (context.isFrozen) {
      return BuzzerState.FROZEN;
    }

    // Player has buzzed
    if (context.hasBuzzed) {
      return BuzzerState.BUZZED;
    }

    // No clue selected
    if (!context.hasClue) {
      return BuzzerState.INACTIVE;
    }

    // Clue selected but buzzer locked
    if (context.isLocked) {
      return BuzzerState.LOCKED;
    }

    // Clue selected and buzzer unlocked
    return BuzzerState.UNLOCKED;
  }

  /**
   * Validates a state transition.
   *
   * @param from - Current state
   * @param to - Target state
   * @returns Transition validation result
   */
  validateTransition(from: BuzzerState, to: BuzzerState): BuzzerStateTransition {
    const validTargets = BuzzerStateService.VALID_TRANSITIONS[from];
    const valid = validTargets.includes(to);

    const result: BuzzerStateTransition = {
      from,
      to,
      valid
    };

    // Only include reason if transition is invalid (exactOptionalPropertyTypes compliance)
    if (!valid) {
      result.reason = `Invalid transition from ${from} to ${to}`;
    }

    return result;
  }

  /**
   * Gets the CSS class name for a buzzer state.
   *
   * @param state - Buzzer state
   * @returns CSS class name
   */
  getStateClassName(state: BuzzerState): string {
    return `buzzer-${state}`;
  }

  /**
   * Gets the display text for a buzzer state.
   *
   * @param state - Buzzer state
   * @returns Human-readable state description
   */
  getStateDisplayText(state: BuzzerState): string {
    switch (state) {
      case BuzzerState.HIDDEN:
        return 'Game Starting...';
      case BuzzerState.INACTIVE:
        return 'Ready';
      case BuzzerState.LOCKED:
        return 'Wait...';
      case BuzzerState.UNLOCKED:
        return 'BUZZ!';
      case BuzzerState.BUZZED:
        return 'Buzzed!';
      case BuzzerState.FROZEN:
        return 'Frozen';
      default:
        return 'Unknown';
    }
  }

  /**
   * Checks if buzzer is interactive in the given state.
   * LOCKED buzzers are enabled to allow early buzz detection (which triggers FROZEN state).
   *
   * @param state - Buzzer state
   * @returns Whether buzzer can be clicked
   */
  isInteractive(state: BuzzerState): boolean {
    return state === BuzzerState.UNLOCKED || state === BuzzerState.LOCKED;
  }

  /**
   * Gets the next logical state after a buzz attempt.
   *
   * @param currentState - Current buzzer state
   * @param isEarlyBuzz - Whether the buzz was too early
   * @returns Next state after buzz
   */
  getPostBuzzState(currentState: BuzzerState, isEarlyBuzz: boolean): BuzzerState {
    if (isEarlyBuzz) {
      return BuzzerState.FROZEN;
    }

    if (currentState === BuzzerState.UNLOCKED) {
      return BuzzerState.BUZZED;
    }

    // Invalid buzz attempt
    return currentState;
  }

  /**
   * Gets all possible states.
   *
   * @returns Array of all buzzer states
   */
  getAllStates(): BuzzerState[] {
    return Object.values(BuzzerState);
  }

  /**
   * Checks if a state represents an active game state.
   *
   * @param state - Buzzer state to check
   * @returns Whether state is active
   */
  isActiveState(state: BuzzerState): boolean {
    return ![BuzzerState.HIDDEN, BuzzerState.INACTIVE].includes(state);
  }

  /**
   * Gets the priority level of a state for UI ordering.
   *
   * @param state - Buzzer state
   * @returns Priority level (higher = more important)
   */
  getStatePriority(state: BuzzerState): number {
    switch (state) {
      case BuzzerState.BUZZED:
        return 5;
      case BuzzerState.FROZEN:
        return 4;
      case BuzzerState.UNLOCKED:
        return 3;
      case BuzzerState.LOCKED:
        return 2;
      case BuzzerState.INACTIVE:
        return 1;
      case BuzzerState.HIDDEN:
        return 0;
      default:
        return 0;
    }
  }
}
