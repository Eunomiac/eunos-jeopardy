/**
 * Game State Class Service for dynamic CSS class management.
 *
 * This service provides centralized management of dynamic CSS classes
 * for visual feedback in the PlayerDashboard, handling focused categories,
 * empty categories, buzzed podiums, and frozen podiums.
 *
 * **Visual Feedback Features:**
 * - Focused category highlighting during clue selection
 * - Empty category styling when all clues completed
 * - Buzzed podium styling for active players
 * - Frozen podium styling for penalized players
 * - Smooth transitions between states
 *
 * **Integration:**
 * - Works with existing SCSS styling system
 * - Provides consistent class naming conventions
 * - Manages state transitions and cleanup
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

import type { ClueState } from '../../services/clues/ClueService';
import type { Player } from '../../services/games/GameService';
import { BuzzerState } from '../../types/BuzzerState';

/**
 * Category state information.
 */
export interface CategoryState {
  /** Category index (0-5) */
  index: number;
  /** Category name */
  name: string;
  /** Whether category is currently focused */
  isFocused: boolean;
  /** Whether all clues in category are completed */
  isEmpty: boolean;
  /** Number of completed clues */
  completedCount: number;
  /** Total number of clues */
  totalCount: number;
}

/**
 * Player podium state information.
 */
export interface PodiumState {
  /** Player ID */
  playerId: string;
  /** Player nickname */
  nickname: string;
  /** Current buzzer state */
  buzzerState: BuzzerState;
  /** Whether player is currently focused */
  isFocused: boolean;
  /** Whether player has buzzed in */
  hasBuzzed: boolean;
  /** Whether player is frozen */
  isFrozen: boolean;
  /** Player's current score */
  score: number;
}

/**
 * Game State Class Service class.
 */
export class GameStateClassService {
  private static instance: GameStateClassService;

  /**
   * CSS class name constants.
   */
  private static readonly CLASS_NAMES = {
    // Category classes
    CATEGORY_FOCUSED: 'category-focused',
    CATEGORY_EMPTY: 'category-empty',
    CATEGORY_PARTIAL: 'category-partial',
    CATEGORY_COMPLETE: 'category-complete',

    // Podium classes
    PODIUM_BUZZED: 'podium-buzzed',
    PODIUM_FROZEN: 'podium-frozen',
    PODIUM_FOCUSED: 'podium-focused',
    PODIUM_ACTIVE: 'podium-active',
    PODIUM_INACTIVE: 'podium-inactive',

    // State transition classes
    TRANSITIONING: 'state-transitioning',
    ANIMATING: 'state-animating'
  } as const;

  /**
   * Gets the singleton instance of GameStateClassService.
   */
  static getInstance(): GameStateClassService {
    if (!GameStateClassService.instance) {
      GameStateClassService.instance = new GameStateClassService();
    }
    return GameStateClassService.instance;
  }

  /**
   * Gets CSS classes for a category based on its state.
   *
   * @param categoryState - Category state information
   * @returns Array of CSS class names
   */
  getCategoryClasses(categoryState: CategoryState): string[] {
    const classes: string[] = [];

    if (categoryState.isFocused) {
      classes.push(GameStateClassService.CLASS_NAMES.CATEGORY_FOCUSED);
    }

    if (categoryState.isEmpty) {
      classes.push(GameStateClassService.CLASS_NAMES.CATEGORY_EMPTY);
    } else if (categoryState.completedCount > 0) {
      classes.push(GameStateClassService.CLASS_NAMES.CATEGORY_PARTIAL);
    }

    if (categoryState.completedCount === categoryState.totalCount) {
      classes.push(GameStateClassService.CLASS_NAMES.CATEGORY_COMPLETE);
    }

    return classes;
  }

  /**
   * Gets CSS classes for a player podium based on its state.
   *
   * @param podiumState - Podium state information
   * @returns Array of CSS class names
   */
  getPodiumClasses(podiumState: PodiumState): string[] {
    const classes: string[] = [];

    if (podiumState.isFocused) {
      classes.push(GameStateClassService.CLASS_NAMES.PODIUM_FOCUSED);
    }

    if (podiumState.hasBuzzed) {
      classes.push(GameStateClassService.CLASS_NAMES.PODIUM_BUZZED);
    }

    if (podiumState.isFrozen) {
      classes.push(GameStateClassService.CLASS_NAMES.PODIUM_FROZEN);
    }

    // Add buzzer state specific classes
    switch (podiumState.buzzerState) {
      case BuzzerState.UNLOCKED:
      case BuzzerState.BUZZED:
        classes.push(GameStateClassService.CLASS_NAMES.PODIUM_ACTIVE);
        break;
      case BuzzerState.HIDDEN:
      case BuzzerState.INACTIVE:
        classes.push(GameStateClassService.CLASS_NAMES.PODIUM_INACTIVE);
        break;
    }

    return classes;
  }

  /**
   * Calculates category states from clue states and current focus.
   *
   * @param clueStates - Array of clue states
   * @param categoryNames - Array of category names
   * @param focusedClueId - ID of currently focused clue
   * @returns Array of category states
   */
  calculateCategoryStates(
    clueStates: ClueState[],
    categoryNames: string[],
    focusedClueId: string | null
  ): CategoryState[] {
    return categoryNames.map((name, index) => {
      // Find clues for this category (assuming 5 clues per category)
      const categoryClues = clueStates.filter((_, clueIndex) => 
        Math.floor(clueIndex / 5) === index
      );

      const completedCount = categoryClues.filter(clue => clue.completed).length;
      const totalCount = categoryClues.length;
      const isEmpty = completedCount === totalCount;

      // Check if focused clue is in this category
      let isFocused = false;
      if (focusedClueId) {
        const focusedClueState = clueStates.find(state => state.clue_id === focusedClueId);
        if (focusedClueState) {
          const focusedClueIndex = clueStates.indexOf(focusedClueState);
          isFocused = Math.floor(focusedClueIndex / 5) === index;
        }
      }

      return {
        index,
        name,
        isFocused,
        isEmpty,
        completedCount,
        totalCount
      };
    });
  }

  /**
   * Calculates podium states from players and game state.
   *
   * @param players - Array of players
   * @param focusedPlayerId - ID of currently focused player
   * @param buzzerStates - Map of player IDs to buzzer states
   * @returns Array of podium states
   */
  calculatePodiumStates(
    players: Player[],
    focusedPlayerId: string | null,
    buzzerStates: Map<string, BuzzerState>
  ): PodiumState[] {
    return players.map(player => {
      const buzzerState = buzzerStates.get(player.user_id) || BuzzerState.INACTIVE;
      const isFocused = player.user_id === focusedPlayerId;
      const hasBuzzed = buzzerState === BuzzerState.BUZZED;
      const isFrozen = buzzerState === BuzzerState.FROZEN;

      return {
        playerId: player.user_id,
        nickname: player.nickname || 'Unknown Player',
        buzzerState,
        isFocused,
        hasBuzzed,
        isFrozen,
        score: player.score
      };
    });
  }

  /**
   * Applies CSS classes to a DOM element.
   *
   * @param element - Target DOM element
   * @param classes - Array of CSS class names to apply
   * @param prefix - Optional prefix for class names
   */
  applyClasses(element: HTMLElement, classes: string[], prefix?: string): void {
    // Remove existing state classes
    this.removeStateClasses(element, prefix);

    // Add new classes
    classes.forEach(className => {
      const fullClassName = prefix ? `${prefix}-${className}` : className;
      element.classList.add(fullClassName);
    });
  }

  /**
   * Removes state-related CSS classes from a DOM element.
   *
   * @param element - Target DOM element
   * @param prefix - Optional prefix for class names
   */
  removeStateClasses(element: HTMLElement, prefix?: string): void {
    const classesToRemove = Object.values(GameStateClassService.CLASS_NAMES);
    
    classesToRemove.forEach(className => {
      const fullClassName = prefix ? `${prefix}-${className}` : className;
      element.classList.remove(fullClassName);
    });
  }

  /**
   * Adds transition classes for smooth state changes.
   *
   * @param element - Target DOM element
   * @param duration - Transition duration in milliseconds
   */
  addTransitionClasses(element: HTMLElement, duration: number = 300): void {
    element.classList.add(GameStateClassService.CLASS_NAMES.TRANSITIONING);
    
    setTimeout(() => {
      element.classList.remove(GameStateClassService.CLASS_NAMES.TRANSITIONING);
    }, duration);
  }

  /**
   * Gets all available class names.
   *
   * @returns Object containing all CSS class name constants
   */
  getClassNames() {
    return GameStateClassService.CLASS_NAMES;
  }
}
