import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { ClueSetService, type UserClueSet } from '../../services/clueSets/clueSetService'

/**
 * Props interface for the ClueSetSelector component.
 *
 * Defines the required properties for the clue set selection component,
 * including current selection state and change callback.
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
interface ClueSetSelectorProps {
  /** Currently selected clue set ID, empty string if none selected */
  readonly selectedClueSetId: string

  /** Callback function called when user selects a different clue set */
  readonly onClueSetSelected: (clueSetId: string) => void

  /** Optional refresh trigger to reload clue sets (increment to trigger refresh) */
  readonly refreshTrigger?: number
}

/**
 * Database-driven Clue Set Selector component for choosing user-uploaded clue sets.
 *
 * This component provides a dropdown interface for selecting from the user's
 * uploaded clue sets stored in the database. It handles loading, error states,
 * and real-time updates when clue sets are added or removed.
 *
 * **Key Features:**
 * - Database-driven clue set discovery from user's collection
 * - Real-time loading and error state management
 * - User-friendly display names from database records
 * - Controlled component pattern with external state management
 * - Jeopardy-themed styling and branding
 * - Authentication-aware (shows only user's clue sets)
 *
 * **Database Integration:**
 * - Uses ClueSetService to query user's clue sets from database
 * - Automatically updates when user authentication changes
 * - Handles loading states during database queries
 * - Provides error feedback for failed database operations
 *
 * **State Management:**
 * - Controlled component receiving selection state from parent
 * - Calls onClueSetSelected callback when user makes selection
 * - Parent component (App.tsx) manages the selected clue set state
 * - Internal state for loading, error, and clue set data
 *
 * **Integration Points:**
 * - Used by App.tsx in the game creation workflow
 * - Selected clue set ID is used by handleHostGame for game creation
 * - Works with ClueSetService for database operations
 * - Integrates with AuthContext for user identification
 *
 * **User Experience:**
 * - Shows loading message while fetching clue sets
 * - Displays helpful error messages for database failures
 * - Provides appropriate placeholder text when no clue sets exist
 * - Updates automatically when new clue sets are uploaded
 *
 * @param props - Component props containing selection state and callback
 * @returns JSX element representing the clue set selection interface
 *
 * @example
 * ```typescript
 * <ClueSetSelector
 *   selectedClueSetId={selectedClueSetId}
 *   onClueSetSelected={setSelectedClueSetId}
 * />
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function ClueSetSelector({ selectedClueSetId, onClueSetSelected, refreshTrigger }: Readonly<ClueSetSelectorProps>) {
  // Authentication context for user identification
  const { user } = useAuth()

  // State for managing clue sets and loading
  const [clueSets, setClueSets] = useState<UserClueSet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load user's clue sets from database
  useEffect(() => {
    async function loadClueSets() {
      if (!user) {
        setClueSets([])
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const userClueSets = await ClueSetService.getUserClueSets(user.id)
        setClueSets(userClueSets)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load clue sets')
        setClueSets([])
      } finally {
        setIsLoading(false)
      }
    }

    loadClueSets()
  }, [user, refreshTrigger])

  return (
    <div className="clue-set-selector game-creator">
      {/* Section header with Jeopardy styling */}
      <h3 className="jeopardy-category section-title">
        Clue Sets
      </h3>

      <div className="form-group">
        {/* Loading state */}
        {isLoading && (
          <div className="loading-message">
            Loading your clue sets...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="error-message">
            Error: {error}
          </div>
        )}

        {/* Dropdown selector for available clue sets */}
        {!isLoading && !error && (
          <select
            id="clue-set-select"
            className="jeopardy-input jeopardy-dropdown"
            value={selectedClueSetId}
            onChange={(e) => onClueSetSelected(e.target.value)}
          >
            {/* Default placeholder option */}
            <option value="">
              {clueSets.length === 0 ? 'Upload a CSV to get started!' : 'Choose or Upload a Clue Set...'}
            </option>

            {/* Dynamic options for each user clue set */}
            {clueSets.map((clueSet) => (
              <option key={clueSet.id} value={clueSet.id}>
                {clueSet.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
