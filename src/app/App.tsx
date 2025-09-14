import { useState, useEffect } from 'react'
import { SimpleLogin } from '../components/auth/SimpleLogin'
import { ClueSetSelector } from '../components/clueSets/ClueSetSelector'
import { GameHostDashboard } from '../components/games/GameHostDashboard'
import { useAuth } from '../contexts/AuthContext'
import { GameService } from '../services/games/GameService'
import { loadClueSetFromCSV, saveClueSetToDatabase } from '../services/clueSets/loader'

/**
 * Application mode type defining the current view state of the application.
 *
 * Controls which UI components are displayed and manages the game hosting workflow:
 * - 'clue-sets': Initial state for selecting CSV clue sets
 * - 'host-game': Intermediate state during game creation (currently unused)
 * - 'dashboard': Active game state showing host controls
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
type AppMode = 'clue-sets' | 'host-game' | 'dashboard'

/**
 * Main application component that orchestrates the entire Euno's Jeopardy game hosting experience.
 *
 * This component serves as the primary application shell, managing authentication state,
 * navigation between different game hosting phases, and coordinating the complete workflow
 * from clue set selection through active game hosting.
 *
 * **Key Features:**
 * - Authentication-aware UI with automatic state management
 * - Three-phase game hosting workflow (clue selection → game creation → host dashboard)
 * - Automatic state cleanup on user logout
 * - Error handling for game creation failures
 * - Responsive layout with Jeopardy-themed styling
 *
 * **State Management:**
 * - mode: Controls which UI phase is currently displayed
 * - currentGameId: Tracks the active game being hosted
 * - selectedClueSetId: Stores the chosen CSV clue set identifier
 *
 * **Authentication Integration:**
 * - Uses AuthContext for user session management
 * - Automatically resets state when user logs out
 * - Protects game creation behind authentication checks
 *
 * **Game Hosting Workflow:**
 * 1. User selects CSV clue set via ClueSetSelector
 * 2. User clicks "Host Game" to trigger game creation
 * 3. App loads CSV, saves to database, creates game
 * 4. Navigation switches to GameHostDashboard for live game control
 *
 * **Performance Considerations:**
 * - Uses conditional rendering to minimize DOM updates
 * - Implements proper cleanup in useEffect for logout handling
 * - Efficient state updates with minimal re-renders
 *
 * @returns JSX element representing the complete application interface
 *
 * @example
 * ```typescript
 * // App is typically rendered at the root level
 * function Root() {
 *   return (
 *     <AuthProvider>
 *       <App />
 *     </AuthProvider>
 *   );
 * }
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function App() {
  // Application state management
  /** Current UI mode controlling which components are displayed */
  const [mode, setMode] = useState<AppMode>('clue-sets')

  /** UUID of the currently active game being hosted, null when no game is active */
  const [currentGameId, setCurrentGameId] = useState<string | null>(null)

  /** Identifier of the selected CSV clue set file, empty string when none selected */
  const [selectedClueSetId, setSelectedClueSetId] = useState<string>('')

  /** Current authenticated user from AuthContext */
  const { user } = useAuth()

  /**
   * Effect to clean up application state when user logs out.
   *
   * Automatically resets all game-related state to prevent data leakage
   * between user sessions and ensures a clean slate for new users.
   *
   * **Cleanup Actions:**
   * - Clears current game ID to exit dashboard mode
   * - Resets selected clue set to force new selection
   * - Returns to initial clue-sets mode
   */
  useEffect(() => {
    if (!user) {
      setCurrentGameId(null)
      setSelectedClueSetId('')
      setMode('clue-sets')
    }
  }, [user])

  /**
   * Handles successful game creation by transitioning to the host dashboard.
   *
   * Called after the game creation workflow completes successfully.
   * Updates application state to display the GameHostDashboard component
   * with the newly created game ID.
   *
   * @param gameId - UUID of the newly created game
   */
  const handleGameCreated = (gameId: string) => {
    setCurrentGameId(gameId)
    setMode('dashboard')
  }

  /**
   * Handles navigation back to the clue set selection phase.
   *
   * Resets all game-related state and returns the user to the initial
   * clue set selection interface. Used when exiting an active game
   * or canceling the hosting process.
   */
  const handleBackToCreator = () => {
    setCurrentGameId(null)
    setSelectedClueSetId('')
    setMode('clue-sets')
  }

  /**
   * Handles the complete game hosting workflow from clue set selection to game creation.
   *
   * This is the core orchestration function that manages the multi-step process of
   * creating a new Jeopardy game. It coordinates CSV loading, database operations,
   * and game initialization while providing proper error handling.
   *
   * **Workflow Steps:**
   * 1. Validates that a clue set is selected and user is authenticated
   * 2. Loads and parses the selected CSV clue set file
   * 3. Saves the parsed clue set data to the database
   * 4. Creates a new game instance linked to the clue set
   * 5. Transitions to the host dashboard for game control
   *
   * **Error Handling:**
   * - Gracefully handles CSV parsing errors
   * - Manages database operation failures
   * - Logs errors for debugging while preventing app crashes
   * - Future enhancement: Could display user-friendly error messages
   *
   * **Security Considerations:**
   * - Requires authenticated user session
   * - Validates clue set selection before processing
   * - Uses authenticated user ID for database operations
   *
   * **Performance Notes:**
   * - Async operation with proper await handling
   * - Efficient error boundaries to prevent state corruption
   * - Minimal state updates during processing
   */
  const handleHostGame = async () => {
    // Early return if prerequisites not met
    if (!selectedClueSetId || !user) {
      return
    }

    try {
      // Step 1: Load and parse the selected CSV clue set
      // This validates the CSV format and extracts clue data
      const clueSetData = await loadClueSetFromCSV(selectedClueSetId)

      // Step 2: Save the parsed clue set to the database
      // Creates database records and returns the clue set UUID
      const clueSetUuid = await saveClueSetToDatabase(clueSetData, user.id)

      // Step 3: Create the game instance
      // Links the game to the clue set and sets up initial game state
      const game = await GameService.createGame(user.id, clueSetUuid)

      // Step 4: Transition to host dashboard
      handleGameCreated(game.id)
    } catch (error) {
      // Log error for debugging and development
      console.error('Failed to create game:', error)
      // TODO: Add user-friendly error notification UI
      // Could display toast notification or error modal here
    }
  }



  return (
    <div className="app-container">
      {/* Conditional top header with login controls for authenticated users */}
      {user && (
        <header className="app-top-header">
          <SimpleLogin />
        </header>
      )}

      {/* Main application header with Jeopardy branding */}
      <header className="app-header">
        <div className="jeopardy-sur-title">Eunomiac's</div>
        <h1 className="jeopardy-title">Jeopardy!</h1>
      </header>

      <main className="app-main">
        <div className="app-content">
          {/* Authentication gate: Show login form for unauthenticated users */}
          {!user && (
            <div className="content-section">
              <SimpleLogin />
            </div>
          )}

          {/* Main application content for authenticated users */}
          {user && (
            <>
              <div className="content-section game-creator-section">
                {/* Dashboard mode: Show active game host controls */}
                {mode === 'dashboard' && currentGameId && (
                  <>
                    {/* Navigation indicator showing current mode */}
                    <div className="navigation-tabs">
                      <span className="jeopardy-button">
                        Game Dashboard
                      </span>
                    </div>
                    {/* Host dashboard with game controls and back navigation */}
                    <GameHostDashboard
                      gameId={currentGameId}
                      onBackToCreator={handleBackToCreator}
                    />
                  </>
                )}

                {/* Setup mode: Show clue set selection and game creation */}
                {mode !== 'dashboard' && (
                  <>
                    {/* Clue set selection interface */}
                    <ClueSetSelector
                      selectedClueSetId={selectedClueSetId}
                      onClueSetSelected={setSelectedClueSetId}
                    />

                    {/* Game creation trigger with conditional styling */}
                    <div className="host-game-section">
                      <button
                        className={`jeopardy-button jeopardy-button-large ${!selectedClueSetId ? 'inactive' : ''}`}
                        onClick={handleHostGame}
                        disabled={!selectedClueSetId}
                      >
                        Host Game
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Application footer with branding and tech stack info */}
      <footer className="app-footer">
        <p className="jeopardy-category footer-text">
          &copy; 2025 Euno's Jeopardy. Built with React + TypeScript + Vite.
        </p>
      </footer>
    </div>
  )
}
