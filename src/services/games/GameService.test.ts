import { GameService } from './GameService'
import { supabase } from '../supabase/client'

// Mock Supabase client
jest.mock('../supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn()
        }))
      }))
    }))
  }
}))

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
        question_set_id: 'clue-set-123',
        status: 'lobby' as const,
        current_round: 'jeopardy' as const,
        is_buzzer_locked: true,
        created_at: '2025-01-01T00:00:00Z'
      }

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      } as any)

      const result = await GameService.createGame('user-123', 'clue-set-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('games')
      expect(mockInsert).toHaveBeenCalledWith({
        host_id: 'user-123',
        question_set_id: 'clue-set-123',
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
      } as any)

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
      } as any)

      await expect(GameService.createGame('user-123', 'clue-set-123'))
        .rejects.toThrow('No game data returned from database')
    })
  })

  describe('getGame', () => {
    it('should get game successfully for host', async () => {
      const mockGame = {
        id: 'game-123',
        host_id: 'user-123',
        question_set_id: 'clue-set-123',
        status: 'lobby' as const,
        current_round: 'jeopardy' as const,
        is_buzzer_locked: true,
        created_at: '2025-01-01T00:00:00Z'
      }

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await GameService.getGame('game-123', 'user-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('games')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(result).toEqual(mockGame)
    })

    it('should reject non-host users', async () => {
      const mockGame = {
        id: 'game-123',
        host_id: 'user-123',
        question_set_id: 'clue-set-123',
        status: 'lobby' as const,
        current_round: 'jeopardy' as const,
        is_buzzer_locked: true,
        created_at: '2025-01-01T00:00:00Z'
      }

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      } as any)

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
      } as any)

      await expect(GameService.getGame('game-123', 'user-123'))
        .rejects.toThrow('Failed to fetch game: Not found')
    })
  })

  describe('toggleBuzzerLock', () => {
    it('should toggle buzzer lock successfully', async () => {
      const mockGame = {
        id: 'game-123',
        host_id: 'user-123',
        question_set_id: 'clue-set-123',
        status: 'lobby' as const,
        current_round: 'jeopardy' as const,
        is_buzzer_locked: true,
        created_at: '2025-01-01T00:00:00Z'
      }

      const updatedGame = { ...mockGame, is_buzzer_locked: false }

      // Mock getGame call (first call to from)
      const mockGameSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
        })
      })

      // Mock update call (second call to from)
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: updatedGame, error: null })
          })
        })
      })

      // Setup the mock chain for both calls
      mockSupabase.from
        .mockReturnValueOnce({ select: mockGameSelect } as any)
        .mockReturnValueOnce({ update: mockUpdate } as any)

      const result = await GameService.toggleBuzzerLock('game-123', 'user-123')

      expect(mockUpdate).toHaveBeenCalledWith({ is_buzzer_locked: false })
      expect(result).toEqual(updatedGame)
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
      } as any)

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
      } as any)

      const result = await GameService.getAvailableClueSets('user-123')

      expect(result).toEqual([])
    })
  })

  describe('updatePlayerScore', () => {
    it('should update player score successfully', async () => {
      const mockGame = {
        id: 'game-123',
        host_id: 'user-123',
        question_set_id: 'clue-set-123',
        status: 'lobby' as const,
        current_round: 'jeopardy' as const,
        is_buzzer_locked: true,
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
        .mockReturnValueOnce({ select: mockGameSelect } as any)
        .mockReturnValueOnce({ select: mockPlayerSelect } as any)
        .mockReturnValueOnce({ update: mockUpdate } as any)

      const result = await GameService.updatePlayerScore('game-123', 'player-123', 200, 'user-123')

      expect(mockUpdate).toHaveBeenCalledWith({ score: 300 })
      expect(result).toEqual(updatedPlayer)
    })
  })
})
