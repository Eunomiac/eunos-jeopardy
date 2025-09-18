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

    it('should handle deletion errors', async () => {
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
  })




})
