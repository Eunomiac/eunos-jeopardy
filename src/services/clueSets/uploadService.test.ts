/**
 * Test suite for UploadService
 *
 * Tests file validation, duplicate checking, and complete upload workflows
 * for drag-and-drop CSV file uploads.
 */

import { UploadService } from './uploadService'
import { ClueSetService } from './clueSetService'
import { loadClueSetFromFile, saveClueSetToDatabase } from './loader'

// Mock dependencies
jest.mock('./clueSetService')
jest.mock('./loader')

const mockClueSetService = ClueSetService as jest.Mocked<typeof ClueSetService>
const mockLoadClueSetFromFile = loadClueSetFromFile as jest.MockedFunction<typeof loadClueSetFromFile>
const mockSaveClueSetToDatabase = saveClueSetToDatabase as jest.MockedFunction<typeof saveClueSetToDatabase>

describe('UploadService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console.error for expected error tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('validateFile', () => {
    it('should validate CSV file successfully', () => {
      const file = new File(['test content'], 'test-game.csv', { type: 'text/csv' })

      const result = UploadService.validateFile(file)

      expect(result.isValid).toBe(true)
      expect(result.suggestedName).toBe('test-game')
      expect(result.error).toBeUndefined()
    })

    it('should validate CSV file with .csv extension but no MIME type', () => {
      const file = new File(['test content'], 'test-game.csv', { type: 'text/plain' })

      const result = UploadService.validateFile(file)

      expect(result.isValid).toBe(true)
      expect(result.suggestedName).toBe('test-game')
    })

    it('should reject non-CSV file by MIME type', () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

      const result = UploadService.validateFile(file)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Please select a CSV file. Only .csv files are supported.')
    })

    it('should reject non-CSV file by extension', () => {
      const file = new File(['test content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      const result = UploadService.validateFile(file)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Please select a CSV file. Only .csv files are supported.')
    })

    it('should reject file that is too large', () => {
      // Create a file larger than 10MB
      const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB
      const file = new File([largeContent], 'large-file.csv', { type: 'text/csv' })

      const result = UploadService.validateFile(file)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('File is too large. Please select a file smaller than 10MB.')
    })

    it('should reject empty file', () => {
      const file = new File([], 'empty.csv', { type: 'text/csv' })

      const result = UploadService.validateFile(file)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('File appears to be empty. Please select a valid CSV file.')
    })

    it('should clean filename for suggested name', () => {
      const file = new File(['content'], 'My Game! @#$%^&*()_+.CSV', { type: 'text/csv' })

      const result = UploadService.validateFile(file)

      expect(result.isValid).toBe(true)
      expect(result.suggestedName).toBe('My Game _')
    })

    it('should handle filename with multiple spaces', () => {
      const file = new File(['content'], 'My    Game    File.csv', { type: 'text/csv' })

      const result = UploadService.validateFile(file)

      expect(result.isValid).toBe(true)
      expect(result.suggestedName).toBe('My Game File')
    })

    it('should provide default name for empty filename', () => {
      const file = new File(['content'], '.csv', { type: 'text/csv' })

      const result = UploadService.validateFile(file)

      expect(result.isValid).toBe(true)
      expect(result.suggestedName).toBe('Untitled Clue Set')
    })

    it('should handle case-insensitive CSV extension', () => {
      const file = new File(['content'], 'test.CSV', { type: 'text/csv' })

      const result = UploadService.validateFile(file)

      expect(result.isValid).toBe(true)
      expect(result.suggestedName).toBe('test')
    })
  })

  describe('checkDuplicateName', () => {
    const mockUserClueSets = [
      { id: 'clue-set-1', name: 'Existing Game', user_id: 'user-123', created_at: '2023-01-01T00:00:00Z', created_by: 'user-123' },
      { id: 'clue-set-2', name: 'Another Game', user_id: 'user-123', created_at: '2023-01-01T00:00:00Z', created_by: 'user-123' }
    ]

    it('should detect duplicate name (case insensitive)', async () => {
      mockClueSetService.getUserClueSets.mockResolvedValue(mockUserClueSets)

      const result = await UploadService.checkDuplicateName('EXISTING GAME', 'user-123')

      expect(result.isDuplicate).toBe(true)
      expect(result.existingId).toBe('clue-set-1')
    })

    it('should return false for non-duplicate name', async () => {
      mockClueSetService.getUserClueSets.mockResolvedValue(mockUserClueSets)

      const result = await UploadService.checkDuplicateName('New Game', 'user-123')

      expect(result.isDuplicate).toBe(false)
      expect(result.existingId).toBeUndefined()
    })

    it('should handle empty clue sets list', async () => {
      mockClueSetService.getUserClueSets.mockResolvedValue([])

      const result = await UploadService.checkDuplicateName('Any Game', 'user-123')

      expect(result.isDuplicate).toBe(false)
      expect(result.existingId).toBeUndefined()
    })

    it('should handle database error gracefully', async () => {
      mockClueSetService.getUserClueSets.mockRejectedValue(new Error('Database error'))

      const result = await UploadService.checkDuplicateName('Test Game', 'user-123')

      expect(result.isDuplicate).toBe(false)
      expect(result.existingId).toBeUndefined()
      expect(console.error).toHaveBeenCalledWith('Error checking duplicate name:', expect.any(Error))
    })
  })

  describe('processFileUpload', () => {
    const mockFile = new File(['csv content'], 'test.csv', { type: 'text/csv' })
    const mockClueSetData = {
      name: 'Test Game',
      rounds: {
        jeopardy: [],
        double: [],
        final: { name: 'Final Jeopardy', clues: [] }
      },
      filename: 'test.csv'
    }

    it('should process file upload successfully', async () => {
      mockLoadClueSetFromFile.mockResolvedValue(mockClueSetData)
      mockSaveClueSetToDatabase.mockResolvedValue('new-clue-set-id')

      const result = await UploadService.processFileUpload(mockFile, 'Test Game', 'user-123')

      expect(result.success).toBe(true)
      expect(result.clueSetId).toBe('new-clue-set-id')
      expect(result.error).toBeUndefined()
      expect(mockLoadClueSetFromFile).toHaveBeenCalledWith(mockFile, 'Test Game')
      expect(mockSaveClueSetToDatabase).toHaveBeenCalledWith(mockClueSetData, 'user-123', 'Test Game')
    })

    it('should handle overwrite scenario', async () => {
      mockLoadClueSetFromFile.mockResolvedValue(mockClueSetData)
      mockSaveClueSetToDatabase.mockResolvedValue('new-clue-set-id')
      mockClueSetService.deleteClueSet.mockResolvedValue({ success: true })

      const result = await UploadService.processFileUpload(
        mockFile,
        'Test Game',
        'user-123',
        'overwrite',
        'existing-id'
      )

      expect(result.success).toBe(true)
      expect(result.clueSetId).toBe('new-clue-set-id')
      expect(mockClueSetService.deleteClueSet).toHaveBeenCalledWith('existing-id', 'user-123')
    })

    it('should not delete when not overwriting', async () => {
      mockLoadClueSetFromFile.mockResolvedValue(mockClueSetData)
      mockSaveClueSetToDatabase.mockResolvedValue('new-clue-set-id')

      const result = await UploadService.processFileUpload(
        mockFile,
        'Test Game',
        'user-123',
        'cancel'
      )

      expect(result.success).toBe(true)
      expect(mockClueSetService.deleteClueSet).not.toHaveBeenCalled()
    })

    it('should handle CSV parsing error', async () => {
      mockLoadClueSetFromFile.mockRejectedValue(new Error('Invalid CSV format'))

      const result = await UploadService.processFileUpload(mockFile, 'Test Game', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid CSV format')
      expect(result.clueSetId).toBeUndefined()
    })

    it('should handle database save error', async () => {
      mockLoadClueSetFromFile.mockResolvedValue(mockClueSetData)
      mockSaveClueSetToDatabase.mockRejectedValue(new Error('Database save failed'))

      const result = await UploadService.processFileUpload(mockFile, 'Test Game', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database save failed')
    })

    it('should handle non-Error exceptions', async () => {
      mockLoadClueSetFromFile.mockRejectedValue('String error')

      const result = await UploadService.processFileUpload(mockFile, 'Test Game', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to process file upload')
    })
  })

  describe('handleDragAndDropUpload', () => {
    const mockFile = new File(['csv content'], 'test-game.csv', { type: 'text/csv' })
    const mockClueSetData = {
      name: 'Test Game',
      rounds: {
        jeopardy: [],
        double: [],
        final: { name: 'Final Jeopardy', clues: [] }
      },
      filename: 'test.csv'
    }
    const mockOnNamePrompt = jest.fn()
    const mockOnDuplicatePrompt = jest.fn()

    beforeEach(() => {
      mockOnNamePrompt.mockClear()
      mockOnDuplicatePrompt.mockClear()
    })

    it('should complete full upload workflow successfully', async () => {
      // Setup mocks
      mockOnNamePrompt.mockResolvedValue('My Test Game')
      mockClueSetService.getUserClueSets.mockResolvedValue([])
      mockLoadClueSetFromFile.mockResolvedValue(mockClueSetData)
      mockSaveClueSetToDatabase.mockResolvedValue('new-clue-set-id')

      const result = await UploadService.handleDragAndDropUpload(
        mockFile,
        'user-123',
        mockOnNamePrompt,
        mockOnDuplicatePrompt
      )

      expect(result.success).toBe(true)
      expect(result.clueSetId).toBe('new-clue-set-id')
      expect(mockOnNamePrompt).toHaveBeenCalledWith('test-game')
      expect(mockOnDuplicatePrompt).not.toHaveBeenCalled()
    })

    it('should handle file validation failure', async () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })

      const result = await UploadService.handleDragAndDropUpload(
        invalidFile,
        'user-123',
        mockOnNamePrompt,
        mockOnDuplicatePrompt
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Please select a CSV file. Only .csv files are supported.')
      expect(mockOnNamePrompt).not.toHaveBeenCalled()
      expect(mockOnDuplicatePrompt).not.toHaveBeenCalled()
    })

    it('should handle user cancelling name prompt', async () => {
      mockOnNamePrompt.mockResolvedValue(null)

      const result = await UploadService.handleDragAndDropUpload(
        mockFile,
        'user-123',
        mockOnNamePrompt,
        mockOnDuplicatePrompt
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upload cancelled by user')
      expect(mockOnNamePrompt).toHaveBeenCalledWith('test-game')
      expect(mockOnDuplicatePrompt).not.toHaveBeenCalled()
    })

    it('should handle duplicate name with overwrite choice', async () => {
      // Setup mocks
      mockOnNamePrompt.mockResolvedValue('Existing Game')
      mockClueSetService.getUserClueSets.mockResolvedValue([
        { id: 'existing-id', name: 'Existing Game', created_at: '2023-01-01T00:00:00Z', created_by: 'user-123' }
      ])
      mockOnDuplicatePrompt.mockResolvedValue('overwrite')
      mockClueSetService.deleteClueSet.mockResolvedValue({ success: true })
      mockLoadClueSetFromFile.mockResolvedValue(mockClueSetData)
      mockSaveClueSetToDatabase.mockResolvedValue('new-clue-set-id')

      const result = await UploadService.handleDragAndDropUpload(
        mockFile,
        'user-123',
        mockOnNamePrompt,
        mockOnDuplicatePrompt
      )

      expect(result.success).toBe(true)
      expect(result.clueSetId).toBe('new-clue-set-id')
      expect(mockOnDuplicatePrompt).toHaveBeenCalledWith('Existing Game')
      expect(mockClueSetService.deleteClueSet).toHaveBeenCalledWith('existing-id', 'user-123')
    })

    it('should handle duplicate name with cancel choice', async () => {
      // Setup mocks
      mockOnNamePrompt.mockResolvedValue('Existing Game')
      mockClueSetService.getUserClueSets.mockResolvedValue([
        { id: 'existing-id', name: 'Existing Game', created_at: '2023-01-01T00:00:00Z', created_by: 'user-123' }
      ])
      mockOnDuplicatePrompt.mockResolvedValue(null)

      const result = await UploadService.handleDragAndDropUpload(
        mockFile,
        'user-123',
        mockOnNamePrompt,
        mockOnDuplicatePrompt
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upload cancelled by user')
      expect(mockOnDuplicatePrompt).toHaveBeenCalledWith('Existing Game')
      expect(mockLoadClueSetFromFile).not.toHaveBeenCalled()
    })

    it('should handle duplicate name with cancel option', async () => {
      // Setup mocks
      mockOnNamePrompt.mockResolvedValue('Existing Game')
      mockClueSetService.getUserClueSets.mockResolvedValue([
        { id: 'existing-id', name: 'Existing Game', created_at: '2023-01-01T00:00:00Z', created_by: 'user-123' }
      ])
      mockOnDuplicatePrompt.mockResolvedValue('cancel')
      mockLoadClueSetFromFile.mockResolvedValue(mockClueSetData)
      mockSaveClueSetToDatabase.mockResolvedValue('new-clue-set-id')

      const result = await UploadService.handleDragAndDropUpload(
        mockFile,
        'user-123',
        mockOnNamePrompt,
        mockOnDuplicatePrompt
      )

      expect(result.success).toBe(true)
      expect(result.clueSetId).toBe('new-clue-set-id')
      expect(mockOnDuplicatePrompt).toHaveBeenCalledWith('Existing Game')
      // Should not delete when cancelling
      expect(mockClueSetService.deleteClueSet).not.toHaveBeenCalled()
    })

    it('should handle upload processing error', async () => {
      // Setup mocks
      mockOnNamePrompt.mockResolvedValue('Test Game')
      mockClueSetService.getUserClueSets.mockResolvedValue([])
      mockLoadClueSetFromFile.mockRejectedValue(new Error('CSV parsing failed'))

      const result = await UploadService.handleDragAndDropUpload(
        mockFile,
        'user-123',
        mockOnNamePrompt,
        mockOnDuplicatePrompt
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('CSV parsing failed')
    })

    it('should handle empty filename gracefully', async () => {
      const fileWithEmptyName = new File(['content'], '.csv', { type: 'text/csv' })
      mockOnNamePrompt.mockResolvedValue('Custom Name')
      mockClueSetService.getUserClueSets.mockResolvedValue([])
      mockLoadClueSetFromFile.mockResolvedValue(mockClueSetData)
      mockSaveClueSetToDatabase.mockResolvedValue('new-clue-set-id')

      const result = await UploadService.handleDragAndDropUpload(
        fileWithEmptyName,
        'user-123',
        mockOnNamePrompt,
        mockOnDuplicatePrompt
      )

      expect(result.success).toBe(true)
      expect(mockOnNamePrompt).toHaveBeenCalledWith('Untitled Clue Set')
    })
  })
})
