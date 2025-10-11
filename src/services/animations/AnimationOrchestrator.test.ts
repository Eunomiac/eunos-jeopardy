/**
 * Tests for AnimationOrchestrator
 *
 * Tests the animation orchestration logic including:
 * - Game state change detection
 * - Animation intent publishing
 * - Round transitions
 * - Board and category introductions
 * - Daily Double detection
 */

import { AnimationOrchestrator } from './AnimationOrchestrator';
import { AnimationEvents } from './AnimationEvents';
import { ClueService } from '../clues/ClueService';
import type { Game } from '../games/GameService';

// Mock dependencies
jest.mock('./AnimationEvents');
jest.mock('../clues/ClueService');

describe('AnimationOrchestrator', () => {
  let orchestrator: AnimationOrchestrator;
  let mockPublish: jest.SpyInstance;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    orchestrator = AnimationOrchestrator.getInstance();
    // Clear any persisted state from previous tests
    orchestrator.lastStateByGame.clear();
    mockPublish = jest.spyOn(AnimationEvents, 'publish').mockImplementation();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AnimationOrchestrator.getInstance();
      const instance2 = AnimationOrchestrator.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('ingestGameUpdate - Round Transitions', () => {
    it('should publish RoundTransition when round changes during round_transition status', () => {
      const gameId = 'game-123';

      // First update - establish initial state
      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'in_progress',
        current_round: 'jeopardy'
      } as Partial<Game> & { id: string });

      // Second update - round transition
      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'round_transition',
        current_round: 'double'
      } as Partial<Game> & { id: string });

      expect(mockPublish).toHaveBeenCalledWith({
        type: 'RoundTransition',
        gameId,
        fromRound: 'jeopardy',
        toRound: 'double'
      });
    });

    it('should NOT publish RoundTransition when round changes but status is not round_transition', () => {
      const gameId = 'game-123';

      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'in_progress',
        current_round: 'jeopardy'
      } as Partial<Game> & { id: string });

      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'in_progress',
        current_round: 'double'
      } as Partial<Game> & { id: string });

      expect(mockPublish).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'RoundTransition' })
      );
    });

    it('should NOT publish RoundTransition on first update', () => {
      orchestrator.ingestGameUpdate({
        id: 'game-123',
        status: 'round_transition',
        current_round: 'jeopardy'
      } as Partial<Game> & { id: string });

      expect(mockPublish).not.toHaveBeenCalled();
    });
  });

  describe('ingestGameUpdate - Board Intro', () => {
    it('should publish BoardIntro when entering game_intro status', () => {
      const gameId = 'game-123';

      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'lobby',
        current_round: 'jeopardy'
      } as Partial<Game> & { id: string });

      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'game_intro',
        current_round: 'jeopardy'
      } as Partial<Game> & { id: string });

      expect(mockPublish).toHaveBeenCalledWith({
        type: 'BoardIntro',
        gameId,
        round: 'jeopardy'
      });
    });

    it('should NOT publish BoardIntro when already in game_intro', () => {
      const gameId = 'game-123';

      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'game_intro',
        current_round: 'jeopardy'
      } as Partial<Game> & { id: string });

      mockPublish.mockClear();

      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'game_intro',
        current_round: 'jeopardy'
      } as Partial<Game> & { id: string });

      expect(mockPublish).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'BoardIntro' })
      );
    });
  });

  describe('ingestGameUpdate - Category Intro', () => {
    it('should publish CategoryIntro when category number changes during introducing_categories', () => {
      const gameId = 'game-123';

      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'introducing_categories',
        current_introduction_category: 0
      } as Partial<Game> & { id: string; current_introduction_category: number });

      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'introducing_categories',
        current_introduction_category: 1
      } as Partial<Game> & { id: string; current_introduction_category: number });

      expect(mockPublish).toHaveBeenCalledWith({
        type: 'CategoryIntro',
        gameId,
        categoryNumber: 1
      });
    });

    it('should publish CategoryIntro for each category change', () => {
      const gameId = 'game-123';

      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'introducing_categories',
        current_introduction_category: 1
      } as Partial<Game> & { id: string; current_introduction_category: number });

      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'introducing_categories',
        current_introduction_category: 2
      } as Partial<Game> & { id: string; current_introduction_category: number });

      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'introducing_categories',
        current_introduction_category: 3
      } as Partial<Game> & { id: string; current_introduction_category: number });

      expect(mockPublish).toHaveBeenCalledWith({
        type: 'CategoryIntro',
        gameId,
        categoryNumber: 2
      });
      expect(mockPublish).toHaveBeenCalledWith({
        type: 'CategoryIntro',
        gameId,
        categoryNumber: 3
      });
    });

    it('should NOT publish CategoryIntro when category is 0', () => {
      const gameId = 'game-123';

      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'introducing_categories',
        current_introduction_category: 0
      } as Partial<Game> & { id: string; current_introduction_category: number });

      expect(mockPublish).not.toHaveBeenCalled();
    });

    it('should NOT publish CategoryIntro when status is not introducing_categories', () => {
      const gameId = 'game-123';

      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'in_progress',
        current_introduction_category: 1
      } as Partial<Game> & { id: string; current_introduction_category: number });

      expect(mockPublish).not.toHaveBeenCalled();
    });
  });

  describe('ingestGameUpdate - Daily Double', () => {
    it('should publish DailyDoubleReveal when focused_player_id is set for daily double clue', async () => {
      const gameId = 'game-123';
      const clueId = 'clue-456';

      (ClueService.isDailyDouble as jest.Mock).mockResolvedValue(true);

      orchestrator.ingestGameUpdate({
        id: gameId,
        focused_clue_id: clueId,
        focused_player_id: null
      } as Partial<Game> & { id: string });

      orchestrator.ingestGameUpdate({
        id: gameId,
        focused_clue_id: clueId,
        focused_player_id: 'player-789'
      } as Partial<Game> & { id: string });

      // Wait for async isDailyDouble check
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(ClueService.isDailyDouble).toHaveBeenCalledWith(clueId);
      expect(mockPublish).toHaveBeenCalledWith({
        type: 'DailyDoubleReveal',
        gameId,
        clueId
      });
    });

    it('should NOT publish DailyDoubleReveal for regular clue', async () => {
      const gameId = 'game-123';
      const clueId = 'clue-456';

      (ClueService.isDailyDouble as jest.Mock).mockResolvedValue(false);

      orchestrator.ingestGameUpdate({
        id: gameId,
        focused_clue_id: clueId,
        focused_player_id: null
      } as Partial<Game> & { id: string });

      orchestrator.ingestGameUpdate({
        id: gameId,
        focused_clue_id: clueId,
        focused_player_id: 'player-789'
      } as Partial<Game> & { id: string });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockPublish).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DailyDoubleReveal' })
      );
    });

    it('should handle isDailyDouble error gracefully', async () => {
      const gameId = 'game-123';
      const clueId = 'clue-456';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (ClueService.isDailyDouble as jest.Mock).mockRejectedValue(new Error('Database error'));

      orchestrator.ingestGameUpdate({
        id: gameId,
        focused_clue_id: clueId,
        focused_player_id: 'player-789'
      } as Partial<Game> & { id: string });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error checking daily double status'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clear', () => {
    it('should clear game state', () => {
      const gameId = 'game-123';

      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'in_progress',
        current_round: 'jeopardy'
      } as Partial<Game> & { id: string });

      orchestrator.clear(gameId);

      // After clearing, next update should not trigger round transition
      orchestrator.ingestGameUpdate({
        id: gameId,
        status: 'round_transition',
        current_round: 'double'
      } as Partial<Game> & { id: string });

      expect(mockPublish).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'RoundTransition' })
      );
    });
  });
});
