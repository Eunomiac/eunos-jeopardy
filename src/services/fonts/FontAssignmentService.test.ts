import { FontAssignmentService } from './FontAssignmentService'
import { supabase } from '../supabase/client'
import { GameService } from '../games/GameService'
import { createMockPlayer } from '../../test/testUtils'
import { createMockQueryBuilder } from '../../test/supabaseMockHelpers'

// Mock Supabase client and GameService
jest.mock('../supabase/client')
jest.mock('../games/GameService')

const mockSupabase = supabase as jest.Mocked<typeof supabase>
const mockGameService = GameService as jest.Mocked<typeof GameService>

describe('FontAssignmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getPlayerFont', () => {
    const userId = 'user-123'
    const gameId = 'game-456'

    beforeEach(() => {
      // Default mock for GameService.getPlayers - return empty array (no conflicts)
      mockGameService.getPlayers.mockResolvedValue([])
    })

    it('should return existing permanent font when user has one', async () => {
      // Mock user profile with existing font
      mockSupabase.from.mockReturnValue(
        createMockQueryBuilder()
          .select()
          .eq()
          .withSingleData({ handwritten_font: 'handwritten-2', temp_handwritten_font: null })
      )

      const result = await FontAssignmentService.getPlayerFont(userId, gameId)

      expect(result).toBe('handwritten-2')
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should clear temporary font when no conflict exists', async () => {
      // Mock user profile with both permanent and temporary font
      mockSupabase.from
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .select()
            .eq()
            .withSingleData({ handwritten_font: 'handwritten-1', temp_handwritten_font: 'handwritten-3' })
        )
        // Mock update to clear temporary font
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .update()
            .eq()
            .withSingleData(null)
        )

      const result = await FontAssignmentService.getPlayerFont(userId, gameId)

      // Should return the permanent font since there's no conflict
      // (temporary font should be cleared)
      expect(result).toBe('handwritten-1')
    })

    it('should assign temporary font when permanent font conflicts with other players', async () => {
      // Mock user profile with permanent font
      mockSupabase.from
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .select()
            .eq()
            .withSingleData({ handwritten_font: 'handwritten-1', temp_handwritten_font: null })
        )
        // Mock fonts in use query - another player has handwritten-1
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .select()
            .in()
            .withData([{ handwritten_font: 'handwritten-1', temp_handwritten_font: null }])
        )
        // Mock temporary font assignment
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .update()
            .eq()
            .withSingleData(null)
        )

      // Override default mock for this test - return other players
      mockGameService.getPlayers.mockResolvedValueOnce([
        createMockPlayer({ user_id: 'other-user-1' })
      ])

      const result = await FontAssignmentService.getPlayerFont(userId, gameId)

      // Should get a different font (not handwritten-1)
      expect(result).toMatch(/^handwritten-[2-8]$/)
      expect(result).not.toBe('handwritten-1')
    })

    it('should assign permanent font when user has none', async () => {
      // Mock user profile without font
      mockSupabase.from
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .select()
            .eq()
            .withSingleData({ handwritten_font: null, temp_handwritten_font: null })
        )
        // Mock font assignment counts query
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .select()
            .not()
            .withData([
              { handwritten_font: 'handwritten-1' },
              { handwritten_font: 'handwritten-2' },
              { handwritten_font: 'handwritten-1' }
            ])
        )
        // Mock update query
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .update()
            .eq()
            .withSingleData(null)
        )

      const result = await FontAssignmentService.getPlayerFont(userId, gameId)

      // Should pick one of the least used fonts (handwritten-3 through handwritten-8 all have 0 usage)
      expect(result).toMatch(/^handwritten-[3-8]$/)
      expect(['handwritten-3', 'handwritten-4', 'handwritten-5', 'handwritten-6', 'handwritten-7', 'handwritten-8']).toContain(result)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabase.from.mockReturnValue(
        createMockQueryBuilder()
          .select()
          .eq()
          .withError({ message: 'Database error', details: '', hint: '', code: '500' })
      )

      const result = await FontAssignmentService.getPlayerFont(userId, gameId)

      expect(result).toBe('handwritten-1') // Should return default font
    })
  })

  describe('clearAllTemporaryFonts', () => {
    it('should clear all temporary fonts', async () => {
      mockSupabase.from.mockReturnValue(
        createMockQueryBuilder()
          .update()
          .not()
          .withSingleData(null)
      )

      await FontAssignmentService.clearAllTemporaryFonts()

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      const mockFrom = mockSupabase.from as jest.Mock
      expect(mockFrom).toHaveBeenCalledWith('profiles')
    })

    it('should handle errors when clearing temporary fonts', async () => {
      mockSupabase.from.mockReturnValue(
        createMockQueryBuilder()
          .update()
          .not()
          .withError({ message: 'Update failed', details: '', hint: '', code: '500' })
      )

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
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .select()
            .eq()
            .withSingleData({ handwritten_font: null, temp_handwritten_font: null })
        )
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .select()
            .not()
            .withData(Object.entries(fontCounts).flatMap(([font, count]) =>
              Array(count).fill({ handwritten_font: font })
            ))
        )
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .update()
            .eq()
            .withSingleData(null)
        )

      const result = await FontAssignmentService.getPlayerFont('user-123', 'game-456')

      // Should pick handwritten-5 (count: 0)
      expect(result).toBe('handwritten-5')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty font counts', async () => {
      mockSupabase.from
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .select()
            .eq()
            .withSingleData({ handwritten_font: null, temp_handwritten_font: null })
        )
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .select()
            .not()
            .withData([]) // No existing font assignments
        )
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .update()
            .eq()
            .withSingleData(null)
        )

      const result = await FontAssignmentService.getPlayerFont('user-123', 'game-456')

      // Should pick any available font (all have 0 usage, so random selection)
      expect(result).toMatch(/^handwritten-[1-8]$/)
      expect(['handwritten-1', 'handwritten-2', 'handwritten-3', 'handwritten-4', 'handwritten-5', 'handwritten-6', 'handwritten-7', 'handwritten-8']).toContain(result)
    })

    it('should handle null user profile', async () => {
      mockSupabase.from.mockReturnValue(
        createMockQueryBuilder()
          .select()
          .eq()
          .withSingleData(null)
      )

      const result = await FontAssignmentService.getPlayerFont('user-123', 'game-456')

      expect(result).toBe('handwritten-1') // Should return default
    })

    it('should handle all fonts in use edge case', async () => {
      // Mock user profile with permanent font
      mockSupabase.from
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .select()
            .eq()
            .withSingleData({ handwritten_font: 'handwritten-1', temp_handwritten_font: null })
        )
        // Mock all 8 fonts in use
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .select()
            .in()
            .withData([
              { handwritten_font: 'handwritten-1', temp_handwritten_font: null },
              { handwritten_font: 'handwritten-2', temp_handwritten_font: null },
              { handwritten_font: 'handwritten-3', temp_handwritten_font: null },
              { handwritten_font: 'handwritten-4', temp_handwritten_font: null },
              { handwritten_font: 'handwritten-5', temp_handwritten_font: null },
              { handwritten_font: 'handwritten-6', temp_handwritten_font: null },
              { handwritten_font: 'handwritten-7', temp_handwritten_font: null },
              { handwritten_font: 'handwritten-8', temp_handwritten_font: null }
            ])
        )
        // Mock temporary font assignment
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .update()
            .eq()
            .withSingleData(null)
        )

      // Override default mock - return 8 connected players
      mockGameService.getPlayers.mockResolvedValueOnce(
        Array.from({ length: 8 }, (_, i) => createMockPlayer({ user_id: `user-${i}` }))
      )

      const result = await FontAssignmentService.getPlayerFont('user-123', 'game-456')

      // Should still get a font (random assignment when all in use)
      expect(result).toMatch(/^handwritten-[1-8]$/)
    })

    it('should prioritize temp_handwritten_font over permanent font for other players', async () => {
      // Mock user profile
      mockSupabase.from
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .select()
            .eq()
            .withSingleData({ handwritten_font: 'handwritten-1', temp_handwritten_font: null })
        )
        // Mock other player using temp font that conflicts
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .select()
            .in()
            .withData([
              { handwritten_font: 'handwritten-2', temp_handwritten_font: 'handwritten-1' }
            ])
        )
        // Mock temporary font assignment
        .mockReturnValueOnce(
          createMockQueryBuilder()
            .update()
            .eq()
            .withSingleData(null)
        )

      // Override default mock - return other player
      mockGameService.getPlayers.mockResolvedValueOnce([
        createMockPlayer({ user_id: 'other-user' })
      ])

      const result = await FontAssignmentService.getPlayerFont('user-123', 'game-456')

      // Should get a different font because other player's temp font is handwritten-1
      expect(result).toMatch(/^handwritten-[2-8]$/)
      expect(result).not.toBe('handwritten-1')
    })

    it('should handle errors in font assignment gracefully', async () => {
      // Mock profile fetch error
      const mockBuilder = createMockQueryBuilder()
      mockBuilder.select().eq()
      mockBuilder.single.mockRejectedValue(new Error('Database connection failed'))
      mockSupabase.from.mockReturnValue(mockBuilder)

      const result = await FontAssignmentService.getPlayerFont('user-123', 'game-456')

      // Should fallback to first font
      expect(result).toBe('handwritten-1')
    })
  })
})
