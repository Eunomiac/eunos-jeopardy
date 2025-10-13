import { ClueService } from './ClueService'
import type { Clue, ClueState, DailyDoublePosition } from './ClueService'

// Mock Supabase client
jest.mock('../supabase/client', () => ({
  supabase: {
    from: jest.fn()
  }
}))

import { supabase } from '../supabase/client'
const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('ClueService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initializeClueStates', () => {
    const mockGame = { clue_set_id: 'clue-set-123' }
    const mockBoards = [{ id: 'board-1' }, { id: 'board-2' }]
    const mockCategories = [{ id: 'cat-1' }, { id: 'cat-2' }, { id: 'cat-3' }]
    const mockClues = [{ id: 'clue-1' }, { id: 'clue-2' }, { id: 'clue-3' }]
    const mockClueStates = [
      { game_id: 'game-123', clue_id: 'clue-1', revealed: false, completed: false },
      { game_id: 'game-123', clue_id: 'clue-2', revealed: false, completed: false },
      { game_id: 'game-123', clue_id: 'clue-3', revealed: false, completed: false }
    ]

    it('should initialize clue states successfully', async () => {
      // Mock the chain of database calls
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
              })
            })
          }
        }
        if (table === 'boards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockBoards, error: null })
            })
          }
        }
        if (table === 'categories') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: mockCategories, error: null })
            })
          }
        }
        if (table === 'clues') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: mockClues, error: null })
            })
          }
        }
        if (table === 'clue_states') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({ data: mockClueStates, error: null })
            })
          }
        }
        throw new Error(`Unexpected table: ${table}`)
      })

      const result = await ClueService.initializeClueStates('game-123')

      expect(result).toEqual(mockClueStates)
      expect(mockSupabase.from).toHaveBeenCalledWith('games')
      expect(mockSupabase.from).toHaveBeenCalledWith('boards')
      expect(mockSupabase.from).toHaveBeenCalledWith('categories')
      expect(mockSupabase.from).toHaveBeenCalledWith('clues')
      expect(mockSupabase.from).toHaveBeenCalledWith('clue_states')
    })

    it('should handle game fetch error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Game not found' } })
              })
            })
          }
        }
      })

      await expect(ClueService.initializeClueStates('game-123')).rejects.toThrow('Failed to fetch game: Game not found')
    })

    it('should handle missing clue set ID', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { clue_set_id: null }, error: null })
              })
            })
          }
        }
      })

      await expect(ClueService.initializeClueStates('game-123')).rejects.toThrow('Game does not have a clue set assigned')
    })

    it('should handle boards fetch error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
              })
            })
          }
        }
        if (table === 'boards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Boards not found' } })
            })
          }
        }
      })

      await expect(ClueService.initializeClueStates('game-123')).rejects.toThrow('Failed to fetch boards: Boards not found')
    })

    it('should handle empty boards', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
              })
            })
          }
        }
        if (table === 'boards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          }
        }
      })

      await expect(ClueService.initializeClueStates('game-123')).rejects.toThrow('No boards found for this clue set')
    })

    it('should handle categories fetch error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
              })
            })
          }
        }
        if (table === 'boards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockBoards, error: null })
            })
          }
        }
        if (table === 'categories') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: { message: 'Categories not found' } })
            })
          }
        }
      })

      await expect(ClueService.initializeClueStates('game-123')).rejects.toThrow('Failed to fetch categories: Categories not found')
    })

    it('should handle empty categories', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
              })
            })
          }
        }
        if (table === 'boards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockBoards, error: null })
            })
          }
        }
        if (table === 'categories') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          }
        }
      })

      await expect(ClueService.initializeClueStates('game-123')).rejects.toThrow('No categories found for this clue set')
    })

    it('should handle clues fetch error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
              })
            })
          }
        }
        if (table === 'boards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockBoards, error: null })
            })
          }
        }
        if (table === 'categories') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: mockCategories, error: null })
            })
          }
        }
        if (table === 'clues') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: { message: 'Clues not found' } })
            })
          }
        }
      })

      await expect(ClueService.initializeClueStates('game-123')).rejects.toThrow('Failed to fetch clues: Clues not found')
    })

    it('should handle empty clues', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
              })
            })
          }
        }
        if (table === 'boards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockBoards, error: null })
            })
          }
        }
        if (table === 'categories') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: mockCategories, error: null })
            })
          }
        }
        if (table === 'clues') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          }
        }
      })

      await expect(ClueService.initializeClueStates('game-123')).rejects.toThrow('No clues found for this clue set')
    })

    it('should handle clue states insert error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
              })
            })
          }
        }
        if (table === 'boards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockBoards, error: null })
            })
          }
        }
        if (table === 'categories') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: mockCategories, error: null })
            })
          }
        }
        if (table === 'clues') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: mockClues, error: null })
            })
          }
        }
        if (table === 'clue_states') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } })
            })
          }
        }
      })

      await expect(ClueService.initializeClueStates('game-123')).rejects.toThrow('Failed to initialize clue states: Insert failed')
    })
  })

  describe('isDailyDouble', () => {
    const mockClueWithDailyDouble = {
      position: 3,
      category: {
        position: 2,
        board: {
          daily_double_cells: [
            { category: 2, row: 3 },
            { category: 4, row: 5 }
          ]
        }
      }
    }

    const mockClueWithoutDailyDouble = {
      position: 1,
      category: {
        position: 1,
        board: {
          daily_double_cells: [
            { category: 2, row: 3 },
            { category: 4, row: 5 }
          ]
        }
      }
    }

    it('should return true for Daily Double clue', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clues') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockClueWithDailyDouble, error: null })
              })
            })
          }
        }
      })

      const result = await ClueService.isDailyDouble('clue-123')
      expect(result).toBe(true)
    })

    it('should return false for non-Daily Double clue', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clues') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockClueWithoutDailyDouble, error: null })
              })
            })
          }
        }
      })

      const result = await ClueService.isDailyDouble('clue-123')
      expect(result).toBe(false)
    })

    it('should return false when no category data', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clues') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { position: 1, category: null }, error: null })
              })
            })
          }
        }
      })

      const result = await ClueService.isDailyDouble('clue-123')
      expect(result).toBe(false)
    })

    it('should return false when no Daily Double positions', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clues') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    position: 1,
                    category: {
                      position: 1,
                      board: { daily_double_cells: null }
                    }
                  },
                  error: null
                })
              })
            })
          }
        }
      })

      const result = await ClueService.isDailyDouble('clue-123')
      expect(result).toBe(false)
    })

    it('should handle database error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clues') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
              })
            })
          }
        }
      })

      await expect(ClueService.isDailyDouble('clue-123')).rejects.toThrow('Failed to check Daily Double status: Database error')
    })
  })

  describe('getDailyDoublePositions', () => {
    const mockDailyDoublePositions: DailyDoublePosition[] = [
      { category: 2, row: 3 },
      { category: 4, row: 5 }
    ]

    it('should return Daily Double positions for valid board', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'boards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { daily_double_cells: mockDailyDoublePositions },
                    error: null
                  })
                })
              })
            })
          }
        }
      })

      const result = await ClueService.getDailyDoublePositions('clue-set-123', 'jeopardy')
      expect(result).toEqual(mockDailyDoublePositions)
    })

    it('should return empty array when no Daily Double positions', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'boards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { daily_double_cells: null },
                    error: null
                  })
                })
              })
            })
          }
        }
      })

      const result = await ClueService.getDailyDoublePositions('clue-set-123', 'jeopardy')
      expect(result).toEqual([])
    })

    it('should handle database error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'boards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Board not found' } })
                })
              })
            })
          }
        }
      })

      await expect(ClueService.getDailyDoublePositions('clue-set-123', 'jeopardy')).rejects.toThrow('Failed to get Daily Double positions: Board not found')
    })

    it('should handle invalid Daily Double positions format', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'boards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { daily_double_cells: 'invalid format' },
                    error: null
                  })
                })
              })
            })
          }
        }
      })

      const result = await ClueService.getDailyDoublePositions('clue-set-123', 'jeopardy')
      expect(result).toEqual([])
    })
  })

  describe('getClueById', () => {
    const mockClue: Clue = {
      id: 'clue-123',
      category_id: 'cat-123',
      prompt: 'This is a test prompt',
      response: 'What is a test answer?',
      value: 200,
      position: 1,
      locked_out_player_ids: null
    }

    it('should return clue by ID', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clues') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockClue, error: null })
              })
            })
          }
        }
      })

      const result = await ClueService.getClueById('clue-123')
      expect(result).toEqual(mockClue)
    })

    it('should handle database error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clues') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
              })
            })
          }
        }
      })

      await expect(ClueService.getClueById('clue-123')).rejects.toThrow('Failed to fetch clue: Database error')
    })

    it('should handle clue not found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clues') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          }
        }
      })

      await expect(ClueService.getClueById('clue-123')).rejects.toThrow('Clue not found')
    })
  })

  describe('getClueState', () => {
    const mockClueState: ClueState = {
      game_id: 'game-123',
      clue_id: 'clue-123',
      revealed: false,
      completed: false
    }

    it('should return clue state when found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clue_states') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockClueState, error: null })
                })
              })
            })
          }
        }
      })

      const result = await ClueService.getClueState('game-123', 'clue-123')
      expect(result).toEqual(mockClueState)
    })

    it('should return null when clue state not found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clue_states') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
                })
              })
            })
          }
        }
      })

      const result = await ClueService.getClueState('game-123', 'clue-123')
      expect(result).toBeNull()
    })

    it('should handle database error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clue_states') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
                })
              })
            })
          }
        }
      })

      await expect(ClueService.getClueState('game-123', 'clue-123')).rejects.toThrow('Failed to fetch clue state: Database error')
    })
  })

  describe('getGameClueStates', () => {
    const mockClueStates: ClueState[] = [
      {
        game_id: 'game-123',
        clue_id: 'clue-1',
        revealed: false,
        completed: false
      },
      {
        game_id: 'game-123',
        clue_id: 'clue-2',
        revealed: true,
        completed: false
      }
    ]

    it('should return all clue states for game', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clue_states') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockClueStates, error: null })
            })
          }
        }
      })

      const result = await ClueService.getGameClueStates('game-123')
      expect(result).toEqual(mockClueStates)
    })

    it('should return empty array when no clue states', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clue_states') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          }
        }
      })

      const result = await ClueService.getGameClueStates('game-123')
      expect(result).toEqual([])
    })

    it('should handle database error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clue_states') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
            })
          }
        }
      })

      await expect(ClueService.getGameClueStates('game-123')).rejects.toThrow('Failed to fetch clue states: Database error')
    })
  })

  describe('revealClue', () => {
    const mockUpdatedClueState: ClueState = {
      game_id: 'game-123',
      clue_id: 'clue-123',
      revealed: true,
      completed: false
    }

    it('should reveal clue successfully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clue_states') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: mockUpdatedClueState, error: null })
                  })
                })
              })
            })
          }
        }
      })

      const result = await ClueService.revealClue('game-123', 'clue-123')
      expect(result).toEqual(mockUpdatedClueState)
    })

    it('should handle database error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clue_states') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } })
                  })
                })
              })
            })
          }
        }
      })

      await expect(ClueService.revealClue('game-123', 'clue-123')).rejects.toThrow('Failed to reveal clue: Update failed')
    })

    it('should handle no clue state found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clue_states') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null })
                  })
                })
              })
            })
          }
        }
      })

      await expect(ClueService.revealClue('game-123', 'clue-123')).rejects.toThrow('No clue state found to update')
    })
  })

  describe('markClueCompleted', () => {
    const mockCompletedClueState: ClueState = {
      game_id: 'game-123',
      clue_id: 'clue-123',
      revealed: true,
      completed: true
    }

    it('should mark clue as completed successfully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clue_states') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: mockCompletedClueState, error: null })
                  })
                })
              })
            })
          }
        }
      })

      const result = await ClueService.markClueCompleted('game-123', 'clue-123')
      expect(result).toEqual(mockCompletedClueState)
    })

    it('should handle database error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clue_states') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } })
                  })
                })
              })
            })
          }
        }
      })

      await expect(ClueService.markClueCompleted('game-123', 'clue-123')).rejects.toThrow('Failed to complete clue: Update failed')
    })

    it('should handle no clue state found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clue_states') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null })
                  })
                })
              })
            })
          }
        }
      })

      await expect(ClueService.markClueCompleted('game-123', 'clue-123')).rejects.toThrow('No clue state found to update')
    })
  })

  describe('getCompletedCluesCount', () => {
    const mockCompletedClueStates = [
      { game_id: 'game-123', clue_id: 'clue-1', revealed: true, completed: true },
      { game_id: 'game-123', clue_id: 'clue-2', revealed: true, completed: true }
    ]

    it('should return count of completed clues', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clue_states') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: mockCompletedClueStates, error: null })
              })
            })
          }
        }
      })

      const result = await ClueService.getCompletedCluesCount('game-123')
      expect(result).toBe(2)
    })

    it('should return 0 when no completed clues', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clue_states') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          }
        }
      })

      const result = await ClueService.getCompletedCluesCount('game-123')
      expect(result).toBe(0)
    })

    it('should handle database error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clue_states') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
              })
            })
          }
        }
      })

      await expect(ClueService.getCompletedCluesCount('game-123')).rejects.toThrow('Failed to count completed clues: Database error')
    })
  })

  describe('getCompletedCluesCountByRound', () => {
    const mockGame = { clue_set_id: 'clue-set-123' }
    const mockBoard = { id: 'board-123' }
    const mockCategories = [
      { id: 'cat-1' },
      { id: 'cat-2' },
      { id: 'cat-3' },
      { id: 'cat-4' },
      { id: 'cat-5' },
      { id: 'cat-6' }
    ]
    const mockClues = [
      { id: 'clue-1' },
      { id: 'clue-2' },
      { id: 'clue-3' }
    ]
    const mockCompletedClueStates = [
      { game_id: 'game-123', clue_id: 'clue-1', completed: true },
      { game_id: 'game-123', clue_id: 'clue-2', completed: true }
    ]

    it('should return count of completed clues for jeopardy round', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
              })
            })
          }
        }
        if (table === 'boards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockBoard, error: null })
                })
              })
            })
          }
        }
        if (table === 'categories') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockCategories, error: null })
            })
          }
        }
        if (table === 'clues') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: mockClues, error: null })
            })
          }
        }
        if (table === 'clue_states') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({ data: mockCompletedClueStates, error: null })
                })
              })
            })
          }
        }
      })

      const result = await ClueService.getCompletedCluesCountByRound('game-123', 'jeopardy')
      expect(result).toBe(2)
    })

    it('should return 0 when no clues completed in round', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
              })
            })
          }
        }
        if (table === 'boards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockBoard, error: null })
                })
              })
            })
          }
        }
        if (table === 'categories') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockCategories, error: null })
            })
          }
        }
        if (table === 'clues') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: mockClues, error: null })
            })
          }
        }
        if (table === 'clue_states') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({ data: [], error: null })
                })
              })
            })
          }
        }
      })

      const result = await ClueService.getCompletedCluesCountByRound('game-123', 'double')
      expect(result).toBe(0)
    })

    it('should handle game without clue set', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { clue_set_id: null }, error: null })
              })
            })
          }
        }
      })

      await expect(ClueService.getCompletedCluesCountByRound('game-123', 'jeopardy'))
        .rejects.toThrow('Game does not have a clue set assigned')
    })
  })

  describe('isRoundComplete', () => {
    it('should return true when all 30 clues completed for jeopardy round', async () => {
      jest.spyOn(ClueService, 'getCompletedCluesCountByRound').mockResolvedValue(30)

      const result = await ClueService.isRoundComplete('game-123', 'jeopardy')
      expect(result).toBe(true)
    })

    it('should return false when clues remain in jeopardy round', async () => {
      jest.spyOn(ClueService, 'getCompletedCluesCountByRound').mockResolvedValue(25)

      const result = await ClueService.isRoundComplete('game-123', 'jeopardy')
      expect(result).toBe(false)
    })

    it('should return true when all 30 clues completed for double round', async () => {
      jest.spyOn(ClueService, 'getCompletedCluesCountByRound').mockResolvedValue(30)

      const result = await ClueService.isRoundComplete('game-123', 'double')
      expect(result).toBe(true)
    })

    it('should return true when 1 clue completed for final round', async () => {
      jest.spyOn(ClueService, 'getCompletedCluesCountByRound').mockResolvedValue(1)

      const result = await ClueService.isRoundComplete('game-123', 'final')
      expect(result).toBe(true)
    })

    it('should return false when final clue not completed', async () => {
      jest.spyOn(ClueService, 'getCompletedCluesCountByRound').mockResolvedValue(0)

      const result = await ClueService.isRoundComplete('game-123', 'final')
      expect(result).toBe(false)
    })
  })
})
