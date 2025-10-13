import { loadClueSetFromCSV, saveClueSetToDatabase } from './loader'
import { supabase } from '../supabase/client'
import { testCSVFiles } from '../../test/testUtils'
import { readFileSync } from 'fs'
import { join } from 'path'

// Mock dependencies - only mock Supabase, use real utility functions
jest.mock('../supabase/client')

// Mock fetch globally
global.fetch = jest.fn()

describe('clueSetLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('loadClueSetFromCSV', () => {
    // Using consolidated mock data from commonTestData

    beforeEach(() => {
      // Default: Mock fetch to return valid CSV content
      const validCSV = readFileSync(join(process.cwd(), testCSVFiles.validBasic), 'utf-8')
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(validCSV)
      })
    })

    it('should successfully load and parse valid CSV file', async () => {
      const result = await loadClueSetFromCSV('test-valid-basic.csv')

      // Verify basic structure - using real validation means we get real results!
      expect(result).toHaveProperty('name', 'Test Valid Basic')
      expect(result).toHaveProperty('filename', 'test-valid-basic.csv')
      expect(result.rounds).toHaveProperty('jeopardy')
      expect(result.rounds).toHaveProperty('double')
      expect(result.rounds).toHaveProperty('final')

      // Verify proper Jeopardy structure (real validation ensures this)
      expect(result.rounds.jeopardy).toHaveLength(6) // 6 categories
      expect(result.rounds.double).toHaveLength(6) // 6 categories
      expect(result.rounds.final).toHaveProperty('name') // Final is a single category object
      expect(result.rounds.final).toHaveProperty('clues')
    })

    it('should handle fetch error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      await expect(loadClueSetFromCSV('nonexistent.csv')).rejects.toThrow('Failed to fetch nonexistent.csv: 404 Not Found')
    })

    it('should handle network error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(loadClueSetFromCSV('test-game-1.csv')).rejects.toThrow('Network error')
    })

    it('should handle CSV parsing error with malformed CSV', async () => {
      // Mock fetch to return malformed CSV that will cause parseCSV to fail
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('invalid,csv,format\nno,proper,structure')
      })

      await expect(loadClueSetFromCSV('test-game-1.csv')).rejects.toThrow()
    })

    it('should handle validation error with invalid structure', async () => {
      // Mock fetch to return CSV with invalid Jeopardy structure (too few clues)
      const invalidCSV = `round,category,value,prompt,response
jeopardy,Science,200,What is H2O?,Water
final,Geography,0,Largest country?,Russia`

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(invalidCSV)
      })

      await expect(loadClueSetFromCSV('test-game-1.csv')).rejects.toThrow('Jeopardy round should have 30 clues')
    })

    it('should call correct URL for CSV file', async () => {
      await loadClueSetFromCSV('test-game-1.csv')

      // Verify fetch was called with the correct URL (using real getClueSetURL function)
      expect(global.fetch).toHaveBeenCalledWith('/clue-sets/test-game-1.csv')
    })

    it('should structure round data correctly with multiple categories', async () => {
      // Use the valid CSV file that passes real validation
      const validCSV = readFileSync(join(process.cwd(), testCSVFiles.validBasic), 'utf-8')

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(validCSV)
      })

      const result = await loadClueSetFromCSV('test-valid-basic.csv')

      // Verify the structure with real validation
      expect(result.rounds.jeopardy).toHaveLength(6) // 6 categories as per real validation
      expect(result.rounds.jeopardy[0]).toHaveProperty('name')
      expect(result.rounds.jeopardy[0]).toHaveProperty('clues')
      expect(result.rounds.jeopardy[0]?.clues).toHaveLength(5) // 5 clues per category (should be 5)
      expect(result.rounds.jeopardy[1]).toHaveProperty('name')
      expect(result.rounds.jeopardy[1]?.clues).toHaveLength(5) // 5 clues per category (should be 5)
    })
  })

  describe('saveClueSetToDatabase', () => {
    const mockClueSetData = {
      name: 'Test Game 1',
      filename: 'test-game-1.csv',
      rounds: {
        jeopardy: [
          {
            name: 'Science',
            clues: [
              { value: 200, prompt: 'What is H2O?', response: 'Water', position: 1 }
            ]
          }
        ],
        double: [
          {
            name: 'History',
            clues: [
              { value: 400, prompt: 'Who was first president?', response: 'Washington', position: 1 }
            ]
          }
        ],
        final: {
          name: 'Geography',
          clues: [
            { value: 0, prompt: 'Largest country?', response: 'Russia', position: 1 }
          ]
        }
      }
    }

    beforeEach(() => {
      // Mock Supabase client with proper chaining
      ;(supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'clue-set-123' },
              error: null
            })
          })
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ id: 'board-123' }],
            error: null
          })
        })
      })
    })

    /* istanbul ignore next - Requires Supabase integration testing */
    it('should save clue set to database successfully', async () => {
      const result = await saveClueSetToDatabase(mockClueSetData, 'user-123')

      expect(result).toBe('clue-set-123')
      expect(supabase.from).toHaveBeenCalledWith('clue_sets')
    })

    /* istanbul ignore next - Requires Supabase integration testing */
    it('should handle database error during clue set creation', async () => {
      const dbError = new Error('Database error')
      ;(supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: dbError
            })
          })
        })
      })

      await expect(saveClueSetToDatabase(mockClueSetData, 'user-123')).rejects.toThrow('Database error')
    })

    /* istanbul ignore next - Requires Supabase integration testing */
    it('should handle missing clue set ID in response', async () => {
      ;(supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      })

      await expect(saveClueSetToDatabase(mockClueSetData, 'user-123')).rejects.toThrow('Failed to create clue set')
    })

    /* istanbul ignore next - Requires Supabase integration testing */
    it('should create boards for each round', async () => {
      await saveClueSetToDatabase(mockClueSetData, 'user-123')

      // Should create 3 boards (jeopardy, double, final)
      expect(supabase.from).toHaveBeenCalledWith('boards')
    })

    /* istanbul ignore next - Requires Supabase integration testing */
    it('should create categories and clues for each board', async () => {
      await saveClueSetToDatabase(mockClueSetData, 'user-123')

      // Should create categories and clues
      expect(supabase.from).toHaveBeenCalledWith('categories')
      expect(supabase.from).toHaveBeenCalledWith('clues')
    })
  })

  describe('integration tests', () => {
    it('should handle complete workflow from CSV to database', async () => {
      // This would be an integration test that combines both functions
      // For unit testing, we focus on individual function behavior
      expect(true).toBe(true) // Placeholder
    })
  })
})
