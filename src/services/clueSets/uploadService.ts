/**
 * Upload Service for Clue Set File Processing
 *
 * Handles drag-and-drop file uploads, validation, duplicate checking,
 * and integration with the existing CSV parsing pipeline.
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

import { loadClueSetFromFile, saveClueSetToDatabase } from './loader'
import { ClueSetService } from './clueSetService'

/**
 * Result of file upload validation
 */
export interface FileValidationResult {
  /** Whether the file is valid */
  isValid: boolean
  /** Error message if validation failed */
  error?: string
  /** Suggested filename without extension */
  suggestedName?: string
}

/**
 * Result of duplicate name checking
 */
export interface DuplicateCheckResult {
  /** Whether a duplicate name exists */
  isDuplicate: boolean
  /** The existing clue set ID if duplicate */
  existingId?: string
}

/**
 * Options for handling duplicate names
 */
export type DuplicateHandlingOption = 'overwrite' | 'cancel'

/**
 * Result of the complete upload process
 */
export interface UploadResult {
  /** Whether the upload was successful */
  success: boolean
  /** The ID of the created/updated clue set */
  clueSetId?: string
  /** Error message if upload failed */
  error?: string
}

/**
 * Upload Service class for handling clue set file uploads
 */
export class UploadService {
  /**
   * Validates a dropped file for CSV upload.
   *
   * Checks file type, size, and suggests a name based on the filename.
   *
   * @param file - The dropped file to validate
   * @returns Validation result with error details or suggested name
   */
  static validateFile(file: File): FileValidationResult {
    // Check file type
    if (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
      return {
        isValid: false,
        error: 'Please select a CSV file. Only .csv files are supported.'
      }
    }

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File is too large. Please select a file smaller than 10MB.'
      }
    }

    // Check if file is empty
    if (file.size === 0) {
      return {
        isValid: false,
        error: 'File appears to be empty. Please select a valid CSV file.'
      }
    }

    // Generate suggested name from filename
    const suggestedName = file.name
      .replace(/\.csv$/i, '') // Remove .csv extension
      .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    return {
      isValid: true,
      suggestedName: suggestedName || 'Untitled Clue Set'
    }
  }

  /**
   * Checks if a clue set name already exists for the current user.
   *
   * @param name - The clue set name to check
   * @param userId - The current user's ID
   * @returns Promise resolving to duplicate check result
   */
  static async checkDuplicateName(name: string, userId: string): Promise<DuplicateCheckResult> {
    try {
      const userClueSets = await ClueSetService.getUserClueSets(userId)
      const duplicate = userClueSets.find((cs) => cs.name.toLowerCase() === name.toLowerCase())

      return {
        isDuplicate: !!duplicate,
        existingId: duplicate?.id
      }
    } catch (error) {
      console.error('Error checking duplicate name:', error)
      // If we can't check, assume no duplicate to allow upload
      return { isDuplicate: false }
    }
  }

  /**
   * Processes a CSV file upload with duplicate handling.
   *
   * This method orchestrates the complete upload workflow:
   * 1. Creates a temporary file URL for CSV parsing
   * 2. Parses the CSV using existing loader
   * 3. Handles duplicate name conflicts
   * 4. Saves to database or overwrites existing
   *
   * @param file - The CSV file to process
   * @param clueSetName - The name for the clue set
   * @param userId - The current user's ID
   * @param duplicateHandling - How to handle duplicates ('overwrite' or 'cancel')
   * @param existingId - ID of existing clue set if overwriting
   * @returns Promise resolving to upload result
   */
  static async processFileUpload(
    file: File,
    clueSetName: string,
    userId: string,
    duplicateHandling?: DuplicateHandlingOption,
    existingId?: string
  ): Promise<UploadResult> {
    try {
      // Parse the CSV file directly from the File object
      const clueSetData = await loadClueSetFromFile(file, clueSetName)

      // If overwriting, delete the existing clue set first
      if (duplicateHandling === 'overwrite' && existingId) {
        await ClueSetService.deleteClueSet(existingId, userId)
      }

      // Save the new clue set to database
      const clueSetId = await saveClueSetToDatabase(clueSetData, userId, clueSetName)

      return {
        success: true,
        clueSetId
      }
    } catch (error) {
      console.error('Error processing file upload:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process file upload'
      }
    }
  }

  /**
   * Handles the complete drag-and-drop upload workflow.
   *
   * This is the main entry point for drag-and-drop uploads, handling
   * validation, duplicate checking, user prompts, and final upload.
   *
   * @param file - The dropped file
   * @param userId - The current user's ID
   * @param onNamePrompt - Callback to prompt user for clue set name
   * @param onDuplicatePrompt - Callback to prompt user about duplicate handling
   * @returns Promise resolving to upload result
   */
  static async handleDragAndDropUpload(
    file: File,
    userId: string,
    onNamePrompt: (suggestedName: string) => Promise<string | null>,
    onDuplicatePrompt: (existingName: string) => Promise<DuplicateHandlingOption | null>
  ): Promise<UploadResult> {
    // Step 1: Validate the file
    const validation = this.validateFile(file)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      }
    }

    // Step 2: Prompt user for clue set name
    const clueSetName = await onNamePrompt(validation.suggestedName!)
    if (!clueSetName) {
      return {
        success: false,
        error: 'Upload cancelled by user'
      }
    }

    // Step 3: Check for duplicate names
    const duplicateCheck = await this.checkDuplicateName(clueSetName, userId)
    let duplicateHandling: DuplicateHandlingOption | undefined
    let existingId: string | undefined

    if (duplicateCheck.isDuplicate) {
      const userChoice = await onDuplicatePrompt(clueSetName)
      if (!userChoice) {
        return {
          success: false,
          error: 'Upload cancelled by user'
        }
      }
      duplicateHandling = userChoice
      existingId = duplicateCheck.existingId
    }

    // Step 4: Process the upload
    return this.processFileUpload(file, clueSetName, userId, duplicateHandling, existingId)
  }
}
