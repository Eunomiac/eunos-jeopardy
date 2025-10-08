/**
 * Tests for GameStateClassService
 *
 * Tests the CSS class management system including:
 * - Category state classes (focused, empty, partial, complete)
 * - Podium state classes (buzzed, frozen, focused)
 * - Class name generation and validation
 * - State-based class determination
 */

import { GameStateClassService, type CategoryState, type PodiumState } from './GameStateClassService';
import { BuzzerState } from '../../types/BuzzerState';

describe('GameStateClassService', () => {
  let service: GameStateClassService;

  beforeEach(() => {
    service = GameStateClassService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = GameStateClassService.getInstance();
      const instance2 = GameStateClassService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getCategoryClasses', () => {
    it('should return focused class when category is focused', () => {
      const state: CategoryState = {
        index: 0,
        name: 'Category 1',
        isFocused: true,
        isEmpty: false,
        completedCount: 2,
        totalCount: 5
      };

      const classes = service.getCategoryClasses(state);
      expect(classes).toContain('category-focused');
    });

    it('should return empty class when category is empty', () => {
      const state: CategoryState = {
        index: 0,
        name: 'Category 1',
        isFocused: false,
        isEmpty: true,
        completedCount: 5,
        totalCount: 5
      };

      const classes = service.getCategoryClasses(state);
      expect(classes).toContain('category-empty');
    });

    it('should return partial class when category has some completed clues', () => {
      const state: CategoryState = {
        index: 0,
        name: 'Category 1',
        isFocused: false,
        isEmpty: false,
        completedCount: 3,
        totalCount: 5
      };

      const classes = service.getCategoryClasses(state);
      expect(classes).toContain('category-partial');
    });

    it('should return complete class when all clues are completed', () => {
      const state: CategoryState = {
        index: 0,
        name: 'Category 1',
        isFocused: false,
        isEmpty: false,
        completedCount: 5,
        totalCount: 5
      };

      const classes = service.getCategoryClasses(state);
      expect(classes).toContain('category-complete');
    });

    it('should return multiple classes when applicable', () => {
      const state: CategoryState = {
        index: 0,
        name: 'Category 1',
        isFocused: true,
        isEmpty: true,
        completedCount: 5,
        totalCount: 5
      };

      const classes = service.getCategoryClasses(state);
      expect(classes).toContain('category-focused');
      expect(classes).toContain('category-empty');
      expect(classes).toContain('category-complete');
    });

    it('should return empty array when no special states apply', () => {
      const state: CategoryState = {
        index: 0,
        name: 'Category 1',
        isFocused: false,
        isEmpty: false,
        completedCount: 0,
        totalCount: 5
      };

      const classes = service.getCategoryClasses(state);
      expect(classes).toHaveLength(0);
    });
  });

  describe('getPodiumClasses', () => {
    it('should return buzzed class when player has buzzed', () => {
      const state: PodiumState = {
        playerId: 'player-1',
        nickname: 'Player 1',
        buzzerState: BuzzerState.BUZZED,
        isFocused: false,
        hasBuzzed: true,
        isFrozen: false,
        score: 0
      };

      const classes = service.getPodiumClasses(state);
      expect(classes).toContain('podium-buzzed');
    });

    it('should return frozen class when player is frozen', () => {
      const state: PodiumState = {
        playerId: 'player-1',
        nickname: 'Player 1',
        buzzerState: BuzzerState.FROZEN,
        isFocused: false,
        hasBuzzed: false,
        isFrozen: true,
        score: 0
      };

      const classes = service.getPodiumClasses(state);
      expect(classes).toContain('podium-frozen');
    });

    it('should return focused class when player is focused', () => {
      const state: PodiumState = {
        playerId: 'player-1',
        nickname: 'Player 1',
        buzzerState: BuzzerState.INACTIVE,
        isFocused: true,
        hasBuzzed: false,
        isFrozen: false,
        score: 0
      };

      const classes = service.getPodiumClasses(state);
      expect(classes).toContain('podium-focused');
    });

    it('should return multiple classes when applicable', () => {
      const state: PodiumState = {
        playerId: 'player-1',
        nickname: 'Player 1',
        buzzerState: BuzzerState.BUZZED,
        isFocused: true,
        hasBuzzed: true,
        isFrozen: false,
        score: 0
      };

      const classes = service.getPodiumClasses(state);
      expect(classes).toContain('podium-buzzed');
      expect(classes).toContain('podium-focused');
    });

    it('should return only buzzer state class when no special states apply', () => {
      const state: PodiumState = {
        playerId: 'player-1',
        nickname: 'Player 1',
        buzzerState: BuzzerState.INACTIVE,
        isFocused: false,
        hasBuzzed: false,
        isFrozen: false,
        score: 0
      };

      const classes = service.getPodiumClasses(state);
      expect(classes).toContain('podium-inactive');
      expect(classes).toHaveLength(1);
    });
  });

  describe('getClassNames', () => {
    it('should return all class name constants', () => {
      const classNames = service.getClassNames();

      expect(classNames).toHaveProperty('CATEGORY_FOCUSED');
      expect(classNames).toHaveProperty('CATEGORY_EMPTY');
      expect(classNames).toHaveProperty('PODIUM_BUZZED');
      expect(classNames).toHaveProperty('PODIUM_FROZEN');
    });
  });

  describe('podium classes with buzzer states', () => {
    it('should add active class for UNLOCKED buzzer state', () => {
      const state: PodiumState = {
        playerId: 'player-1',
        nickname: 'Player 1',
        buzzerState: BuzzerState.UNLOCKED,
        isFocused: false,
        hasBuzzed: false,
        isFrozen: false,
        score: 0
      };

      const classes = service.getPodiumClasses(state);
      expect(classes).toContain('podium-active');
    });

    it('should add active class for BUZZED buzzer state', () => {
      const state: PodiumState = {
        playerId: 'player-1',
        nickname: 'Player 1',
        buzzerState: BuzzerState.BUZZED,
        isFocused: false,
        hasBuzzed: true,
        isFrozen: false,
        score: 0
      };

      const classes = service.getPodiumClasses(state);
      expect(classes).toContain('podium-active');
      expect(classes).toContain('podium-buzzed');
    });

    it('should add inactive class for HIDDEN buzzer state', () => {
      const state: PodiumState = {
        playerId: 'player-1',
        nickname: 'Player 1',
        buzzerState: BuzzerState.HIDDEN,
        isFocused: false,
        hasBuzzed: false,
        isFrozen: false,
        score: 0
      };

      const classes = service.getPodiumClasses(state);
      expect(classes).toContain('podium-inactive');
    });

    it('should add inactive class for INACTIVE buzzer state', () => {
      const state: PodiumState = {
        playerId: 'player-1',
        nickname: 'Player 1',
        buzzerState: BuzzerState.INACTIVE,
        isFocused: false,
        hasBuzzed: false,
        isFrozen: false,
        score: 0
      };

      const classes = service.getPodiumClasses(state);
      expect(classes).toContain('podium-inactive');
    });

    it('should add frozen class for FROZEN buzzer state', () => {
      const state: PodiumState = {
        playerId: 'player-1',
        nickname: 'Player 1',
        buzzerState: BuzzerState.FROZEN,
        isFocused: false,
        hasBuzzed: false,
        isFrozen: true,
        score: 0
      };

      const classes = service.getPodiumClasses(state);
      expect(classes).toContain('podium-frozen');
    });

    it('should add inactive class for LOCKED buzzer state', () => {
      const state: PodiumState = {
        playerId: 'player-1',
        nickname: 'Player 1',
        buzzerState: BuzzerState.LOCKED,
        isFocused: false,
        hasBuzzed: false,
        isFrozen: false,
        score: 0
      };

      const classes = service.getPodiumClasses(state);
      expect(classes).toContain('podium-inactive');
    });
  });
});

