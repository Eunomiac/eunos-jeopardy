/* eslint-disable @typescript-eslint/no-explicit-any */
// Disabled for test file: We need 'any' to access private methods for testing
// and to create partial mock objects without full type definitions

import { GameService } from './GameService'

// Explicitly mock the supabase client
jest.mock('../supabase/client')
jest.mock('../clues/ClueService')

import { supabase } from '../supabase/client'
import { ClueService } from '../clues/ClueService'
import { createMockQueryBuilder } from '../../test/supabaseMockHelpers'

// Enhanced type definitions for Supabase mock objects with schema awareness
interface MockSupabaseQueryBuilder {
  insert: jest.Mock
  select: jest.Mock
  update: jest.Mock
  delete: jest.Mock
  eq: jest.Mock
  single: jest.Mock
  limit: jest.Mock
  in: jest.Mock // Add missing 'in' method that's used in some tests
}

// Type the mock with proper Supabase client structure
const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('GameService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getActiveGame', () => {
    it('should return active game when one exists', async () => {
      const mockGame = {
        id: 'game-123',
        status: 'in_progress' as const
      }

      mockSupabase.from.mockReturnValue(
        createMockQueryBuilder()
          .select()
          .in()
          .order()
          .limit()
          .withSingleData(mockGame)
      )

      const result = await GameService.getActiveGame()
      expect(result).toEqual(mockGame)
    })

    it('should return null when no active game exists', async () => {
      mockSupabase.from.mockReturnValue(
        createMockQueryBuilder()
          .select()
          .in()
          .order()
          .limit()
          .withSingleData(null)
      )

      const result = await GameService.getActiveGame()
      expect(result).toBeNull()
    })

    it('should throw error when database query fails', async () => {
      mockSupabase.from.mockReturnValue(
        createMockQueryBuilder()
          .select()
          .in()
          .order()
          .limit()
          .withError({ message: 'Database connection failed', details: '', hint: '', code: '500' })
      )

      await expect(GameService.getActiveGame()).rejects.toThrow('Failed to get active game: Database connection failed')
    })
  })

  describe('createGame', () => {
    it('should create a new game successfully', async () => {
      const mockGame = {
        id: 'game-123',
        host_id: 'user-123',
        clue_set_id: 'clue-set-123',
        status: 'lobby' as const,
        current_round: 'jeopardy' as const,
        is_buzzer_locked: true,
        focused_clue_id: null,
        focused_player_id: null,
        created_at: '2025-01-01T00:00:00Z'
      }

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      } as MockSupabaseQueryBuilder)

      const result = await GameService.createGame('user-123', 'clue-set-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('games')
      expect(mockInsert).toHaveBeenCalledWith({
        host_id: 'user-123',
        clue_set_id: 'clue-set-123',
        status: 'lobby',
        current_round: 'jeopardy',
        is_buzzer_locked: true
      })
      expect(result).toEqual(mockGame)
    })

    it('should handle database error', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      } as MockSupabaseQueryBuilder)

      await expect(GameService.createGame('user-123', 'clue-set-123'))
        .rejects.toThrow('Failed to create game: Database error')
    })

    it('should handle missing data', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      } as MockSupabaseQueryBuilder)

      await expect(GameService.createGame('user-123', 'clue-set-123'))
        .rejects.toThrow('No game data returned from database')
    })
  })

  describe('getGame', () => {
    it('should get game successfully for host', async () => {
      const mockGame = {
        id: 'game-123',
        host_id: 'user-123',
        clue_set_id: 'clue-set-123',
        status: 'lobby' as const,
        current_round: 'jeopardy' as const,
        is_buzzer_locked: true,
        focused_clue_id: null,
        focused_player_id: null,
        created_at: '2025-01-01T00:00:00Z'
      }

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      } as MockSupabaseQueryBuilder)

      const result = await GameService.getGame('game-123', 'user-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('games')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(result).toEqual(mockGame)
    })

    it('should reject non-host users', async () => {
      const mockGame = {
        id: 'game-123',
        host_id: 'user-123',
        clue_set_id: 'clue-set-123',
        status: 'lobby' as const,
        current_round: 'jeopardy' as const,
        is_buzzer_locked: true,
        focused_clue_id: null,
        focused_player_id: null,
        created_at: '2025-01-01T00:00:00Z'
      }

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      } as MockSupabaseQueryBuilder)

      await expect(GameService.getGame('game-123', 'user-456'))
        .rejects.toThrow('Only the game host can access this game')
    })

    it('should handle game not found', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' }
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      } as MockSupabaseQueryBuilder)

      await expect(GameService.getGame('game-123', 'user-123'))
        .rejects.toThrow('Failed to fetch game: Not found')
    })
  })

  describe('toggleBuzzerLock', () => {
    it('should toggle buzzer lock successfully', async () => {
      const mockGame = {
        id: 'game-123',
        host_id: 'user-123',
        clue_set_id: 'clue-set-123',
        status: 'lobby' as const,
        current_round: 'jeopardy' as const,
        is_buzzer_locked: true,
        focused_clue_id: null,
        focused_player_id: null,
        current_player_id: null,
        current_introduction_category: 0,
        created_at: '2025-01-01T00:00:00Z'
      }

      const updatedGame = { ...mockGame, is_buzzer_locked: false, current_player_id: null }

      // Mock the GameService methods directly to avoid complex Supabase mocking
      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue(mockGame)
      const updateGameSpy = jest.spyOn(GameService, 'updateGame').mockResolvedValue(updatedGame)

      const result = await GameService.toggleBuzzerLock('game-123', 'user-123')

      expect(getGameSpy).toHaveBeenCalledWith('game-123', 'user-123')
      expect(updateGameSpy).toHaveBeenCalledWith('game-123', { is_buzzer_locked: false }, 'user-123')
      expect(result).toEqual(updatedGame)

      // Clean up spies
      getGameSpy.mockRestore()
      updateGameSpy.mockRestore()
    })
  })

  describe('getAvailableClueSets', () => {
    it('should get clue sets for user', async () => {
      const mockClueSets = [
        {
          id: 'clue-set-1',
          name: 'Test Game 1',
          owner_id: 'user-123',
          created_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'clue-set-2',
          name: 'Test Game 2',
          owner_id: 'user-123',
          created_at: '2025-01-02T00:00:00Z'
        }
      ]

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockClueSets, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      } as MockSupabaseQueryBuilder)

      const result = await GameService.getAvailableClueSets('user-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('clue_sets')
      expect(result).toEqual(mockClueSets)
    })

    it('should handle empty clue sets', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      } as MockSupabaseQueryBuilder)

      const result = await GameService.getAvailableClueSets('user-123')

      expect(result).toEqual([])
    })
  })

  describe('updateGame', () => {
    it('should update game successfully', async () => {
      const mockGame = {
        id: 'game-123',
        host_id: 'user-123',
        clue_set_id: 'clue-set-123',
        status: 'lobby' as const,
        current_round: 'jeopardy' as const,
        is_buzzer_locked: true,
        focused_clue_id: null,
        focused_player_id: null,
        current_player_id: null,
        current_introduction_category: 0,
        created_at: '2025-01-01T00:00:00Z'
      }

      const updatedGame = { ...mockGame, status: 'in_progress' as const, current_player_id: null }

      // Mock getGame call for authorization
      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue(mockGame)

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: updatedGame, error: null })
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate
      } as MockSupabaseQueryBuilder)

      const result = await GameService.updateGame('game-123', { status: 'in_progress' }, 'user-123')

      expect(getGameSpy).toHaveBeenCalledWith('game-123', 'user-123')
      expect(mockSupabase.from).toHaveBeenCalledWith('games')
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'in_progress' })
      expect(result).toEqual(updatedGame)

      getGameSpy.mockRestore()
    })

    it('should handle update error', async () => {
      const mockGame = {
        id: 'game-123',
        host_id: 'user-123',
        clue_set_id: 'clue-set-123',
        status: 'lobby' as const,
        current_round: 'jeopardy' as const,
        is_buzzer_locked: true,
        focused_clue_id: null,
        focused_player_id: null,
        current_player_id: null,
        current_introduction_category: 0,
        created_at: '2025-01-01T00:00:00Z'
      }

      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue(mockGame)

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Update failed' }
            })
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate
      } as MockSupabaseQueryBuilder)

      await expect(GameService.updateGame('game-123', { status: 'in_progress' }, 'user-123'))
        .rejects.toThrow('Failed to update game: Update failed')

      getGameSpy.mockRestore()
    })

    it('should handle missing data in update response', async () => {
      const mockGame = {
        id: 'game-123',
        host_id: 'user-123',
        clue_set_id: 'clue-set-123',
        status: 'lobby' as const,
        current_round: 'jeopardy' as const,
        is_buzzer_locked: true,
        focused_clue_id: null,
        focused_player_id: null,
        current_player_id: null,
        current_introduction_category: 0,
        created_at: '2025-01-01T00:00:00Z'
      }

      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue(mockGame)

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate
      } as MockSupabaseQueryBuilder)

      await expect(GameService.updateGame('game-123', { status: 'in_progress' }, 'user-123'))
        .rejects.toThrow('No game data returned from update')

      getGameSpy.mockRestore()
    })
  })

  describe('getPlayers', () => {
    it('should get players successfully', async () => {
      const mockPlayers = [
        {
          id: 'player-1',
          game_id: 'game-123',
          user_id: 'user-456',
          nickname: 'Player One',
          score: 1000,
          joined_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'player-2',
          game_id: 'game-123',
          user_id: 'user-789',
          nickname: null,
          score: 500,
          joined_at: '2025-01-01T00:01:00Z'
        }
      ]

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockPlayers, error: null })
        })
      })

      // Mock the profiles query chain
      const mockProfilesSelect = jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({ data: [], error: null })
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'players') {
          return { select: mockSelect } as MockSupabaseQueryBuilder
        } else if (table === 'profiles') {
          return { select: mockProfilesSelect } as MockSupabaseQueryBuilder
        }
        return {} as MockSupabaseQueryBuilder
      })

      const result = await GameService.getPlayers('game-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('players')
      expect(mockSelect).toHaveBeenCalledWith('*')
      // Result should include profiles field (null when no profiles found)
      expect(result).toEqual(mockPlayers.map(player => ({ ...player, profiles: null })))
    })

    it('should handle players fetch error', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Fetch failed' }
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      } as MockSupabaseQueryBuilder)

      await expect(GameService.getPlayers('game-123'))
        .rejects.toThrow('Failed to fetch players: Fetch failed')
    })

    it('should handle profiles fetch error gracefully', async () => {
      const mockPlayers = [
        {
          id: 'player-1',
          game_id: 'game-123',
          user_id: 'user-456',
          nickname: 'Player One',
          score: 1000,
          joined_at: '2025-01-01T00:00:00Z'
        }
      ]

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockPlayers, error: null })
        })
      })

      // Mock the profiles query to return error
      const mockProfilesSelect = jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Profiles database error' }
        })
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'players') {
          return { select: mockSelect } as MockSupabaseQueryBuilder
        } else if (table === 'profiles') {
          return { select: mockProfilesSelect } as MockSupabaseQueryBuilder
        }
        return {} as MockSupabaseQueryBuilder
      })

      const result = await GameService.getPlayers('game-123')

      // Should still return players even though profiles failed
      expect(result).toEqual(mockPlayers.map(player => ({ ...player, profiles: null })))
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch player profiles:', { message: 'Profiles database error' })

      consoleSpy.mockRestore()
    })

    it('should return empty array when no players', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      } as MockSupabaseQueryBuilder)

      const result = await GameService.getPlayers('game-123')

      expect(result).toEqual([])
    })
  })

  describe('updatePlayerScore', () => {
    it('should update player score successfully', async () => {
      const mockGame = {
        id: 'game-123',
        host_id: 'user-123',
        clue_set_id: 'clue-set-123',
        status: 'lobby' as const,
        current_round: 'jeopardy' as const,
        is_buzzer_locked: true,
        focused_clue_id: null,
        focused_player_id: null,
        created_at: '2025-01-01T00:00:00Z'
      }

      const mockPlayer = { score: 100 }
      const updatedPlayer = {
        game_id: 'game-123',
        user_id: 'player-123',
        score: 300,
        nickname: null,
        joined_at: '2025-01-01T00:00:00Z'
      }

      // Mock getGame call
      const mockGameSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
        })
      })

      // Mock player fetch
      const mockPlayerSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockPlayer, error: null })
          })
        })
      })

      // Mock player update
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: updatedPlayer, error: null })
            })
          })
        })
      })

      mockSupabase.from
        .mockReturnValueOnce({ select: mockGameSelect } as MockSupabaseQueryBuilder)
        .mockReturnValueOnce({ select: mockPlayerSelect } as MockSupabaseQueryBuilder)
        .mockReturnValueOnce({ update: mockUpdate } as MockSupabaseQueryBuilder)

      const result = await GameService.updatePlayerScore('game-123', 'player-123', 200, 'user-123')

      expect(mockUpdate).toHaveBeenCalledWith({ score: 300 })
      expect(result).toEqual(updatedPlayer)
    })
  })

  describe('addPlayer', () => {
    it('should add player successfully', async () => {
      const mockPlayer = {
        id: 'player-1',
        game_id: 'game-123',
        user_id: 'user-456',
        nickname: 'Player One',
        score: 0,
        joined_at: '2025-01-01T00:00:00Z'
      }

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockPlayer, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      } as MockSupabaseQueryBuilder)

      const result = await GameService.addPlayer('game-123', 'user-456', 'Player One')

      expect(mockSupabase.from).toHaveBeenCalledWith('players')
      expect(mockInsert).toHaveBeenCalledWith({
        game_id: 'game-123',
        user_id: 'user-456',
        nickname: 'Player One',
        score: 0
      })
      expect(result).toEqual(mockPlayer)
    })

    it('should add player without nickname', async () => {
      const mockPlayer = {
        id: 'player-1',
        game_id: 'game-123',
        user_id: 'user-456',
        nickname: null,
        score: 0,
        joined_at: '2025-01-01T00:00:00Z'
      }

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockPlayer, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      } as MockSupabaseQueryBuilder)

      const result = await GameService.addPlayer('game-123', 'user-456')

      expect(mockInsert).toHaveBeenCalledWith({
        game_id: 'game-123',
        user_id: 'user-456',
        nickname: null,
        score: 0
      })
      expect(result).toEqual(mockPlayer)
    })

    it('should handle add player error', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Insert failed' }
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      } as MockSupabaseQueryBuilder)

      await expect(GameService.addPlayer('game-123', 'user-456'))
        .rejects.toThrow('Failed to add player: Insert failed')
    })

    it('should handle missing player data in response', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      } as MockSupabaseQueryBuilder)

      await expect(GameService.addPlayer('game-123', 'user-456'))
        .rejects.toThrow('No player data returned from database')
    })
  })

  describe('getBuzzesForClue', () => {
    it('should get buzzes successfully', async () => {
      const mockBuzzes = [
        {
          id: 'buzz-1',
          game_id: 'game-123',
          clue_id: 'clue-456',
          user_id: 'user-789',
          created_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'buzz-2',
          game_id: 'game-123',
          clue_id: 'clue-456',
          user_id: 'user-101',
          created_at: '2025-01-01T00:00:01Z'
        }
      ]

      // Mock players data for the second query
      const mockPlayers = [
        { user_id: 'user-789', nickname: 'Player1' },
        { user_id: 'user-101', nickname: 'Player2' }
      ]

      // Mock the Supabase query chains - this method makes TWO queries
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'buzzes') {
          // First query: buzzes with profiles
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockBuzzes, error: null })
                })
              })
            })
          } as MockSupabaseQueryBuilder
        } else if (table === 'players') {
          // Second query: player nicknames
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({ data: mockPlayers, error: null })
              })
            })
          } as MockSupabaseQueryBuilder
        }
        return {} as MockSupabaseQueryBuilder
      })

      const result = await GameService.getBuzzesForClue('game-123', 'clue-456')

      expect(mockSupabase.from).toHaveBeenCalledWith('buzzes')
      expect(mockSupabase.from).toHaveBeenCalledWith('players')

      // Expect the enhanced buzzes with player nicknames
      const expectedBuzzes = [
        {
          ...mockBuzzes[0],
          playerNickname: 'Player1'
        },
        {
          ...mockBuzzes[1],
          playerNickname: 'Player2'
        }
      ]
      expect(result).toEqual(expectedBuzzes)
    })

    it('should handle buzzes fetch error', async () => {
      // Mock the global supabase to return an error for this test
      const mockFromWithError = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Fetch failed' }
                })
              })
            })
          })
        })
        .mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })

      mockSupabase.from = mockFromWithError

      await expect(GameService.getBuzzesForClue('game-123', 'clue-456'))
        .rejects.toThrow('Failed to fetch buzzes: Fetch failed')
    })

    it('should return empty array when no buzzes', async () => {
      // Mock to return empty data for buzzes query
      const mockFromWithEmpty = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        })

      mockSupabase.from = mockFromWithEmpty

      const result = await GameService.getBuzzesForClue('game-123', 'clue-456')

      expect(result).toEqual([])
    })
  })

  describe('recordBuzz', () => {
    it('should record buzz successfully', async () => {
      const mockBuzz = {
        id: 'buzz-1',
        game_id: 'game-123',
        clue_id: 'clue-456',
        user_id: 'user-789',
        created_at: '2025-01-01T00:00:00Z'
      }

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockBuzz, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      } as MockSupabaseQueryBuilder)

      const result = await GameService.recordBuzz('game-123', 'clue-456', 'user-789')

      expect(mockSupabase.from).toHaveBeenCalledWith('buzzes')
      expect(mockInsert).toHaveBeenCalledWith({
        game_id: 'game-123',
        clue_id: 'clue-456',
        user_id: 'user-789',
        reaction_time: null
      })
      expect(result).toEqual(mockBuzz)
    })

    it('should handle record buzz error', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Insert failed' }
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      } as MockSupabaseQueryBuilder)

      await expect(GameService.recordBuzz('game-123', 'clue-456', 'user-789'))
        .rejects.toThrow('Failed to record buzz: Insert failed')
    })

    it('should handle missing buzz data in response', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      } as MockSupabaseQueryBuilder)

      await expect(GameService.recordBuzz('game-123', 'clue-456', 'user-789'))
        .rejects.toThrow('No buzz data returned from database')
    })
  })

  describe('clearBuzzesForClue', () => {
    it('should clear buzzes successfully', async () => {
      const mockGame = {
        id: 'game-123',
        host_id: 'user-123',
        clue_set_id: 'clue-set-123',
        status: 'lobby' as const,
        current_round: 'jeopardy' as const,
        is_buzzer_locked: true,
        focused_clue_id: null,
        focused_player_id: null,
        current_player_id: null,
        current_introduction_category: 0,
        created_at: '2025-01-01T00:00:00Z'
      }

      // Mock getGame call for authorization
      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue(mockGame)

      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        delete: mockDelete
      } as MockSupabaseQueryBuilder)

      await GameService.clearBuzzesForClue('game-123', 'clue-456', 'user-123')

      expect(getGameSpy).toHaveBeenCalledWith('game-123', 'user-123')
      expect(mockSupabase.from).toHaveBeenCalledWith('buzzes')
      expect(mockDelete).toHaveBeenCalled()

      getGameSpy.mockRestore()
    })

    it('should handle clear buzzes error', async () => {
      const mockGame = {
        id: 'game-123',
        host_id: 'user-123',
        clue_set_id: 'clue-set-123',
        status: 'lobby' as const,
        current_round: 'jeopardy' as const,
        is_buzzer_locked: true,
        focused_clue_id: null,
        focused_player_id: null,
        current_player_id: null,
        current_introduction_category: 0,
        created_at: '2025-01-01T00:00:00Z'
      }

      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue(mockGame)

      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
        })
      })

      mockSupabase.from.mockReturnValue({
        delete: mockDelete
      } as MockSupabaseQueryBuilder)

      await expect(GameService.clearBuzzesForClue('game-123', 'clue-456', 'user-123'))
        .rejects.toThrow('Failed to clear buzzes: Delete failed')

      getGameSpy.mockRestore()
    })
  })

  describe('transitionToNextRound', () => {
    const mockGame = {
      id: 'game-123',
      host_id: 'user-123',
      clue_set_id: 'clue-set-123',
      status: 'in_progress' as const,
      current_round: 'jeopardy' as const,
      is_buzzer_locked: false,
      focused_clue_id: 'clue-123',
      focused_player_id: 'player-123',
      created_at: '2025-01-01T00:00:00Z'
    }

    it('should transition from jeopardy to double when round is complete', async () => {
      const getGameSpy = jest.spyOn(GameService as any, 'getGame').mockResolvedValue(mockGame)
      const isRoundCompleteSpy = jest.spyOn(ClueService, 'isRoundComplete')
        .mockResolvedValue(true)

      const updatedGame = {
        ...mockGame,
        current_round: 'double' as const,
        status: 'round_transition' as const,
        focused_clue_id: null,
        focused_player_id: null,
        is_buzzer_locked: true
      }

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: updatedGame, error: null })
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate
      } as MockSupabaseQueryBuilder)

      const result = await GameService.transitionToNextRound('game-123', 'user-123')

      expect(result.current_round).toBe('double')
      expect(result.status).toBe('round_transition')
      expect(result.focused_clue_id).toBeNull()
      expect(result.focused_player_id).toBeNull()
      expect(result.is_buzzer_locked).toBe(true)

      getGameSpy.mockRestore()
      isRoundCompleteSpy.mockRestore()
    })

    it('should transition from double to final when round is complete', async () => {
      const doubleGame = { ...mockGame, current_round: 'double' as const }
      const getGameSpy = jest.spyOn(GameService as any, 'getGame').mockResolvedValue(doubleGame)
      const isRoundCompleteSpy = jest.spyOn(ClueService, 'isRoundComplete')
        .mockResolvedValue(true)

      const updatedGame = {
        ...doubleGame,
        current_round: 'final' as const,
        status: 'round_transition' as const,
        focused_clue_id: null,
        focused_player_id: null,
        is_buzzer_locked: true
      }

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: updatedGame, error: null })
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate
      } as MockSupabaseQueryBuilder)

      const result = await GameService.transitionToNextRound('game-123', 'user-123')

      expect(result.current_round).toBe('final')
      expect(result.status).toBe('round_transition')

      getGameSpy.mockRestore()
      isRoundCompleteSpy.mockRestore()
    })

    it('should throw error when trying to transition beyond final round', async () => {
      const finalGame = { ...mockGame, current_round: 'final' as const }
      const getGameSpy = jest.spyOn(GameService as any, 'getGame').mockResolvedValue(finalGame)

      await expect(GameService.transitionToNextRound('game-123', 'user-123'))
        .rejects.toThrow('Cannot advance beyond Final Jeopardy')

      getGameSpy.mockRestore()
    })

    it('should throw error when game is not in progress', async () => {
      const lobbyGame = { ...mockGame, status: 'lobby' as const }
      const getGameSpy = jest.spyOn(GameService as any, 'getGame').mockResolvedValue(lobbyGame)

      await expect(GameService.transitionToNextRound('game-123', 'user-123'))
        .rejects.toThrow('Cannot transition rounds: Game is not in progress (status: lobby)')

      getGameSpy.mockRestore()
    })

    it('should throw error when round is incomplete without force flag', async () => {
      const getGameSpy = jest.spyOn(GameService as any, 'getGame').mockResolvedValue(mockGame)
      const isRoundCompleteSpy = jest.spyOn(ClueService, 'isRoundComplete')
        .mockResolvedValue(false)

      await expect(GameService.transitionToNextRound('game-123', 'user-123', false))
        .rejects.toThrow('Current round is not complete. Use force=true to override.')

      getGameSpy.mockRestore()
      isRoundCompleteSpy.mockRestore()
    })

    it('should allow transition with incomplete round when force=true', async () => {
      const getGameSpy = jest.spyOn(GameService as any, 'getGame').mockResolvedValue(mockGame)
      const isRoundCompleteSpy = jest.spyOn(ClueService, 'isRoundComplete')
        .mockResolvedValue(false)

      const updatedGame = {
        ...mockGame,
        current_round: 'double' as const,
        status: 'round_transition' as const,
        focused_clue_id: null,
        focused_player_id: null,
        is_buzzer_locked: true
      }

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: updatedGame, error: null })
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate
      } as MockSupabaseQueryBuilder)

      const result = await GameService.transitionToNextRound('game-123', 'user-123', true)

      expect(result.current_round).toBe('double')
      // isRoundComplete should not have been called when force=true
      expect(isRoundCompleteSpy).not.toHaveBeenCalled()

      getGameSpy.mockRestore()
      isRoundCompleteSpy.mockRestore()
    })
  })

  describe('endGame', () => {
    it('should end game with completed status when Final Jeopardy is completed', async () => {
      const gameId = 'game-123'
      const hostId = 'host-123'

      // Mock getGame to verify authorization
      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue({
        id: gameId,
        host_id: hostId,
        status: 'in_progress'
      } as any)

      // Mock isFinalJeopardyCompleted to return true
      const isFinalJeopardyCompletedSpy = jest.spyOn(GameService as any, 'isFinalJeopardyCompleted')
        .mockResolvedValue(true)

      // Mock updateGame
      const updateGameSpy = jest.spyOn(GameService, 'updateGame').mockResolvedValue({
        id: gameId,
        status: 'completed'
      } as any)

      await GameService.endGame(gameId, hostId)

      expect(getGameSpy).toHaveBeenCalledWith(gameId, hostId)
      expect(isFinalJeopardyCompletedSpy).toHaveBeenCalledWith(gameId)
      expect(updateGameSpy).toHaveBeenCalledWith(gameId, { status: 'completed' }, hostId)

      getGameSpy.mockRestore()
      isFinalJeopardyCompletedSpy.mockRestore()
      updateGameSpy.mockRestore()
    })

    it('should end game with cancelled status when Final Jeopardy is not completed', async () => {
      const gameId = 'game-123'
      const hostId = 'host-123'

      // Mock getGame to verify authorization
      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue({
        id: gameId,
        host_id: hostId,
        status: 'in_progress'
      } as any)

      // Mock isFinalJeopardyCompleted to return false
      const isFinalJeopardyCompletedSpy = jest.spyOn(GameService as any, 'isFinalJeopardyCompleted')
        .mockResolvedValue(false)

      // Mock updateGame
      const updateGameSpy = jest.spyOn(GameService, 'updateGame').mockResolvedValue({
        id: gameId,
        status: 'cancelled'
      } as any)

      await GameService.endGame(gameId, hostId)

      expect(getGameSpy).toHaveBeenCalledWith(gameId, hostId)
      expect(isFinalJeopardyCompletedSpy).toHaveBeenCalledWith(gameId)
      expect(updateGameSpy).toHaveBeenCalledWith(gameId, { status: 'cancelled' }, hostId)

      getGameSpy.mockRestore()
      isFinalJeopardyCompletedSpy.mockRestore()
      updateGameSpy.mockRestore()
    })
  })

  describe('isFinalJeopardyCompleted', () => {
    it('should return true when Final Jeopardy clue is revealed and completed', async () => {
      const gameId = 'game-123'
      const clueSetId = 'clue-set-123'
      const boardId = 'board-123'
      const clueId = 'clue-123'

      // Mock game query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { clue_set_id: clueSetId },
              error: null
            })
          })
        })
      } as any)

      // Mock board query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: boardId },
                error: null
              })
            })
          })
        })
      } as any)

      // Mock clue query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [{ id: clueId }],
              error: null
            })
          })
        })
      } as any)

      // Mock clue state query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { revealed: true, completed: true },
                error: null
              })
            })
          })
        })
      } as any)

      const result = await (GameService as any).isFinalJeopardyCompleted(gameId)
      expect(result).toBe(true)
    })

    it('should return false when Final Jeopardy clue is not completed', async () => {
      const gameId = 'game-123'
      const clueSetId = 'clue-set-123'
      const boardId = 'board-123'
      const clueId = 'clue-123'

      // Mock game query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { clue_set_id: clueSetId },
              error: null
            })
          })
        })
      } as any)

      // Mock board query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: boardId },
                error: null
              })
            })
          })
        })
      } as any)

      // Mock clue query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [{ id: clueId }],
              error: null
            })
          })
        })
      } as any)

      // Mock clue state query - revealed but not completed
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { revealed: true, completed: false },
                error: null
              })
            })
          })
        })
      } as any)

      const result = await (GameService as any).isFinalJeopardyCompleted(gameId)
      expect(result).toBe(false)
    })

    it('should return false when game clue set query fails', async () => {
      const gameId = 'game-123'
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      // Mock game query with error
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any)

      const result = await (GameService as any).isFinalJeopardyCompleted(gameId)
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Error getting game clue set:', { message: 'Database error' })

      consoleSpy.mockRestore()
    })

    it('should return false when Final Jeopardy board query fails', async () => {
      const gameId = 'game-123'
      const clueSetId = 'clue-set-123'
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      // Mock game query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { clue_set_id: clueSetId },
              error: null
            })
          })
        })
      } as any)

      // Mock board query with error
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Board not found' }
              })
            })
          })
        })
      } as any)

      const result = await (GameService as any).isFinalJeopardyCompleted(gameId)
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Error getting Final Jeopardy board:', { message: 'Board not found' })

      consoleSpy.mockRestore()
    })
  })

  describe('startGame', () => {
    it('should start game successfully when in lobby status', async () => {
      const gameId = 'game-123'
      const hostId = 'host-123'

      // Mock getGame to return game in lobby status
      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue({
        id: gameId,
        host_id: hostId,
        status: 'lobby'
      } as any)

      // Mock updateGame
      const updateGameSpy = jest.spyOn(GameService, 'updateGame').mockResolvedValue({
        id: gameId,
        status: 'in_progress'
      } as any)

      await GameService.startGame(gameId, hostId)

      expect(getGameSpy).toHaveBeenCalledWith(gameId, hostId)
      expect(updateGameSpy).toHaveBeenCalledWith(gameId, { status: 'in_progress' }, hostId)

      getGameSpy.mockRestore()
      updateGameSpy.mockRestore()
    })

    it('should throw error when game is not in lobby status', async () => {
      const gameId = 'game-123'
      const hostId = 'host-123'

      // Mock getGame to return game already in progress
      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue({
        id: gameId,
        host_id: hostId,
        status: 'in_progress'
      } as any)

      await expect(GameService.startGame(gameId, hostId))
        .rejects.toThrow("Cannot start game: current status is 'in_progress', expected 'lobby'")

      expect(getGameSpy).toHaveBeenCalledWith(gameId, hostId)

      getGameSpy.mockRestore()
    })
  })

  describe('setFocusedClue', () => {
    it('should set focused clue successfully', async () => {
      const gameId = 'game-123'
      const clueId = 'clue-456'
      const hostId = 'host-123'
      const mockGame = { id: gameId, host_id: hostId, focused_clue_id: clueId }

      // Mock updateGame (setFocusedClue just calls updateGame)
      const updateGameSpy = jest.spyOn(GameService, 'updateGame').mockResolvedValue(mockGame as any)

      const result = await GameService.setFocusedClue(gameId, clueId, hostId)

      expect(updateGameSpy).toHaveBeenCalledWith(gameId, { focused_clue_id: clueId }, hostId)
      expect(result).toEqual(mockGame)

      updateGameSpy.mockRestore()
    })

    it('should clear focused clue when clueId is null', async () => {
      const gameId = 'game-123'
      const hostId = 'host-123'
      const mockGame = { id: gameId, host_id: hostId, focused_clue_id: null }

      const updateGameSpy = jest.spyOn(GameService, 'updateGame').mockResolvedValue(mockGame as any)

      const result = await GameService.setFocusedClue(gameId, null, hostId)

      expect(updateGameSpy).toHaveBeenCalledWith(gameId, { focused_clue_id: null }, hostId)
      expect(result).toEqual(mockGame)

      updateGameSpy.mockRestore()
    })
  })

  describe('setFocusedPlayer', () => {
    it('should set focused player successfully', async () => {
      const gameId = 'game-123'
      const playerId = 'player-456'
      const hostId = 'host-123'
      const mockGame = { id: gameId, host_id: hostId, focused_player_id: playerId }

      const updateGameSpy = jest.spyOn(GameService, 'updateGame').mockResolvedValue(mockGame as any)

      const result = await GameService.setFocusedPlayer(gameId, playerId, hostId)

      expect(updateGameSpy).toHaveBeenCalledWith(gameId, { focused_player_id: playerId }, hostId)
      expect(result).toEqual(mockGame)

      updateGameSpy.mockRestore()
    })

    it('should clear focused player when playerId is null', async () => {
      const gameId = 'game-123'
      const hostId = 'host-123'
      const mockGame = { id: gameId, host_id: hostId, focused_player_id: null }

      const updateGameSpy = jest.spyOn(GameService, 'updateGame').mockResolvedValue(mockGame as any)

      const result = await GameService.setFocusedPlayer(gameId, null, hostId)

      expect(updateGameSpy).toHaveBeenCalledWith(gameId, { focused_player_id: null }, hostId)
      expect(result).toEqual(mockGame)

      updateGameSpy.mockRestore()
    })
  })

  describe('markPlayerCorrect', () => {
    it('should mark player answer as correct and update game state', async () => {
      const gameId = 'game-123'
      const clueId = 'clue-456'
      const playerId = 'player-789'
      const playerResponse = 'What is the answer?'
      const scoreValue = 200
      const hostId = 'host-123'
      const mockGame = { id: gameId, host_id: hostId }

      // Mock getGame for authorization
      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue(mockGame as any)

      // Mock database operations
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'answers') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null })
          } as any
        }
        if (table === 'buzzes') {
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null })
              })
            })
          } as any
        }
        if (table === 'clue_states') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null })
              })
            })
          } as any
        }
        return {} as any
      })

      // Mock updatePlayerScore
      const updatePlayerScoreSpy = jest.spyOn(GameService, 'updatePlayerScore').mockResolvedValue({} as any)

      // Mock updateGame
      const updateGameSpy = jest.spyOn(GameService, 'updateGame').mockResolvedValue(mockGame as any)

      const result = await GameService.markPlayerCorrect(gameId, clueId, playerId, playerResponse, scoreValue, hostId)

      expect(getGameSpy).toHaveBeenCalledWith(gameId, hostId)
      expect(updatePlayerScoreSpy).toHaveBeenCalledWith(gameId, playerId, scoreValue, hostId)
      expect(updateGameSpy).toHaveBeenCalledWith(gameId, {
        focused_clue_id: null,
        focused_player_id: null,
        current_player_id: playerId,
        is_buzzer_locked: true
      }, hostId)
      expect(result).toEqual(mockGame)

      getGameSpy.mockRestore()
      updatePlayerScoreSpy.mockRestore()
      updateGameSpy.mockRestore()
    })

    it('should handle answer insert error', async () => {
      const gameId = 'game-123'
      const clueId = 'clue-456'
      const playerId = 'player-789'
      const playerResponse = 'What is the answer?'
      const scoreValue = 200
      const hostId = 'host-123'

      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue({ id: gameId } as any)

      // Mock answer insert with error
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: { message: 'Insert failed' } })
      } as any)

      await expect(GameService.markPlayerCorrect(gameId, clueId, playerId, playerResponse, scoreValue, hostId))
        .rejects.toThrow('Failed to record answer: Insert failed')

      getGameSpy.mockRestore()
    })
  })

  describe('markPlayerWrong', () => {
    it('should mark player answer as wrong and lock out player', async () => {
      const gameId = 'game-123'
      const clueId = 'clue-456'
      const playerId = 'player-789'
      const playerResponse = 'Wrong answer'
      const scoreValue = 200
      const hostId = 'host-123'
      const mockGame = { id: gameId, host_id: hostId }

      // Mock getGame for authorization
      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue(mockGame as any)

      // Mock ClueService.isDailyDouble
      const mockClueService = ClueService as jest.Mocked<typeof ClueService>
      mockClueService.isDailyDouble = jest.fn().mockResolvedValue(false)

      // Mock database operations
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'answers') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null })
          } as any
        }
        if (table === 'clues') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { locked_out_player_ids: null },
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          } as any
        }
        if (table === 'clue_states') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { locked_out_player_ids: null },
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null })
              })
            })
          } as any
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          } as any
        }
        if (table === 'buzzes') {
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null })
              })
            })
          } as any
        }
        return {} as any
      })

      // Mock updatePlayerScore
      const updatePlayerScoreSpy = jest.spyOn(GameService, 'updatePlayerScore').mockResolvedValue({} as any)

      // Mock updateGame
      const updateGameSpy = jest.spyOn(GameService, 'updateGame').mockResolvedValue(mockGame as any)

      const result = await GameService.markPlayerWrong(gameId, clueId, playerId, playerResponse, scoreValue, hostId)

      expect(getGameSpy).toHaveBeenCalledWith(gameId, hostId)
      expect(updatePlayerScoreSpy).toHaveBeenCalledWith(gameId, playerId, -scoreValue, hostId)
      expect(result).toEqual(mockGame)

      getGameSpy.mockRestore()
      updatePlayerScoreSpy.mockRestore()
      updateGameSpy.mockRestore()
    })

    it('should handle answer insert error', async () => {
      const gameId = 'game-123'
      const clueId = 'clue-456'
      const playerId = 'player-789'
      const playerResponse = 'Wrong answer'
      const scoreValue = 200
      const hostId = 'host-123'

      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue({ id: gameId } as any)

      // Mock answer insert with error
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: { message: 'Insert failed' } })
      } as any)

      await expect(GameService.markPlayerWrong(gameId, clueId, playerId, playerResponse, scoreValue, hostId))
        .rejects.toThrow('Failed to record answer: Insert failed')

      getGameSpy.mockRestore()
    })
  })

  describe('startGameIntroduction', () => {
    it('should start game introduction from lobby status', async () => {
      const gameId = 'game-123'
      const hostId = 'host-123'
      const mockGame = { id: gameId, host_id: hostId, status: 'lobby' }

      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue(mockGame as any)
      const updateGameSpy = jest.spyOn(GameService, 'updateGame').mockResolvedValue({
        ...mockGame,
        status: 'game_intro'
      } as any)

      const result = await GameService.startGameIntroduction(gameId, hostId)

      expect(getGameSpy).toHaveBeenCalledWith(gameId, hostId)
      expect(updateGameSpy).toHaveBeenCalledWith(gameId, { status: 'game_intro' }, hostId)
      expect(result.status).toBe('game_intro')

      getGameSpy.mockRestore()
      updateGameSpy.mockRestore()
    })

    it('should throw error when game is not in lobby status', async () => {
      const gameId = 'game-123'
      const hostId = 'host-123'

      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue({
        id: gameId,
        status: 'in_progress'
      } as any)

      await expect(GameService.startGameIntroduction(gameId, hostId))
        .rejects.toThrow('Cannot start game introduction: Game is not in lobby status')

      getGameSpy.mockRestore()
    })
  })

  describe('startCategoryIntroductions', () => {
    it('should start category introductions from game_intro status', async () => {
      const gameId = 'game-123'
      const hostId = 'host-123'
      const mockGame = { id: gameId, host_id: hostId, status: 'game_intro' }

      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue(mockGame as any)
      const updateGameSpy = jest.spyOn(GameService, 'updateGame').mockResolvedValue({
        ...mockGame,
        status: 'introducing_categories',
        current_introduction_category: 1
      } as any)

      await GameService.startCategoryIntroductions(gameId, hostId)

      expect(getGameSpy).toHaveBeenCalledWith(gameId, hostId)
      expect(updateGameSpy).toHaveBeenCalledWith(gameId, {
        status: 'introducing_categories',
        current_introduction_category: 1,
        introduction_complete: false
      }, hostId)

      getGameSpy.mockRestore()
      updateGameSpy.mockRestore()
    })

    it('should throw error when game is not in game_intro status', async () => {
      const gameId = 'game-123'
      const hostId = 'host-123'

      const getGameSpy = jest.spyOn(GameService, 'getGame').mockResolvedValue({
        id: gameId,
        status: 'lobby'
      } as any)

      await expect(GameService.startCategoryIntroductions(gameId, hostId))
        .rejects.toThrow('Cannot start category introductions: Game must be in game_intro or round_transition status')

      getGameSpy.mockRestore()
    })
  })
})
