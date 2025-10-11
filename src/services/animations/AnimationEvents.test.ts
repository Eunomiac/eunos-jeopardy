/**
 * Tests for AnimationEvents
 *
 * Tests the animation event pub/sub system including:
 * - Subscriber management
 * - Event publishing and notification
 * - Recent intent caching
 * - Error handling in subscribers
 */

import { AnimationEvents, type AnimationIntent } from './AnimationEvents';

describe('AnimationEvents', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Clear all subscribers before each test
    AnimationEvents.subscribers.clear();
    AnimationEvents.recentIntents.clear();

    // Suppress console logs in tests
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('subscribe', () => {
    it('should add subscriber and return unsubscribe function', () => {
      const mockCallback = jest.fn();

      const unsubscribe = AnimationEvents.subscribe(mockCallback);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Subscriber added (total: 1)')
      );

      // Unsubscribe
      unsubscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Subscriber removed (total: 0)')
      );
    });

    it('should support multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      AnimationEvents.subscribe(callback1);
      AnimationEvents.subscribe(callback2);
      AnimationEvents.subscribe(callback3);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Subscriber added (total: 3)')
      );
    });

    it('should allow unsubscribing specific subscriber', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const unsubscribe1 = AnimationEvents.subscribe(callback1);
      AnimationEvents.subscribe(callback2);

      // Unsubscribe only callback1
      unsubscribe1();

      const intent: AnimationIntent = {
        type: 'BoardIntro',
        gameId: 'game-123',
        round: 'jeopardy'
      };

      AnimationEvents.publish(intent);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith(intent);
    });
  });

  describe('publish', () => {
    it('should notify all subscribers with intent', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      AnimationEvents.subscribe(callback1);
      AnimationEvents.subscribe(callback2);

      const intent: AnimationIntent = {
        type: 'ClueReveal',
        gameId: 'game-123',
        clueId: 'clue-456'
      };

      AnimationEvents.publish(intent);

      expect(callback1).toHaveBeenCalledWith(intent);
      expect(callback2).toHaveBeenCalledWith(intent);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Publishing intent:'),
        intent
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Notifying 2 subscriber(s)')
      );
    });

    it('should cache intent for recent lookup', () => {
      const intent: AnimationIntent = {
        type: 'DailyDoubleReveal',
        gameId: 'game-123',
        clueId: 'clue-789'
      };

      AnimationEvents.publish(intent);

      const wasRecent = AnimationEvents.wasRecentlyPublished('DailyDoubleReveal', 'game-123');
      expect(wasRecent).toBe(true);
    });

    it('should handle subscriber errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Subscriber error');
      });
      const normalCallback = jest.fn();

      AnimationEvents.subscribe(errorCallback);
      AnimationEvents.subscribe(normalCallback);

      const intent: AnimationIntent = {
        type: 'CategoryIntro',
        gameId: 'game-123',
        categoryNumber: 1
      };

      // Should not throw
      expect(() => AnimationEvents.publish(intent)).not.toThrow();

      // Both callbacks should have been called
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Subscriber error:'),
        expect.any(Error)
      );
    });

    it('should publish different intent types', () => {
      const callback = jest.fn();
      AnimationEvents.subscribe(callback);

      const intents: AnimationIntent[] = [
        { type: 'BoardIntro', gameId: 'game-1', round: 'jeopardy' },
        { type: 'CategoryIntro', gameId: 'game-1', categoryNumber: 2 },
        { type: 'ClueReveal', gameId: 'game-1', clueId: 'clue-1' },
        { type: 'DailyDoubleReveal', gameId: 'game-1', clueId: 'clue-2' },
        { type: 'DailyDoubleClueReveal', gameId: 'game-1', clueId: 'clue-2' },
        { type: 'RoundTransition', gameId: 'game-1', fromRound: 'jeopardy', toRound: 'double' }
      ];

      intents.forEach(intent => {
        AnimationEvents.publish(intent);
      });

      expect(callback).toHaveBeenCalledTimes(6);
      intents.forEach(intent => {
        expect(callback).toHaveBeenCalledWith(intent);
      });
    });
  });

  describe('wasRecentlyPublished', () => {
    it('should return false for unpublished intent', () => {
      const wasRecent = AnimationEvents.wasRecentlyPublished('BoardIntro', 'game-123');
      expect(wasRecent).toBe(false);
    });

    it('should return true for recently published intent', () => {
      const intent: AnimationIntent = {
        type: 'ClueReveal',
        gameId: 'game-123',
        clueId: 'clue-456'
      };

      AnimationEvents.publish(intent);

      const wasRecent = AnimationEvents.wasRecentlyPublished('ClueReveal', 'game-123');
      expect(wasRecent).toBe(true);
    });

    it('should return false for expired intent', () => {
      jest.useFakeTimers();

      const intent: AnimationIntent = {
        type: 'CategoryIntro',
        gameId: 'game-123',
        categoryNumber: 1
      };

      AnimationEvents.publish(intent);

      // Fast-forward past cache duration (2000ms)
      jest.advanceTimersByTime(2001);

      const wasRecent = AnimationEvents.wasRecentlyPublished('CategoryIntro', 'game-123');
      expect(wasRecent).toBe(false);

      jest.useRealTimers();
    });

    it('should distinguish between different intent types', () => {
      const intent1: AnimationIntent = {
        type: 'BoardIntro',
        gameId: 'game-123',
        round: 'jeopardy'
      };
      const intent2: AnimationIntent = {
        type: 'ClueReveal',
        gameId: 'game-123',
        clueId: 'clue-1'
      };

      AnimationEvents.publish(intent1);
      AnimationEvents.publish(intent2);

      expect(AnimationEvents.wasRecentlyPublished('BoardIntro', 'game-123')).toBe(true);
      expect(AnimationEvents.wasRecentlyPublished('ClueReveal', 'game-123')).toBe(true);
      expect(AnimationEvents.wasRecentlyPublished('CategoryIntro', 'game-123')).toBe(false);
    });

    it('should distinguish between different game IDs', () => {
      const intent: AnimationIntent = {
        type: 'BoardIntro',
        gameId: 'game-123',
        round: 'jeopardy'
      };

      AnimationEvents.publish(intent);

      expect(AnimationEvents.wasRecentlyPublished('BoardIntro', 'game-123')).toBe(true);
      expect(AnimationEvents.wasRecentlyPublished('BoardIntro', 'game-456')).toBe(false);
    });

    it('should clean up expired intents on check', () => {
      jest.useFakeTimers();

      const intent: AnimationIntent = {
        type: 'RoundTransition',
        gameId: 'game-123',
        fromRound: 'jeopardy',
        toRound: 'double'
      };

      AnimationEvents.publish(intent);

      // Verify it's cached
      expect(AnimationEvents.recentIntents.size).toBe(1);

      // Fast-forward past cache duration
      jest.advanceTimersByTime(2001);

      // Check should clean up expired intent
      AnimationEvents.wasRecentlyPublished('RoundTransition', 'game-123');

      expect(AnimationEvents.recentIntents.size).toBe(0);

      jest.useRealTimers();
    });
  });

  describe('integration', () => {
    it('should support full pub/sub workflow', () => {
      const results: AnimationIntent[] = [];
      const callback = (intent: AnimationIntent) => {
        results.push(intent);
      };

      const unsubscribe = AnimationEvents.subscribe(callback);

      // Publish multiple intents
      const intent1: AnimationIntent = {
        type: 'BoardIntro',
        gameId: 'game-1',
        round: 'jeopardy'
      };
      const intent2: AnimationIntent = {
        type: 'ClueReveal',
        gameId: 'game-1',
        clueId: 'clue-1'
      };

      AnimationEvents.publish(intent1);
      AnimationEvents.publish(intent2);

      expect(results).toEqual([intent1, intent2]);

      // Unsubscribe
      unsubscribe();

      // Publish after unsubscribe
      const intent3: AnimationIntent = {
        type: 'CategoryIntro',
        gameId: 'game-1',
        categoryNumber: 1
      };
      AnimationEvents.publish(intent3);

      // Should not receive intent3
      expect(results).toEqual([intent1, intent2]);
    });
  });
});
