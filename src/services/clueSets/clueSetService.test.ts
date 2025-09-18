/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClueSetService } from './clueSetService'
import { supabase } from '../supabase/client'

// Mock Supabase client
jest.mock('../supabase/client')

const mockSupabase = supabase as jest.Mocked<typeof supabase>

interface UserClueSet {
  id: string
  name: string
  created_at: string
  owner_id: string
}

describe('ClueSetService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserClueSets', () => {
    const userId = 'user-123'

    it('should return user clue sets', async () => {
      const mockClueSets: UserClueSet[] = [
        {
          id: 'clue-set-1',
          name: 'Test Set 1',
          owner_id: userId,
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 'clue-set-2',
          name: 'Test Set 2',
          owner_id: userId,
          created_at: '2023-01-02T00:00:00Z'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockClueSets,
              error: null
            })
          })
        })
      } as any)

      const result = await ClueSetService.getUserClueSets(userId)

      // The service should return the mock data structure
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('id', 'clue-set-1')
      expect(result[0]).toHaveProperty('name', 'Test Set 1')
      expect(result[1]).toHaveProperty('id', 'clue-set-2')
      expect(result[1]).toHaveProperty('name', 'Test Set 2')
      expect(mockSupabase.from).toHaveBeenCalledWith('clue_sets')
    })

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any)

      await expect(ClueSetService.getUserClueSets(userId)).rejects.toThrow('Database error')
    })

    it('should return empty array when no clue sets found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      } as any)

      const result = await ClueSetService.getUserClueSets(userId)

      expect(result).toEqual([])
    })
  })

  describe('deleteClueSet', () => {
    const clueSetId = 'clue-set-123'
    const userId = 'user-123'

    it('should delete clue set', async () => {
      // Mock ownership verification
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { owner_id: userId },
                error: null
              })
            })
          })
        } as any)
        // Mock deletion
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        } as any)

      const result = await ClueSetService.deleteClueSet(clueSetId, userId)

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('clue_sets')
    })

    it('should handle ownership verification errors', async () => {
      // Mock ownership verification failure
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      } as any)

      const result = await ClueSetService.deleteClueSet(clueSetId, userId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Not found')
    })

    it('should reject unauthorized deletion attempts', async () => {
      // Mock ownership verification - different owner
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { owner_id: 'different-user' },
              error: null
            })
          })
        })
      } as any)

      const result = await ClueSetService.deleteClueSet(clueSetId, userId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })

    it('should handle clue set not found during ownership check', async () => {
      // Mock ownership verification - no data returned
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      } as any)

      const result = await ClueSetService.deleteClueSet(clueSetId, userId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })

    it('should handle deletion database errors', async () => {
      // Mock successful ownership verification
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { owner_id: userId },
                error: null
              })
            })
          })
        } as any)
        // Mock deletion failure
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Delete failed' }
            })
          })
        } as any)

      const result = await ClueSetService.deleteClueSet(clueSetId, userId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Delete failed')
    })

    it('should handle unexpected exceptions', async () => {
      // Mock ownership verification that throws
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await ClueSetService.deleteClueSet(clueSetId, userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unexpected error')
    })

    it('should handle non-Error exceptions', async () => {
      // Mock ownership verification that throws non-Error
      mockSupabase.from.mockImplementation(() => {
        throw 'String error'
      })

      const result = await ClueSetService.deleteClueSet(clueSetId, userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error occurred')
    })
  })

  describe('checkDuplicateName', () => {
    const userId = 'user-123'

    it('should return false for unique name', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      } as any)

      const result = await ClueSetService.checkDuplicateName('Unique Name', userId)

      expect(result).toBe(false)
    })

    it('should return true for duplicate name', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [{ id: 'existing-id' }],
                error: null
              })
            })
          })
        })
      } as any)

      const result = await ClueSetService.checkDuplicateName('Duplicate Name', userId)

      expect(result).toBe(true)
    })

    it('should handle database errors in duplicate check', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            })
          })
        })
      } as any)

      await expect(ClueSetService.checkDuplicateName('Test Name', userId)).rejects.toThrow('Database error')
    })
  })

  describe('getClueSetSummary', () => {
    const clueSetId = 'clue-set-123'

    it('should return clue set summary with all rounds', async () => {
      const mockClueSet = {
        id: clueSetId,
        name: 'Test Clue Set',
        created_at: '2023-01-01T00:00:00Z'
      }

      const mockBoardsWithCategories = [
        {
          round: 'jeopardy',
          categories: [
            { id: 'cat-1', name: 'Category 1', position: 1 },
            { id: 'cat-2', name: 'Category 2', position: 2 },
            { id: 'cat-3', name: 'Category 3', position: 3 },
            { id: 'cat-4', name: 'Category 4', position: 4 },
            { id: 'cat-5', name: 'Category 5', position: 5 },
            { id: 'cat-6', name: 'Category 6', position: 6 }
          ]
        },
        {
          round: 'double',
          categories: [
            { id: 'cat-7', name: 'Double Category 1', position: 1 },
            { id: 'cat-8', name: 'Double Category 2', position: 2 },
            { id: 'cat-9', name: 'Double Category 3', position: 3 },
            { id: 'cat-10', name: 'Double Category 4', position: 4 },
            { id: 'cat-11', name: 'Double Category 5', position: 5 },
            { id: 'cat-12', name: 'Double Category 6', position: 6 }
          ]
        },
        {
          round: 'final',
          categories: [
            { id: 'cat-13', name: 'Final Jeopardy Category', position: 1 }
          ]
        }
      ]

      // Mock clue set query
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockClueSet,
                error: null
              })
            })
          })
        } as any)
        // Mock boards query
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockBoardsWithCategories,
                error: null
              })
            })
          })
        } as any)
        // Mock clue count query
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              count: 61
            })
          })
        } as any)

      const result = await ClueSetService.getClueSetSummary(clueSetId)

      expect(result).toEqual({
        id: clueSetId,
        name: 'Test Clue Set',
        rounds: {
          jeopardy: ['Category 1', 'Category 2', 'Category 3', 'Category 4', 'Category 5', 'Category 6'],
          doubleJeopardy: ['Double Category 1', 'Double Category 2', 'Double Category 3', 'Double Category 4', 'Double Category 5', 'Double Category 6'],
          finalJeopardy: 'Final Jeopardy Category'
        },
        createdAt: '2023-01-01T00:00:00Z',
        totalClues: 61
      })
    })

    it('should handle clue set not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      } as any)

      await expect(ClueSetService.getClueSetSummary(clueSetId)).rejects.toThrow('Not found')
    })

    it('should handle boards query error', async () => {
      const mockClueSet = {
        id: clueSetId,
        name: 'Test Clue Set',
        created_at: '2023-01-01T00:00:00Z'
      }

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockClueSet,
                error: null
              })
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Boards error' }
              })
            })
          })
        } as any)

      await expect(ClueSetService.getClueSetSummary(clueSetId)).rejects.toThrow('Boards error')
    })

    it('should handle missing categories gracefully', async () => {
      const mockClueSet = {
        id: clueSetId,
        name: 'Test Clue Set',
        created_at: '2023-01-01T00:00:00Z'
      }

      const mockBoardsWithCategories = [
        {
          round: 'jeopardy',
          categories: []
        }
      ]

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockClueSet,
                error: null
              })
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockBoardsWithCategories,
                error: null
              })
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              count: 0
            })
          })
        } as any)

      const result = await ClueSetService.getClueSetSummary(clueSetId)

      expect(result.rounds.jeopardy).toEqual([])
      expect(result.rounds.doubleJeopardy).toEqual([])
      expect(result.rounds.finalJeopardy).toBe('Final Jeopardy')
      expect(result.totalClues).toBe(0)
    })
  })

  describe('loadClueSetFromDatabase', () => {
    const clueSetId = 'clue-set-123'

    it('should load complete clue set data', async () => {
      const mockClueSet = {
        id: clueSetId,
        name: 'Test Clue Set'
      }

      const mockBoards = [
        {
          round: 'jeopardy',
          categories: [
            {
              name: 'Category 1',
              position: 1,
              clues: [
                { id: 'clue-1', value: 200, prompt: 'Prompt 1', response: 'Response 1', position: 1 },
                { id: 'clue-2', value: 400, prompt: 'Prompt 2', response: 'Response 2', position: 2 }
              ]
            },
            {
              name: 'Category 2',
              position: 2,
              clues: [
                { id: 'clue-3', value: 200, prompt: 'Prompt 3', response: 'Response 3', position: 1 }
              ]
            }
          ]
        },
        {
          round: 'double',
          categories: [
            {
              name: 'Double Category 1',
              position: 1,
              clues: [
                { id: 'clue-4', value: 400, prompt: 'Double Prompt 1', response: 'Double Response 1', position: 1 }
              ]
            }
          ]
        },
        {
          round: 'final',
          categories: [
            {
              name: 'Final Category',
              position: 1,
              clues: [
                { id: 'clue-5', value: 0, prompt: 'Final Prompt', response: 'Final Response', position: 1 }
              ]
            }
          ]
        }
      ]

      // Mock clue set query
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockClueSet,
                error: null
              })
            })
          })
        } as any)
        // Mock boards query
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockBoards,
              error: null
            })
          })
        } as any)

      const result = await ClueSetService.loadClueSetFromDatabase(clueSetId)

      expect(result).toEqual({
        name: 'Test Clue Set',
        filename: 'Test Clue Set.csv',
        rounds: {
          jeopardy: [
            {
              name: 'Category 1',
              clues: [
                { id: 'clue-1', value: 200, prompt: 'Prompt 1', response: 'Response 1', position: 1 },
                { id: 'clue-2', value: 400, prompt: 'Prompt 2', response: 'Response 2', position: 2 }
              ]
            },
            {
              name: 'Category 2',
              clues: [
                { id: 'clue-3', value: 200, prompt: 'Prompt 3', response: 'Response 3', position: 1 }
              ]
            }
          ],
          double: [
            {
              name: 'Double Category 1',
              clues: [
                { id: 'clue-4', value: 400, prompt: 'Double Prompt 1', response: 'Double Response 1', position: 1 }
              ]
            }
          ],
          final: {
            name: 'Final Category',
            clues: [
              { id: 'clue-5', value: 0, prompt: 'Final Prompt', response: 'Final Response', position: 1 }
            ]
          }
        }
      })
    })

    it('should handle clue set not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      } as any)

      await expect(ClueSetService.loadClueSetFromDatabase(clueSetId)).rejects.toThrow('Not found')
    })

    it('should handle boards query error', async () => {
      const mockClueSet = {
        id: clueSetId,
        name: 'Test Clue Set'
      }

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockClueSet,
                error: null
              })
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Boards error' }
            })
          })
        } as any)

      await expect(ClueSetService.loadClueSetFromDatabase(clueSetId)).rejects.toThrow('Boards error')
    })

    it('should handle missing boards data', async () => {
      const mockClueSet = {
        id: clueSetId,
        name: 'Test Clue Set'
      }

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockClueSet,
                error: null
              })
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        } as any)

      await expect(ClueSetService.loadClueSetFromDatabase(clueSetId)).rejects.toThrow('No board data found for clue set')
    })

    it('should handle missing categories gracefully', async () => {
      const mockClueSet = {
        id: clueSetId,
        name: 'Test Clue Set'
      }

      const mockBoards = [
        {
          round: 'jeopardy',
          categories: []
        },
        {
          round: 'double',
          categories: null
        },
        {
          round: 'final',
          categories: []
        }
      ]

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockClueSet,
                error: null
              })
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockBoards,
              error: null
            })
          })
        } as any)

      const result = await ClueSetService.loadClueSetFromDatabase(clueSetId)

      expect(result.rounds.jeopardy).toEqual([])
      expect(result.rounds.double).toEqual([])
      expect(result.rounds.final).toEqual({
        name: 'Final Jeopardy',
        clues: []
      })
    })
  })
})
