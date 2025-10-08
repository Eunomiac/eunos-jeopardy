/**
 * Tests for BuzzerStateService
 *
 * Tests the six-state buzzer system including:
 * - State determination based on game context
 * - State transition validation
 * - State utility functions (CSS classes, display text, etc.)
 * - State priority and interactivity
 */

import { BuzzerStateService, type BuzzerStateContext } from './BuzzerStateService';
import { BuzzerState } from '../../types/BuzzerState';

describe('BuzzerStateService', () => {
  let service: BuzzerStateService;

  beforeEach(() => {
    service = BuzzerStateService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = BuzzerStateService.getInstance();
      const instance2 = BuzzerStateService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('determineState', () => {
    it('should return HIDDEN when game is in lobby', () => {
      const context: BuzzerStateContext = {
        gameStatus: 'lobby',
        hasClue: false,
        isLocked: false,
        hasBuzzed: false,
        isFrozen: false
      };
      expect(service.determineState(context)).toBe(BuzzerState.HIDDEN);
    });

    it('should return INACTIVE when introducing categories', () => {
      const context: BuzzerStateContext = {
        gameStatus: 'introducing_categories',
        hasClue: false,
        isLocked: false,
        hasBuzzed: false,
        isFrozen: false
      };
      expect(service.determineState(context)).toBe(BuzzerState.INACTIVE);
    });

    it('should return FROZEN when player is frozen', () => {
      const context: BuzzerStateContext = {
        gameStatus: 'in_progress',
        hasClue: true,
        isLocked: false,
        hasBuzzed: false,
        isFrozen: true
      };
      expect(service.determineState(context)).toBe(BuzzerState.FROZEN);
    });

    it('should return BUZZED when player has buzzed', () => {
      const context: BuzzerStateContext = {
        gameStatus: 'in_progress',
        hasClue: true,
        isLocked: false,
        hasBuzzed: true,
        isFrozen: false
      };
      expect(service.determineState(context)).toBe(BuzzerState.BUZZED);
    });

    it('should return INACTIVE when no clue is selected', () => {
      const context: BuzzerStateContext = {
        gameStatus: 'in_progress',
        hasClue: false,
        isLocked: false,
        hasBuzzed: false,
        isFrozen: false
      };
      expect(service.determineState(context)).toBe(BuzzerState.INACTIVE);
    });

    it('should return LOCKED when clue is selected but buzzer is locked', () => {
      const context: BuzzerStateContext = {
        gameStatus: 'in_progress',
        hasClue: true,
        isLocked: true,
        hasBuzzed: false,
        isFrozen: false
      };
      expect(service.determineState(context)).toBe(BuzzerState.LOCKED);
    });

    it('should return UNLOCKED when clue is selected and buzzer is unlocked', () => {
      const context: BuzzerStateContext = {
        gameStatus: 'in_progress',
        hasClue: true,
        isLocked: false,
        hasBuzzed: false,
        isFrozen: false
      };
      expect(service.determineState(context)).toBe(BuzzerState.UNLOCKED);
    });

    it('should prioritize frozen state over buzzed state', () => {
      const context: BuzzerStateContext = {
        gameStatus: 'in_progress',
        hasClue: true,
        isLocked: false,
        hasBuzzed: true,
        isFrozen: true
      };
      expect(service.determineState(context)).toBe(BuzzerState.FROZEN);
    });
  });

  describe('validateTransition', () => {
    it('should allow HIDDEN to INACTIVE transition', () => {
      const result = service.validateTransition(BuzzerState.HIDDEN, BuzzerState.INACTIVE);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow INACTIVE to LOCKED transition', () => {
      const result = service.validateTransition(BuzzerState.INACTIVE, BuzzerState.LOCKED);
      expect(result.valid).toBe(true);
    });

    it('should allow LOCKED to UNLOCKED transition', () => {
      const result = service.validateTransition(BuzzerState.LOCKED, BuzzerState.UNLOCKED);
      expect(result.valid).toBe(true);
    });

    it('should allow UNLOCKED to BUZZED transition', () => {
      const result = service.validateTransition(BuzzerState.UNLOCKED, BuzzerState.BUZZED);
      expect(result.valid).toBe(true);
    });

    it('should allow BUZZED to INACTIVE transition', () => {
      const result = service.validateTransition(BuzzerState.BUZZED, BuzzerState.INACTIVE);
      expect(result.valid).toBe(true);
    });

    it('should allow FROZEN to INACTIVE transition', () => {
      const result = service.validateTransition(BuzzerState.FROZEN, BuzzerState.INACTIVE);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid HIDDEN to LOCKED transition', () => {
      const result = service.validateTransition(BuzzerState.HIDDEN, BuzzerState.LOCKED);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid transition from hidden to locked');
    });

    it('should reject invalid UNLOCKED to FROZEN direct transition', () => {
      const result = service.validateTransition(BuzzerState.UNLOCKED, BuzzerState.FROZEN);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid transition');
    });
  });

  describe('getStateClassName', () => {
    it('should return correct CSS class for each state', () => {
      expect(service.getStateClassName(BuzzerState.HIDDEN)).toBe('buzzer-hidden');
      expect(service.getStateClassName(BuzzerState.INACTIVE)).toBe('buzzer-inactive');
      expect(service.getStateClassName(BuzzerState.LOCKED)).toBe('buzzer-locked');
      expect(service.getStateClassName(BuzzerState.UNLOCKED)).toBe('buzzer-unlocked');
      expect(service.getStateClassName(BuzzerState.BUZZED)).toBe('buzzer-buzzed');
      expect(service.getStateClassName(BuzzerState.FROZEN)).toBe('buzzer-frozen');
    });
  });

  describe('getStateDisplayText', () => {
    it('should return correct display text for each state', () => {
      expect(service.getStateDisplayText(BuzzerState.HIDDEN)).toBe('Game Starting...');
      expect(service.getStateDisplayText(BuzzerState.INACTIVE)).toBe('Ready');
      expect(service.getStateDisplayText(BuzzerState.LOCKED)).toBe('Wait...');
      expect(service.getStateDisplayText(BuzzerState.UNLOCKED)).toBe('BUZZ!');
      expect(service.getStateDisplayText(BuzzerState.BUZZED)).toBe('Buzzed!');
      expect(service.getStateDisplayText(BuzzerState.FROZEN)).toBe('Frozen');
    });

    it('should return Unknown for invalid state', () => {
      expect(service.getStateDisplayText('invalid' as BuzzerState)).toBe('Unknown');
    });
  });

  describe('isInteractive', () => {
    it('should return true only for UNLOCKED state', () => {
      expect(service.isInteractive(BuzzerState.UNLOCKED)).toBe(true);
      expect(service.isInteractive(BuzzerState.HIDDEN)).toBe(false);
      expect(service.isInteractive(BuzzerState.INACTIVE)).toBe(false);
      expect(service.isInteractive(BuzzerState.LOCKED)).toBe(false);
      expect(service.isInteractive(BuzzerState.BUZZED)).toBe(false);
      expect(service.isInteractive(BuzzerState.FROZEN)).toBe(false);
    });
  });

  describe('getPostBuzzState', () => {
    it('should return FROZEN for early buzz', () => {
      expect(service.getPostBuzzState(BuzzerState.LOCKED, true)).toBe(BuzzerState.FROZEN);
      expect(service.getPostBuzzState(BuzzerState.UNLOCKED, true)).toBe(BuzzerState.FROZEN);
    });

    it('should return BUZZED for valid buzz from UNLOCKED', () => {
      expect(service.getPostBuzzState(BuzzerState.UNLOCKED, false)).toBe(BuzzerState.BUZZED);
    });

    it('should return current state for invalid buzz attempt', () => {
      expect(service.getPostBuzzState(BuzzerState.INACTIVE, false)).toBe(BuzzerState.INACTIVE);
      expect(service.getPostBuzzState(BuzzerState.LOCKED, false)).toBe(BuzzerState.LOCKED);
    });
  });

  describe('getAllStates', () => {
    it('should return all buzzer states', () => {
      const states = service.getAllStates();
      expect(states).toContain(BuzzerState.HIDDEN);
      expect(states).toContain(BuzzerState.INACTIVE);
      expect(states).toContain(BuzzerState.LOCKED);
      expect(states).toContain(BuzzerState.UNLOCKED);
      expect(states).toContain(BuzzerState.BUZZED);
      expect(states).toContain(BuzzerState.FROZEN);
      expect(states).toHaveLength(6);
    });
  });

  describe('isActiveState', () => {
    it('should return false for HIDDEN and INACTIVE', () => {
      expect(service.isActiveState(BuzzerState.HIDDEN)).toBe(false);
      expect(service.isActiveState(BuzzerState.INACTIVE)).toBe(false);
    });

    it('should return true for active states', () => {
      expect(service.isActiveState(BuzzerState.LOCKED)).toBe(true);
      expect(service.isActiveState(BuzzerState.UNLOCKED)).toBe(true);
      expect(service.isActiveState(BuzzerState.BUZZED)).toBe(true);
      expect(service.isActiveState(BuzzerState.FROZEN)).toBe(true);
    });
  });

  describe('getStatePriority', () => {
    it('should return correct priority for each state', () => {
      expect(service.getStatePriority(BuzzerState.BUZZED)).toBe(5);
      expect(service.getStatePriority(BuzzerState.FROZEN)).toBe(4);
      expect(service.getStatePriority(BuzzerState.UNLOCKED)).toBe(3);
      expect(service.getStatePriority(BuzzerState.LOCKED)).toBe(2);
      expect(service.getStatePriority(BuzzerState.INACTIVE)).toBe(1);
      expect(service.getStatePriority(BuzzerState.HIDDEN)).toBe(0);
    });

    it('should return 0 for invalid state', () => {
      expect(service.getStatePriority('invalid' as BuzzerState)).toBe(0);
    });

    it('should have BUZZED as highest priority', () => {
      const allStates = service.getAllStates();
      const priorities = allStates.map(state => service.getStatePriority(state));
      const maxPriority = Math.max(...priorities);
      expect(service.getStatePriority(BuzzerState.BUZZED)).toBe(maxPriority);
    });
  });
});

