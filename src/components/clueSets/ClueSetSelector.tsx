import { getAvailableClueSets, filenameToDisplayName } from '../../utils/clueSetUtils'

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
  /** Currently selected clue set filename, empty string if none selected */
  readonly selectedClueSetId: string

  /** Callback function called when user selects a different clue set */
  readonly onClueSetSelected: (clueSetId: string) => void
}

/**
 * Clue Set Selector component for choosing CSV clue sets for Jeopardy games.
 *
 * This component provides a dropdown interface for selecting from available
 * CSV clue set files in the public/clue-sets directory. It handles file
 * discovery, display name formatting, and selection state management.
 *
 * **Key Features:**
 * - Automatic discovery of available CSV clue sets
 * - User-friendly display names from filenames
 * - Controlled component pattern with external state management
 * - Jeopardy-themed styling and branding
 * - Placeholder option for initial state
 *
 * **File Discovery:**
 * - Uses getAvailableClueSets() to find CSV files in public/clue-sets/
 * - Automatically updates when new files are added to the directory
 * - Filters for valid CSV files with proper naming conventions
 *
 * **Display Names:**
 * - Converts filenames to user-friendly display names
 * - Removes file extensions and formats for readability
 * - Example: "sample-game.csv" → "Sample Game"
 *
 * **State Management:**
 * - Controlled component receiving selection state from parent
 * - Calls onClueSetSelected callback when user makes selection
 * - Parent component (App.tsx) manages the selected clue set state
 *
 * **Integration Points:**
 * - Used by App.tsx in the game creation workflow
 * - Selected clue set is used by handleHostGame for game creation
 * - Works with clueSetUtils for file operations
 *
 * **Future Enhancements:**
 * - Could add clue set preview functionality
 * - Could display metadata (number of clues, categories, etc.)
 * - Could support drag-and-drop file upload
 * - Could add clue set validation indicators
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
export function ClueSetSelector({ selectedClueSetId, onClueSetSelected }: Readonly<ClueSetSelectorProps>) {
  // Discover available CSV clue set files from public directory
  /** Array of available clue set filenames from public/clue-sets/ directory */
  const availableFiles = getAvailableClueSets()

  return (
    <div className="clue-set-selector game-creator">
      {/* Section header with Jeopardy styling */}
      <h3 className="jeopardy-category section-title">
        Clue Sets
      </h3>

      <div className="form-group">
        {/* Dropdown selector for available clue sets */}
        <select
          id="clue-set-select"
          className="jeopardy-input jeopardy-dropdown"
          value={selectedClueSetId}
          onChange={(e) => onClueSetSelected(e.target.value)}
        >
          {/* Default placeholder option */}
          <option value="">Choose a Clue Set...</option>

          {/* Dynamic options for each available clue set file */}
          {availableFiles.map((filename) => (
            <option key={filename} value={filename}>
              {/* Convert filename to user-friendly display name */}
              {filenameToDisplayName(filename)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
