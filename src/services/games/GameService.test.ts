import { GameService } from './GameService'

// Explicitly mock the supabase client
jest.mock('../supabase/client')

import { supabase } from '../supabase/client'

// Enhanced type definitions for Supabase mock objects with schema awareness
type MockSupabaseQueryBuilder = {
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
      expect(result).toEqual(mockPlayers)
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
})
