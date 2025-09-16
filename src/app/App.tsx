import { useState, useEffect, useCallback } from 'react'
import { SimpleLogin } from '../components/auth/SimpleLogin'
import { ClueSetSelector } from '../components/clueSets/ClueSetSelector'
import { ClueSetSummary } from '../components/clueSets/ClueSetSummary'
import { UploadService } from '../services/clueSets/uploadService'
import { GameHostDashboard } from '../components/games/GameHostDashboard'
import { PlayerJoin } from '../components/players/PlayerJoin'
import { PlayerLobby } from '../components/players/PlayerLobby'
import PlayerDashboard from '../components/players/PlayerDashboard'
import { useAuth } from '../contexts/AuthContext'
import { GameService } from '../services/games/GameService'
import { supabase } from '../services/supabase/client'


/**
 * Application mode type defining the current view state of the application.
 *
 * Controls which UI components are displayed and manages both hosting and playing workflows:
 * - 'clue-sets': Initial state for selecting CSV clue sets (host only)
 * - 'host-game': Intermediate state during game creation (currently unused)
 * - 'dashboard': Active game state showing host controls
 * - 'player-join': Player interface for entering game codes
 * - 'player-lobby': Player waiting room after joining a game
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
type AppMode = 'clue-sets' | 'host-game' | 'dashboard' | 'player-join' | 'player-lobby' | 'player-game'

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
 * 1. User selects existing clue set via ClueSetSelector (database-driven)
 * 2. User previews clue set categories via ClueSetSummary
 * 3. User clicks "Host Game" to trigger game creation
 * 4. App creates game using existing clue set from database
 * 5. Navigation switches to GameHostDashboard for live game control
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

  /** UUID of the game the player has joined, null when not in a player session */
  const [playerGameId, setPlayerGameId] = useState<string | null>(null)

  /** Identifier of the selected clue set from database, empty string when none selected */
  const [selectedClueSetId, setSelectedClueSetId] = useState<string>('')

  /** Trigger for refreshing clue set list after uploads/deletions */
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)

  /** Drag-and-drop state for visual feedback */
  const [isDragOver, setIsDragOver] = useState<boolean>(false)

  /** Upload state for showing progress feedback */
  const [isUploading, setIsUploading] = useState<boolean>(false)

  /** Drag counter to prevent flickering on child elements */
  let [dragCounter, setDragCounter] = useState<number>(0)

  /** Current authenticated user from AuthContext */
  const { user } = useAuth()

  /** Whether the current user is a host (has created games) or player */
  const [userRole, setUserRole] = useState<'host' | 'player' | null>(null)

  /** Whether we're still determining the user's role */
  const [roleLoading, setRoleLoading] = useState(false)

  // URL parameter effect removed - no longer needed since we have:
  // 1. Role-based interface detection (players automatically see player interface)
  // 2. Auto-detection of lobby games (no need for game codes in URLs)

  /**
   * Effect to clean up application state when user logs out.
   *
   * Automatically resets all game-related state to prevent data leakage
   * between user sessions and ensures a clean slate for new users.
   *
   * **Cleanup Actions:**
   * - Clears current game ID to exit dashboard mode
   * - Resets selected clue set to force new selection
   * - Clears player game state
   * - Returns to initial clue-sets mode
   */
  useEffect(() => {
    if (!user) {
      setCurrentGameId(null)
      setSelectedClueSetId('')
      setPlayerGameId(null)
      setUserRole(null)
      setRoleLoading(false)
      setMode('clue-sets')
    }
  }, [user])

  /**
   * Gets the user's role from their profile.
   */
  const getUserRole = useCallback(async (): Promise<'host' | 'player'> => {
    if (!user) {
      return 'player'
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('📊 Profile query result:', { profile, error: profileError })

    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError)
      console.log('🎮 Set to player mode (error fallback)')
      return 'player'
    }

    const role = (profile?.role as 'host' | 'player') || 'player'
    console.log('👤 Detected role:', role)
    return role
  }, [user])

  /**
   * Handles setup for player role users.
   */
  const handlePlayerRoleSetup = useCallback(async () => {
    if (!user) {
      return
    }

    try {
      const activeGame = await GameService.getActiveGame()

      if (!activeGame) {
        console.log('🎮 No active game, going to join screen')
        setMode('player-join')
        return
      }

      const players = await GameService.getPlayers(activeGame.id)
      const playerInGame = players.find((p) => p.user_id === user.id)

      if (playerInGame) {
        console.log('🎯 Player already in active game, redirecting to lobby:', activeGame.id)
        setPlayerGameId(activeGame.id)
        setMode(activeGame.status === 'lobby' ? 'player-lobby' : 'player-game')
      } else {
        console.log('🎮 Active game exists but player not joined, going to join screen')
        setMode('player-join')
      }
    } catch (gameError) {
      console.error('❌ Error checking player game status:', gameError)
      setMode('player-join')
    }
  }, [user])

  /**
   * Handles setup for host role users.
   */
  const handleHostRoleSetup = useCallback(async () => {
    try {
      const activeGame = await GameService.getActiveGame()

      if (activeGame) {
        console.log('🎯 Active game found, redirecting to dashboard:', activeGame.id)
        setCurrentGameId(activeGame.id)
        setMode('dashboard')
      } else {
        console.log('🎮 No active game, going to game creation')
        setMode('clue-sets')
      }
    } catch (gameError) {
      console.error('❌ Error checking for active game:', gameError)
      setMode('clue-sets')
    }
  }, [])

  /**
   * Effect to detect user role (host vs player) from the database profile.
   *
   * Fetches the user's role from their profile to determine if they should see
   * the host interface (game creation) or player interface (game joining) by default.
   */
  useEffect(() => {
    const detectUserRole = async () => {
      if (!user) {
        setUserRole(null)
        setRoleLoading(false)
        return
      }

      setRoleLoading(true)
      console.log('🔍 Starting role detection for user:', user.id)

      try {
        const role = await getUserRole()
        setUserRole(role)

        if (role === 'player') {
          await handlePlayerRoleSetup()
        } else {
          await handleHostRoleSetup()
        }
      } catch (roleError) {
        console.error('Error in detectUserRole:', roleError)
        setUserRole('player')
        setMode('player-join')
      } finally {
        setRoleLoading(false)
      }
    }

    detectUserRole()
  }, [user, getUserRole, handlePlayerRoleSetup, handleHostRoleSetup])



  /**
   * Effect to monitor player game state changes.
   *
   * Subscribes to game state changes when a player has joined a game.
   * Automatically transitions between lobby and active game modes based
   * on the game status.
   */
  useEffect(() => {
    if (!playerGameId || !user) {
      return undefined
    }

    // Set up real-time subscription for game state changes
    const subscription = supabase
      .channel(`player-game-state:${playerGameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${playerGameId}`
      }, async (payload) => {
        console.log('Player detected game state change:', payload)

        // Check the new game status
        const newStatus = payload.new?.status

        if (newStatus === 'in_progress' && mode === 'player-lobby') {
          // Game started - transition to player dashboard
          setMode('player-game')
        } else if (newStatus === 'lobby' && mode === 'player-game') {
          // Game returned to lobby - transition back to lobby
          setMode('player-lobby')
        } else if ((newStatus === 'completed' || newStatus === 'cancelled') &&
                   (mode === 'player-lobby' || mode === 'player-game')) {
          // Game ended - return to join screen
          console.log('🎮 Game ended, returning to join screen')
          setPlayerGameId(null)
          setMode('player-join')
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [playerGameId, user, mode])

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
   * Handles successful player game joining.
   *
   * Called when a player successfully joins a game. Transitions to
   * the player lobby interface.
   *
   * @param gameId - UUID of the game the player joined
   */
  const handlePlayerGameJoined = (gameId: string) => {
    setPlayerGameId(gameId)
    setMode('player-lobby')
  }

  /**
   * Handles player leaving a game.
   *
   * Resets player state and returns to the join interface.
   */
  const handlePlayerLeaveGame = () => {
    setPlayerGameId(null)
    setMode('player-join')
  }

  /**
   * Renders the host interface (dashboard or setup modes).
   */
  const renderHostInterface = () => {
    // Only show host interface if user is a host
    if (userRole !== 'host') {
      return null
    }

    if (mode !== 'dashboard' && mode !== 'clue-sets' && mode !== 'host-game') {
      return null
    }

    return (
      <div className={`content-section game-creator-section ${isUploading ? 'uploading' : ''}`}>
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
        {mode !== 'dashboard' && renderSetupMode()}
      </div>
    )
  }

  /**
   * Renders the player interface (join, lobby, or active game modes).
   */
  const renderPlayerInterface = () => {
    console.log('🎮 renderPlayerInterface called:', { userRole, mode })

    // Only show player interface if user is a player
    if (userRole !== 'player') {
      console.log('❌ Not rendering player interface - userRole is not player:', userRole)
      return null
    }

    if (mode === 'player-join') {
      console.log('✅ Rendering PlayerJoin component')
      return (
        <div className="content-section">
          <PlayerJoin
            onGameJoined={handlePlayerGameJoined}
          />
        </div>
      )
    }

    if (mode === 'player-lobby' && playerGameId) {
      return (
        <div className="content-section">
          <PlayerLobby
            gameId={playerGameId}
            onLeaveGame={handlePlayerLeaveGame}
          />
        </div>
      )
    }

    if (mode === 'player-game' && playerGameId) {
      return <PlayerDashboard gameId={playerGameId} />
    }

    console.log('❌ Player interface returning null - no matching mode')
    return null
  }

  /**
   * Renders a loading screen while determining user role.
   */
  const renderRoleLoadingScreen = () => (
    <div className="content-section">
      <div className="role-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <h2>Loading...</h2>
        <p>Determining your interface...</p>
      </div>
    </div>
  )

  /**
   * Handles successful clue set deletion by refreshing the list and clearing selection.
   */
  const handleClueSetDeleted = () => {
    setSelectedClueSetId('')
    setRefreshTrigger((prev) => prev + 1)
  }

  /**
   * Handles clue set operation errors by displaying user feedback.
   */
  const handleClueSetError = (error: string) => {
    console.error('Clue set operation error:', error)
    alert(`Error: ${error}`)
  }

  /**
   * Handles drag enter events for file drop zones.
   * Uses counter to prevent flickering on child elements.
   */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter((prev) => prev + 1)
    if (!isDragOver) {
      setIsDragOver(true)
    }
  }

  /**
   * Handles drag over events to maintain drag state.
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  /**
   * Handles drag leave events to clear drag state.
   * Uses counter to prevent flickering on child elements.
   */
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter((prev) => {
      dragCounter = prev - 1
      if (dragCounter === 0) {
        setIsDragOver(false)
      }
      return dragCounter
    })
  }

  /**
   * Handles file drop events and processes CSV uploads.
   */
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    setDragCounter(0)

    if (!user) {
      alert('You must be logged in to upload clue sets')
      return
    }

    const files = Array.from(e.dataTransfer.files)
    const csvFiles = files.filter((fileItem) => fileItem.name.toLowerCase().endsWith('.csv'))

    if (csvFiles.length === 0) {
      alert('Please drop CSV files only')
      return
    }

    if (csvFiles.length > 1) {
      alert('Please drop one CSV file at a time')
      return
    }

    const file = csvFiles[0]

    try {
      setIsUploading(true)

      // Use UploadService to handle the complete upload workflow with user prompts
      const result = await UploadService.handleDragAndDropUpload(
        file,
        user.id,
        // Name prompt callback
        async (suggestedName: string) => prompt(`Enter a name for this clue set:`, suggestedName),
        // Duplicate handling prompt callback
        async (existingName: string) => {
          const overwrite = confirm(
            `A clue set named "${existingName}" already exists.\n\nClick OK to overwrite it, or Cancel to abort the upload.`
          )
          return overwrite ? 'overwrite' : 'cancel'
        }
      )

      if (result.success) {
        // Select the newly uploaded clue set
        setSelectedClueSetId(result.clueSetId!)
        // Refresh the clue set list
        setRefreshTrigger((prev) => prev + 1)
        // No success dialog - automatic selection makes success clear
      } else {
        handleClueSetError(result.error || 'Upload failed')
      }
    } catch (error) {
      handleClueSetError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
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
      // Create the game instance using the selected clue set ID
      // The clue set already exists in the database from previous upload
      const game = await GameService.createGame(user.id, selectedClueSetId)

      // Navigate to host dashboard
      // Triggers UI transition to game control interface
      handleGameCreated(game.id)
    } catch (error) {
      // Log error for debugging and development
      console.error('Failed to create game:', error)
      // Display user-friendly error notification
      // Future enhancement: Could display toast notification or error modal here
      alert('Failed to create game. Please try again.')
    }
  }

  /**
   * Renders the setup mode content with clue set selection and game creation.
   */
  const renderSetupMode = () => (
    <>
      {/* Drag and drop overlays */}
      {isDragOver && (
        <div className="drag-overlay">
          <div className="drag-message">
            <h3>Drop CSV File Here</h3>
            <p>Release to upload your clue set</p>
          </div>
        </div>
      )}
      {isUploading && (
        <div className="upload-overlay">
          <div className="upload-message">
            <h3>Uploading...</h3>
            <p>Processing your clue set</p>
          </div>
        </div>
      )}

      {/* Clue set selection */}
      <div className="clue-set-selection-row">
        <ClueSetSelector
          selectedClueSetId={selectedClueSetId}
          onClueSetSelected={setSelectedClueSetId}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Clue set summary panel - shows when clue set is selected */}
      {selectedClueSetId && (
        <ClueSetSummary
          clueSetId={selectedClueSetId}
          onDeleted={handleClueSetDeleted}
          onError={handleClueSetError}
        />
      )}

      {/* Game creation controls */}
      <div className="host-game-section">
        <button
          className={`jeopardy-button jeopardy-button-large ${!selectedClueSetId ? 'inactive' : ''}`}
          onClick={handleHostGame}
          disabled={!selectedClueSetId}
        >
          Host Game
        </button>
      </div>

      {/* Drag and drop hint */}
      {!isUploading && (
        <div className="drag-hint">
          <p className="hint-text">
            💡 Drag and drop CSV files here to upload new clue sets
          </p>
        </div>
      )}
    </>
  )

  return (
    <div
      className={`app-container ${isDragOver ? 'drag-active' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="application"
      aria-label="Jeopardy game creation interface with drag and drop file upload"
    >
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
              {/* Debug info */}
              {console.log('🔍 Render state:', { user: !!user, roleLoading, userRole, mode })}

              {/* Show loading screen while determining user role */}
              {roleLoading && renderRoleLoadingScreen()}

              {/* Show appropriate interface once role is determined */}
              {!roleLoading && (
                <>
                  {/* Host interface */}
                  {renderHostInterface()}

                  {/* Player interface */}
                  {renderPlayerInterface()}
                </>
              )}
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
