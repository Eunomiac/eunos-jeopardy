import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { ClueSetService } from '../../services/clueSets/clueSetService'
import './DeleteClueSetButton.scss'

/**
 * Props interface for the DeleteClueSetButton component.
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
interface DeleteClueSetButtonProps {
  /** ID of the clue set to delete */
  readonly clueSetId: string

  /** Name of the clue set for confirmation dialog */
  readonly clueSetName: string

  /** Callback function called after successful deletion */
  readonly onDeleted: () => void

  /** Optional callback for handling errors */
  readonly onError?: (error: string) => void
}

/**
 * Delete Clue Set Button component with confirmation dialog.
 *
 * Provides a red "X" button that appears when a clue set is selected,
 * allowing users to delete their clue sets with proper confirmation
 * and error handling.
 *
 * **Key Features:**
 * - Red "X" button styling for clear delete indication
 * - Confirmation dialog with clue set name
 * - Loading state during deletion process
 * - Error handling and user feedback
 * - Authorization checks (users can only delete their own clue sets)
 *
 * **User Experience:**
 * - Clear visual indication of destructive action
 * - Confirmation dialog prevents accidental deletion
 * - Loading feedback during database operation
 * - Success/error callbacks for parent component integration
 *
 * @param props - Component props containing clue set info and callbacks
 * @returns JSX element representing the delete button
 *
 * @example
 * ```typescript
 * <DeleteClueSetButton
 *   clueSetId="123e4567-e89b-12d3-a456-426614174000"
 *   clueSetName="My Game"
 *   onDeleted={() => refreshClueSetList()}
 *   onError={(error) => showErrorMessage(error)}
 * />
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function DeleteClueSetButton({
  clueSetId,
  clueSetName,
  onDeleted,
  onError
}: Readonly<DeleteClueSetButtonProps>) {
  // Authentication context for user identification
  const { user } = useAuth()

  // State for managing deletion process
  const [isDeleting, setIsDeleting] = useState(false)

  /**
   * Handles the delete button click with pop-up confirmation.
   */
  const handleDeleteClick = async () => {
    if (!user) {
      onError?.('You must be logged in to delete clue sets')
      return
    }

    // Show browser confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${clueSetName}"?\n\nThis action cannot be undone. All clues and categories will be permanently removed.`
    )

    if (!confirmed) {
      return
    }

    // Proceed with deletion
    try {
      setIsDeleting(true)
      const result = await ClueSetService.deleteClueSet(clueSetId, user.id)

      if (result.success) {
        onDeleted()
      } else {
        onError?.(result.error || 'Failed to delete clue set')
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      className="delete-clue-set-button"
      onClick={handleDeleteClick}
      disabled={isDeleting}
      title={`Delete "${clueSetName}"`}
      aria-label={`Delete clue set "${clueSetName}"`}
    >
      {isDeleting ? 'Deleting...' : 'Delete Clue Set'}
    </button>
  )
}
