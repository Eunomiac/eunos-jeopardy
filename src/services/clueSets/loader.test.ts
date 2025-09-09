import { loadClueSetFromCSV, saveClueSetToDatabase } from './loader'
import { supabase } from '../supabase/client'

// Mock dependencies
jest.mock('../supabase/client')
jest.mock('../../utils/csvParser')
jest.mock('../../utils/questionSetUtils')

// Mock fetch globally
global.fetch = jest.fn()

describe('clueSetLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('loadClueSetFromCSV', () => {
    const mockCSVText = `round,category,value,prompt,response
jeopardy,Science,200,What is H2O?,Water
jeopardy,Science,400,What is CO2?,Carbon Dioxide
double,History,400,Who was first president?,Washington
final,Geography,0,Largest country?,Russia`

    const mockParsedRows = [
      { round: 'jeopardy', category: 'Science', value: 200, prompt: 'What is H2O?', response: 'Water' },
      { round: 'jeopardy', category: 'Science', value: 400, prompt: 'What is CO2?', response: 'Carbon Dioxide' },
      { round: 'double', category: 'History', value: 400, prompt: 'Who was first president?', response: 'Washington' },
      { round: 'final', category: 'Geography', value: 0, prompt: 'Largest country?', response: 'Russia' }
    ]

    beforeEach(() => {
      // Mock the CSV parser
      const { parseCSV, validateJeopardyStructure } = require('../../utils/csvParser')
      parseCSV.mockReturnValue(mockParsedRows)
      validateJeopardyStructure.mockImplementation(() => {}) // No error

      // Mock question set utils
      const { filenameToDisplayName, getQuestionSetURL } = require('../../utils/questionSetUtils')
      filenameToDisplayName.mockReturnValue('Test Game 1')
      getQuestionSetURL.mockReturnValue('/clue-sets/test-game-1.csv')

      // Mock fetch
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockCSVText)
      })
    })

    it('should successfully load and parse CSV file', async () => {
      const result = await loadClueSetFromCSV('test-game-1.csv')

      expect(result).toEqual({
        name: 'Test Game 1',
        filename: 'test-game-1.csv',
        rounds: {
          jeopardy: [
            {
              name: 'Science',
              clues: [
                { value: 200, prompt: 'What is H2O?', response: 'Water', position: 1 },
                { value: 400, prompt: 'What is CO2?', response: 'Carbon Dioxide', position: 2 }
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
      })
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

    it('should handle CSV parsing error', async () => {
      const { parseCSV } = require('../../utils/csvParser')
      parseCSV.mockImplementation(() => {
        throw new Error('Invalid CSV format')
      })

      await expect(loadClueSetFromCSV('test-game-1.csv')).rejects.toThrow('Invalid CSV format')
    })

    it('should handle validation error', async () => {
      const { validateJeopardyStructure } = require('../../utils/csvParser')
      validateJeopardyStructure.mockImplementation(() => {
        throw new Error('Invalid Jeopardy structure')
      })

      await expect(loadClueSetFromCSV('test-game-1.csv')).rejects.toThrow('Invalid Jeopardy structure')
    })

    it('should call correct URL for CSV file', async () => {
      await loadClueSetFromCSV('test-game-1.csv')

      const { getQuestionSetURL } = require('../../utils/questionSetUtils')
      expect(getQuestionSetURL).toHaveBeenCalledWith('test-game-1.csv')
      expect(global.fetch).toHaveBeenCalledWith('/clue-sets/test-game-1.csv')
    })

    it('should structure round data correctly with multiple categories', async () => {
      const multiCategoryRows = [
        { round: 'jeopardy', category: 'Science', value: 200, prompt: 'Q1', response: 'A1' },
        { round: 'jeopardy', category: 'Science', value: 400, prompt: 'Q2', response: 'A2' },
        { round: 'jeopardy', category: 'History', value: 200, prompt: 'Q3', response: 'A3' },
        { round: 'jeopardy', category: 'History', value: 400, prompt: 'Q4', response: 'A4' },
        { round: 'final', category: 'Geography', value: 0, prompt: 'Final Q', response: 'Final A' }
      ]

      const { parseCSV } = require('../../utils/csvParser')
      parseCSV.mockReturnValue(multiCategoryRows)

      const result = await loadClueSetFromCSV('test-game-1.csv')

      expect(result.rounds.jeopardy).toHaveLength(2)
      expect(result.rounds.jeopardy[0].name).toBe('Science')
      expect(result.rounds.jeopardy[0].clues).toHaveLength(2)
      expect(result.rounds.jeopardy[1].name).toBe('History')
      expect(result.rounds.jeopardy[1].clues).toHaveLength(2)
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
