/**
 * Tests for BroadcastService.
 *
 * @since 0.2.0
 * @author Euno's Jeopardy Team
 */

import { BroadcastService } from './BroadcastService';
import { BROADCAST_EVENTS } from '../../types/BroadcastEvents';

// Mock Supabase client
jest.mock('../../services/supabase/client', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      }),
      unsubscribe: jest.fn(),
      send: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

describe('BroadcastService', () => {
  const gameId = 'test-game-id';
  const clueId = 'test-clue-id';
  const playerId = 'test-player-id';
  const playerNickname = 'TestPlayer';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createGameBuzzerChannel', () => {
    it('should create a channel with correct configuration', () => {
      const { supabase } = require('../../services/supabase/client');
      
      BroadcastService.createGameBuzzerChannel(gameId);
      
      expect(supabase.channel).toHaveBeenCalledWith(
        `game-buzzer:${gameId}`,
        {
          config: {
            broadcast: {
              self: true,
              ack: false,
            },
          },
        }
      );
    });

    it('should remove existing channel before creating new one', () => {
      const { supabase } = require('../../services/supabase/client');
      const mockUnsubscribe = jest.fn();
      
      supabase.channel.mockReturnValueOnce({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: mockUnsubscribe,
        send: jest.fn(),
      });

      // Create first channel
      BroadcastService.createGameBuzzerChannel(gameId);
      
      // Create second channel (should unsubscribe first)
      BroadcastService.createGameBuzzerChannel(gameId);
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('subscribeToGameBuzzer', () => {
    it('should set up event handlers and subscribe', () => {
      const handlers = {
        onBuzzerUnlock: jest.fn(),
        onBuzzerLock: jest.fn(),
        onPlayerBuzz: jest.fn(),
        onFocusPlayer: jest.fn(),
      };

      const subscription = BroadcastService.subscribeToGameBuzzer(gameId, handlers);
      
      expect(subscription).toBeDefined();
      expect(subscription.channelId).toBe(`game-buzzer:${gameId}`);
      expect(typeof subscription.unsubscribe).toBe('function');
    });

    it('should handle partial handlers', () => {
      const handlers = {
        onPlayerBuzz: jest.fn(),
      };

      const subscription = BroadcastService.subscribeToGameBuzzer(gameId, handlers);
      
      expect(subscription).toBeDefined();
    });
  });

  describe('broadcastBuzzerUnlock', () => {
    it('should broadcast unlock event with correct payload', async () => {
      const { supabase } = require('../../services/supabase/client');
      const mockSend = jest.fn().mockResolvedValue(undefined);
      
      supabase.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        send: mockSend,
      });

      BroadcastService.createGameBuzzerChannel(gameId);
      await BroadcastService.broadcastBuzzerUnlock(gameId, clueId);
      
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: BROADCAST_EVENTS.BUZZER_UNLOCK,
        payload: expect.objectContaining({
          gameId,
          clueId,
          timestamp: expect.any(Number),
        }),
      });
    });
  });

  describe('broadcastBuzzerLock', () => {
    it('should broadcast lock event with correct payload', async () => {
      const { supabase } = require('../../services/supabase/client');
      const mockSend = jest.fn().mockResolvedValue(undefined);
      
      supabase.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        send: mockSend,
      });

      BroadcastService.createGameBuzzerChannel(gameId);
      await BroadcastService.broadcastBuzzerLock(gameId);
      
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: BROADCAST_EVENTS.BUZZER_LOCK,
        payload: expect.objectContaining({
          gameId,
          timestamp: expect.any(Number),
        }),
      });
    });
  });

  describe('broadcastPlayerBuzz', () => {
    it('should broadcast player buzz with correct payload', async () => {
      const { supabase } = require('../../services/supabase/client');
      const mockSend = jest.fn().mockResolvedValue(undefined);
      
      supabase.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        send: mockSend,
      });

      BroadcastService.createGameBuzzerChannel(gameId);
      await BroadcastService.broadcastPlayerBuzz(gameId, clueId, playerId, playerNickname, 450);
      
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: BROADCAST_EVENTS.PLAYER_BUZZ,
        payload: expect.objectContaining({
          gameId,
          clueId,
          playerId,
          playerNickname,
          reactionTimeMs: 450,
          clientTimestamp: expect.any(Number),
        }),
      });
    });
  });

  describe('broadcastFocusPlayer', () => {
    it('should broadcast focus player with correct payload', async () => {
      const { supabase } = require('../../services/supabase/client');
      const mockSend = jest.fn().mockResolvedValue(undefined);
      
      supabase.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        send: mockSend,
      });

      BroadcastService.createGameBuzzerChannel(gameId);
      await BroadcastService.broadcastFocusPlayer(gameId, playerId, playerNickname, 'auto');
      
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: BROADCAST_EVENTS.FOCUS_PLAYER,
        payload: expect.objectContaining({
          gameId,
          playerId,
          playerNickname,
          source: 'auto',
        }),
      });
    });

    it('should default source to auto', async () => {
      const { supabase } = require('../../services/supabase/client');
      const mockSend = jest.fn().mockResolvedValue(undefined);
      
      supabase.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        send: mockSend,
      });

      BroadcastService.createGameBuzzerChannel(gameId);
      await BroadcastService.broadcastFocusPlayer(gameId, playerId, playerNickname);
      
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: BROADCAST_EVENTS.FOCUS_PLAYER,
        payload: expect.objectContaining({
          source: 'auto',
        }),
      });
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from all active channels', () => {
      const { supabase } = require('../../services/supabase/client');
      const mockUnsubscribe = jest.fn();
      
      supabase.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: mockUnsubscribe,
        send: jest.fn(),
      });

      BroadcastService.createGameBuzzerChannel('game-1');
      BroadcastService.createGameBuzzerChannel('game-2');
      
      BroadcastService.cleanup();
      
      expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    });
  });
});

