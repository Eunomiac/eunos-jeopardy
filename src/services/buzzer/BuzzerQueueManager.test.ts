/**
 * Tests for BuzzerQueueManager.
 *
 * @since 0.2.0
 * @author Euno's Jeopardy Team
 */

import { BuzzerQueueManager } from './BuzzerQueueManager';

describe('BuzzerQueueManager', () => {
  let queueManager: BuzzerQueueManager;

  beforeEach(() => {
    queueManager = new BuzzerQueueManager();
  });

  describe('addBuzz', () => {
    it('should add a buzz to the queue', () => {
      const isNewFastest = queueManager.addBuzz('player-1', 'Alice', 450);
      
      expect(isNewFastest).toBe(true);
      expect(queueManager.getQueueSize()).toBe(1);
      expect(queueManager.getFastestPlayer()).toBe('player-1');
    });

    it('should maintain sorted order by reaction time', () => {
      queueManager.addBuzz('player-1', 'Alice', 450);
      queueManager.addBuzz('player-2', 'Bob', 380);
      queueManager.addBuzz('player-3', 'Charlie', 520);

      const queue = queueManager.getQueue();
      expect(queue[0].playerId).toBe('player-2'); // Bob - 380ms
      expect(queue[1].playerId).toBe('player-1'); // Alice - 450ms
      expect(queue[2].playerId).toBe('player-3'); // Charlie - 520ms
    });

    it('should return true when adding new fastest buzz', () => {
      queueManager.addBuzz('player-1', 'Alice', 450);
      const isNewFastest = queueManager.addBuzz('player-2', 'Bob', 380);
      
      expect(isNewFastest).toBe(true);
      expect(queueManager.getFastestPlayer()).toBe('player-2');
    });

    it('should return false when adding slower buzz', () => {
      queueManager.addBuzz('player-1', 'Alice', 380);
      const isNewFastest = queueManager.addBuzz('player-2', 'Bob', 450);
      
      expect(isNewFastest).toBe(false);
      expect(queueManager.getFastestPlayer()).toBe('player-1');
    });

    it('should ignore duplicate buzzes from same player', () => {
      queueManager.addBuzz('player-1', 'Alice', 450);
      const isDuplicate = queueManager.addBuzz('player-1', 'Alice', 380);
      
      expect(isDuplicate).toBe(false);
      expect(queueManager.getQueueSize()).toBe(1);
      expect(queueManager.getFastestReactionTime()).toBe(450); // Original time
    });
  });

  describe('getFastestPlayer', () => {
    it('should return null when queue is empty', () => {
      expect(queueManager.getFastestPlayer()).toBeNull();
    });

    it('should return fastest player ID', () => {
      queueManager.addBuzz('player-1', 'Alice', 450);
      queueManager.addBuzz('player-2', 'Bob', 380);
      
      expect(queueManager.getFastestPlayer()).toBe('player-2');
    });
  });

  describe('getFastestPlayerNickname', () => {
    it('should return null when queue is empty', () => {
      expect(queueManager.getFastestPlayerNickname()).toBeNull();
    });

    it('should return fastest player nickname', () => {
      queueManager.addBuzz('player-1', 'Alice', 450);
      queueManager.addBuzz('player-2', 'Bob', 380);
      
      expect(queueManager.getFastestPlayerNickname()).toBe('Bob');
    });
  });

  describe('getFastestReactionTime', () => {
    it('should return null when queue is empty', () => {
      expect(queueManager.getFastestReactionTime()).toBeNull();
    });

    it('should return fastest reaction time', () => {
      queueManager.addBuzz('player-1', 'Alice', 450);
      queueManager.addBuzz('player-2', 'Bob', 380);
      
      expect(queueManager.getFastestReactionTime()).toBe(380);
    });
  });

  describe('hasBuzz', () => {
    it('should return false when player has not buzzed', () => {
      expect(queueManager.hasBuzz('player-1')).toBe(false);
    });

    it('should return true when player has buzzed', () => {
      queueManager.addBuzz('player-1', 'Alice', 450);
      
      expect(queueManager.hasBuzz('player-1')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all buzzes', () => {
      queueManager.addBuzz('player-1', 'Alice', 450);
      queueManager.addBuzz('player-2', 'Bob', 380);
      
      queueManager.clear();
      
      expect(queueManager.isEmpty()).toBe(true);
      expect(queueManager.getQueueSize()).toBe(0);
      expect(queueManager.getFastestPlayer()).toBeNull();
    });

    it('should allow adding buzzes after clear', () => {
      queueManager.addBuzz('player-1', 'Alice', 450);
      queueManager.clear();
      queueManager.addBuzz('player-1', 'Alice', 380);
      
      expect(queueManager.getQueueSize()).toBe(1);
      expect(queueManager.getFastestReactionTime()).toBe(380);
    });
  });

  describe('getStats', () => {
    it('should return null stats when queue is empty', () => {
      const stats = queueManager.getStats();
      
      expect(stats.totalBuzzes).toBe(0);
      expect(stats.fastestTime).toBeNull();
      expect(stats.slowestTime).toBeNull();
      expect(stats.averageTime).toBeNull();
    });

    it('should calculate correct statistics', () => {
      queueManager.addBuzz('player-1', 'Alice', 450);
      queueManager.addBuzz('player-2', 'Bob', 380);
      queueManager.addBuzz('player-3', 'Charlie', 520);
      
      const stats = queueManager.getStats();
      
      expect(stats.totalBuzzes).toBe(3);
      expect(stats.fastestTime).toBe(380);
      expect(stats.slowestTime).toBe(520);
      expect(stats.averageTime).toBe(450); // (450 + 380 + 520) / 3
    });
  });

  describe('late buzz correction', () => {
    it('should handle late faster buzz correctly', () => {
      // First buzz arrives
      const firstIsNewFastest = queueManager.addBuzz('player-1', 'Alice', 450);
      expect(firstIsNewFastest).toBe(true);
      expect(queueManager.getFastestPlayer()).toBe('player-1');

      // Later, faster buzz arrives (late correction)
      const secondIsNewFastest = queueManager.addBuzz('player-2', 'Bob', 380);
      expect(secondIsNewFastest).toBe(true);
      expect(queueManager.getFastestPlayer()).toBe('player-2');

      // Queue should be correctly ordered
      const queue = queueManager.getQueue();
      expect(queue[0].playerId).toBe('player-2');
      expect(queue[1].playerId).toBe('player-1');
    });
  });
});

