/* eslint-disable @typescript-eslint/no-explicit-any */
import { FontAssignmentService } from './FontAssignmentService'
import { supabase } from '../supabase/client'
import { GameService } from '../games/GameService'

// Mock Supabase client and GameService
jest.mock('../supabase/client')
jest.mock('../games/GameService')

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('FontAssignmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getPlayerFont', () => {
    const userId = 'user-123'
    const gameId = 'game-456'

    it('should return existing permanent font when user has one', async () => {
      // Mock user profile with existing font
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { handwritten_font: 'handwritten-2', temp_handwritten_font: null },
              error: null
            })
          })
        })
      } as any)

      // Mock GameService.getPlayers to return empty array (no conflicts)
      jest.spyOn(GameService, 'getPlayers').mockResolvedValue([])

      const result = await FontAssignmentService.getPlayerFont(userId, gameId)

      expect(result).toBe('handwritten-2')
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should clear temporary font when no conflict exists', async () => {
      // Mock user profile with both permanent and temporary font
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { handwritten_font: 'handwritten-1', temp_handwritten_font: 'handwritten-3' },
              error: null
            })
          })
        })
      } as any)

      const result = await FontAssignmentService.getPlayerFont(userId, gameId)

      // Should return the permanent font since there's no conflict
      // (temporary font should be cleared)
      expect(result).toBe('handwritten-1')
    })

    it('should assign permanent font when user has none', async () => {
      // Mock user profile without font
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { handwritten_font: null, temp_handwritten_font: null },
                error: null
              })
            })
          })
        } as any)
        // Mock font assignment counts query
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: [
                { handwritten_font: 'handwritten-1' },
                { handwritten_font: 'handwritten-2' },
                { handwritten_font: 'handwritten-1' }
              ],
              error: null
            })
          })
        } as any)
        // Mock update query
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        } as any)

      const result = await FontAssignmentService.getPlayerFont(userId, gameId)

      // Should pick one of the least used fonts (handwritten-3 through handwritten-8 all have 0 usage)
      expect(result).toMatch(/^handwritten-[3-8]$/)
      expect(['handwritten-3', 'handwritten-4', 'handwritten-5', 'handwritten-6', 'handwritten-7', 'handwritten-8']).toContain(result)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any)

      const result = await FontAssignmentService.getPlayerFont(userId, gameId)

      expect(result).toBe('handwritten-1') // Should return default font
    })
  })

  describe('clearAllTemporaryFonts', () => {
    it('should clear all temporary fonts', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      } as any)

      await FontAssignmentService.clearAllTemporaryFonts()

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      const mockFrom = mockSupabase.from as jest.Mock
      expect(mockFrom).toHaveBeenCalledWith('profiles')
    })

    it('should handle errors when clearing temporary fonts', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Update failed' }
          })
        })
      } as any)

      // Should not throw error
      await expect(FontAssignmentService.clearAllTemporaryFonts()).resolves.toBeUndefined()
    })
  })

  describe('Font Assignment Algorithm', () => {
    it('should distribute fonts fairly', async () => {
      // Test that the algorithm picks the least used font
      const fontCounts = {
        'handwritten-1': 3,
        'handwritten-2': 1,
        'handwritten-3': 2,
        'handwritten-4': 1,
        'handwritten-5': 0,
        'handwritten-6': 2,
        'handwritten-7': 1,
        'handwritten-8': 1
      }

      // Mock the font counts query
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { handwritten_font: null, temp_handwritten_font: null },
                error: null
              })
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: Object.entries(fontCounts).flatMap(([font, count]) =>
                Array(count).fill({ handwritten_font: font })
              ),
              error: null
            })
          })
        } as any)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        } as any)

      const result = await FontAssignmentService.getPlayerFont('user-123', 'game-456')

      // Should pick handwritten-5 (count: 0)
      expect(result).toBe('handwritten-5')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty font counts', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { handwritten_font: null, temp_handwritten_font: null },
                error: null
              })
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: [], // No existing font assignments
              error: null
            })
          })
        } as any)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        } as any)

      const result = await FontAssignmentService.getPlayerFont('user-123', 'game-456')

      // Should pick any available font (all have 0 usage, so random selection)
      expect(result).toMatch(/^handwritten-[1-8]$/)
      expect(['handwritten-1', 'handwritten-2', 'handwritten-3', 'handwritten-4', 'handwritten-5', 'handwritten-6', 'handwritten-7', 'handwritten-8']).toContain(result)
    })

    it('should handle null user profile', async () => {
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

      const result = await FontAssignmentService.getPlayerFont('user-123', 'game-456')

      expect(result).toBe('handwritten-1') // Should return default
    })
  })
})
