import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { GameService, type Game, type Player } from '../../services/games/GameService'

/**
 * Props interface for the GameHostDashboard component.
 *
 * Defines the required properties for the host dashboard component,
 * including game identification and navigation callbacks.
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
interface GameHostDashboardProps {
  /** UUID of the game to display and control */
  readonly gameId: string

  /** Callback function to navigate back to the game creation interface */
  readonly onBackToCreator: () => void
}

/**
 * Game Host Dashboard component providing real-time game control and monitoring.
 *
 * This component serves as the primary interface for game hosts to manage active
 * Jeopardy games. It provides comprehensive game controls, player monitoring,
 * and real-time status updates for the hosting experience.
 *
 * **Key Features:**
 * - Real-time game state monitoring and updates
 * - Buzzer system control (lock/unlock functionality)
 * - Player list with scores and join timestamps
 * - Game status and round progression tracking
 * - Host-only operations with proper authorization
 * - Comprehensive error handling and user feedback
 *
 * **State Management:**
 * - game: Current game data including status and settings
 * - players: List of joined players with scores and metadata
 * - loading: Loading state for initial data fetch
 * - message/messageType: User feedback system for operations
 *
 * **Security Features:**
 * - Authentication checks for all operations
 * - Host authorization validation via GameService
 * - Proper error handling for unauthorized access
 * - Confirmation dialogs for destructive actions
 *
 * **Integration Points:**
 * - Uses AuthContext for user session management
 * - Integrates with GameService for all game operations
 * - Provides navigation callback to parent App component
 *
 * **Future Enhancements:**
 * - Game board display with clue selection
 * - Buzzer queue management and ordering
 * - Answer adjudication interface
 * - Advanced scoring and wager management
 * - Round progression controls
 *
 * @param props - Component props containing game ID and navigation callback
 * @returns JSX element representing the host dashboard interface
 *
 * @example
 * ```typescript
 * <GameHostDashboard
 *   gameId="123e4567-e89b-12d3-a456-426614174000"
 *   onBackToCreator={() => setMode('clue-sets')}
 * />
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function GameHostDashboard({ gameId, onBackToCreator }: Readonly<GameHostDashboardProps>) {
  // Authentication and user context
  /** Current authenticated user from AuthContext */
  const { user } = useAuth()

  // Component state management
  /** Current game data including status, settings, and metadata */
  const [game, setGame] = useState<Game | null>(null)

  /** List of players who have joined the game with scores and timestamps */
  const [players, setPlayers] = useState<Player[]>([])

  /** Loading state for initial data fetch and UI feedback */
  const [loading, setLoading] = useState(true)

  /** User feedback message for operations and errors */
  const [message, setMessage] = useState('')

  /** Type of message for appropriate styling (success/error) */
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  /**
   * Effect to load initial game data when component mounts or dependencies change.
   *
   * Fetches both game details and player list from the database, with proper
   * error handling and loading state management. Only executes when both
   * user and gameId are available.
   *
   * **Data Loading Process:**
   * 1. Validates user authentication and game ID presence
   * 2. Sets loading state and clears previous messages
   * 3. Fetches game data with host authorization check
   * 4. Fetches current player list for the game
   * 5. Updates component state with fetched data
   * 6. Handles errors with user-friendly messages
   *
   * **Error Handling:**
   * - Catches and logs all database operation errors
   * - Displays user-friendly error messages
   * - Maintains loading state consistency
   * - Prevents component crashes from network issues
   *
   * **Dependencies:**
   * - user: Re-runs when authentication state changes
   * - gameId: Re-runs when switching between games
   */
  useEffect(() => {
    // Early return if prerequisites not met
    if (!user || !gameId) { return }

    /**
     * Async function to handle the complete data loading process.
     * Separated into its own function to enable proper async/await usage
     * within the useEffect hook.
     */
    const loadGameData = async () => {
      try {
        // Set loading state and clear previous feedback
        setLoading(true)
        setMessage('')
        setMessageType('')

        // Fetch game details with host authorization
        // This validates that the current user is authorized to host this game
        const gameData = await GameService.getGame(gameId, user.id)
        setGame(gameData)

        // Fetch current player list for the game
        // This provides real-time player information for the dashboard
        const playersData = await GameService.getPlayers(gameId)
        setPlayers(playersData)

      } catch (error) {
        // Log error for debugging and development
        console.error('Failed to load game data:', error)

        // Display user-friendly error message
        setMessage(`Failed to load game: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setMessageType('error')
      } finally {
        // Always clear loading state regardless of success/failure
        setLoading(false)
      }
    }

    // Execute the data loading process
    loadGameData()
  }, [user, gameId])

  /**
   * Handles toggling the buzzer lock state for the current game.
   *
   * This is a core host control that manages when players can buzz in to answer
   * questions. The buzzer should be locked during clue reading and unlocked when
   * players are allowed to respond.
   *
   * **Buzzer Control Logic:**
   * - Locked: Players cannot buzz in (default state, clue reading)
   * - Unlocked: Players can buzz in to answer (after clue is fully read)
   *
   * **User Feedback:**
   * - Shows loading message during operation
   * - Displays success message with new state
   * - Shows error message if operation fails
   * - Updates UI immediately with new buzzer state
   *
   * **Security:**
   * - Validates user authentication and game presence
   * - Uses host authorization through GameService
   * - Handles unauthorized access gracefully
   *
   * **Future Enhancement:**
   * - Could add keyboard shortcut (SPACE) for quick toggling
   * - Could integrate with game board clue selection
   */
  const handleToggleBuzzer = async () => {
    // Validate prerequisites
    if (!user || !game) { return }

    try {
      // Provide immediate user feedback
      setMessage('Updating buzzer state...')

      // Toggle buzzer state via GameService
      const updatedGame = await GameService.toggleBuzzerLock(gameId, user.id)

      // Update local state with new game data
      setGame(updatedGame)

      // Show success message with new state
      setMessage(`Buzzer ${updatedGame.is_buzzer_locked ? 'locked' : 'unlocked'}`)
      setMessageType('success')
    } catch (error) {
      // Log error for debugging
      console.error('Failed to toggle buzzer:', error)

      // Display user-friendly error message
      setMessage(`Failed to toggle buzzer: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMessageType('error')
    }
  }

  /**
   * Handles ending the current game with confirmation and cleanup.
   *
   * This is a destructive operation that marks the game as completed and
   * navigates back to the game creation interface. Includes user confirmation
   * to prevent accidental game termination.
   *
   * **End Game Process:**
   * 1. Shows confirmation dialog to prevent accidents
   * 2. Updates game status to 'completed' in database
   * 3. Displays success message to user
   * 4. Automatically navigates back to creator after delay
   *
   * **User Experience:**
   * - Confirmation dialog prevents accidental termination
   * - Loading message during database operation
   * - Success message with automatic navigation
   * - Error handling for failed operations
   *
   * **Navigation:**
   * - 2-second delay allows user to see success message
   * - Calls onBackToCreator callback to return to main interface
   * - Maintains app state consistency
   */
  const handleEndGame = async () => {
    // Validate prerequisites
    if (!user || !game) { return }

    // Confirmation dialog to prevent accidental game termination
    if (!confirm('Are you sure you want to end this game?')) {
      return
    }

    try {
      // Provide immediate user feedback
      setMessage('Ending game...')

      // Update game status to completed
      await GameService.updateGame(gameId, { status: 'completed' }, user.id)

      // Show success message
      setMessage('Game ended successfully')
      setMessageType('success')

      // Navigate back to creator after delay to show success message
      setTimeout(() => {
        onBackToCreator()
      }, 2000)
    } catch (error) {
      // Log error for debugging
      console.error('Failed to end game:', error)

      // Display user-friendly error message
      setMessage(`Failed to end game: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMessageType('error')
    }
  }

  // Authentication guard: Ensure user is logged in
  if (!user) {
    return (
      <div className="game-host-dashboard">
        <p className="text-muted">Please log in to access the game dashboard.</p>
      </div>
    )
  }

  // Loading state: Show loading indicator while fetching data
  if (loading) {
    return (
      <div className="game-host-dashboard">
        <h3>Loading Game...</h3>
        <p className="text-muted">Please wait while we load the game data.</p>
      </div>
    )
  }

  // Error state: Handle case where game data couldn't be loaded
  if (!game) {
    return (
      <div className="game-host-dashboard">
        <h3>Game Not Found</h3>
        <p className="text-muted">The requested game could not be found or you don't have permission to access it.</p>
        <button className="btn btn-secondary" onClick={onBackToCreator}>
          Back to Game Creator
        </button>
      </div>
    )
  }

  // Main dashboard render: Display full host interface
  return (
    <div className="game-host-dashboard">
      {/* Dashboard header with navigation and game identification */}
      <header className="dashboard-header mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <h2>Host Dashboard</h2>
          <button className="btn btn-secondary" onClick={onBackToCreator}>
            Back to Creator
          </button>
        </div>
        <p className="text-muted">Game ID: {gameId}</p>
      </header>

      {/* User feedback messages for operations */}
      {message && (
        <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-danger'} mb-4`}>
          {message}
        </div>
      )}

      <div className="row">
        {/* Left column: Game Controls */}
        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-header">
              <h5>Game Controls</h5>
            </div>
            <div className="card-body">
              {/* Buzzer control section - core host functionality */}
              <div className="mb-3">
                <h6>Buzzer Control</h6>
                {/* Visual indicator of current buzzer state */}
                <div className="d-flex align-items-center mb-2">
                  <span className={`badge ${game.is_buzzer_locked ? 'bg-danger' : 'bg-success'} me-2`}>
                    {game.is_buzzer_locked ? '🔒 LOCKED' : '🔓 UNLOCKED'}
                  </span>
                </div>
                {/* Toggle button with contextual styling */}
                <button
                  className={`btn ${game.is_buzzer_locked ? 'btn-success' : 'btn-warning'}`}
                  onClick={handleToggleBuzzer}
                >
                  {game.is_buzzer_locked ? 'Unlock Buzzer' : 'Lock Buzzer'}
                </button>
                {/* Future enhancement hint for keyboard shortcut */}
                <div className="text-muted mt-2">
                  <small>Press SPACE to toggle</small>
                </div>
              </div>

              {/* Game status information display */}
              <div className="mb-3">
                <h6>Game Status</h6>
                <p className="mb-1">
                  <strong>Status:</strong> <span className="text-capitalize">{game.status}</span>
                </p>
                <p className="mb-1">
                  <strong>Round:</strong> <span className="text-capitalize">{game.current_round}</span>
                </p>
              </div>

              {/* Game termination control */}
              <div className="mb-3">
                <button
                  className="btn btn-danger"
                  onClick={handleEndGame}
                  disabled={game.status === 'completed'}
                >
                  End Game
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Center column: Player List and Management */}
        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-header">
              <h5>Players ({players.length})</h5>
            </div>
            <div className="card-body">
              {/* Empty state when no players have joined */}
              {players.length === 0 ? (
                <p className="text-muted">No players have joined yet.</p>
              ) : (
                /* Player list with scores and join timestamps */
                <div className="player-list">
                  {players.map((player, index) => (
                    <div key={player.user_id} className="player-item mb-2 p-2 border rounded">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>
                            {/* Display nickname or fallback to generic name */}
                            {player.nickname || `Player ${index + 1}`}
                          </strong>
                        </div>
                        <div className="text-end">
                          {/* Current player score display */}
                          <span className="badge bg-primary">
                            ${player.score}
                          </span>
                        </div>
                      </div>
                      {/* Player join timestamp for host reference */}
                      <small className="text-muted">
                        Joined: {new Date(player.joined_at).toLocaleTimeString()}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Game Information and Future Features */}
        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-header">
              <h5>Game Information</h5>
            </div>
            <div className="card-body">
              {/* Game metadata for host reference */}
              <p><strong>Game ID:</strong> {game.id}</p>
              <p><strong>Created:</strong> {new Date(game.created_at).toLocaleString()}</p>
              <p><strong>Host:</strong> {user.email}</p>
              <p><strong>Status:</strong> <span className="text-capitalize">{game.status}</span></p>
              <p><strong>Current Round:</strong> <span className="text-capitalize">{game.current_round}</span></p>

              {/* Future feature roadmap for transparency */}
              <div className="mt-3">
                <h6>Coming Soon:</h6>
                <ul className="text-muted">
                  <li>Game Board Display</li>
                  <li>Buzzer Queue</li>
                  <li>Answer Adjudication</li>
                  <li>Score Management</li>
                  <li>Round Progression</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
