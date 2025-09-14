import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { GameService, type Game, type Player } from '../../services/games/GameService'
import './GameHostDashboard.scss'

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

  // Effect to manage full-screen layout classes
  useEffect(() => {
    // Add classes for full-screen dashboard layout
    document.body.classList.add('dashboard-active')
    const rootElement = document.getElementById('root')
    if (rootElement) {
      rootElement.classList.add('dashboard-active')
    }

    // Cleanup function to remove classes when component unmounts
    return () => {
      document.body.classList.remove('dashboard-active')
      if (rootElement) {
        rootElement.classList.remove('dashboard-active')
      }
    }
  }, [])

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

  // Main dashboard render: Display full host interface with 6-panel layout
  return (
    <div className="game-host-dashboard">
      {/* Dashboard header with title and navigation */}
      <header className="dashboard-header">
        <div className="d-flex justify-content-between align-items-center">
          <h1 className="jeopardy-logo">Euno's Jeopardy</h1>
          <h1 className="dashboard-title">GAME HOST DASHBOARD</h1>
          <button className="jeopardy-button" onClick={onBackToCreator}>
            Back to Creator
          </button>
        </div>
        <p className="text-muted mb-0">Game ID: {gameId}</p>
      </header>

      {/* User feedback messages for operations */}
      {message && (
        <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-danger'} alert-compact`}>
          {message}
        </div>
      )}



      {/* 4-panel dashboard grid layout */}
      <div className="dashboard-grid">

        {/* Top Row - Panel 2: Game Board Control */}
        <div className="dashboard-panel game-board-panel">
          <div className="panel-header">
            <h5>BOARD CONTROL</h5>
          </div>
          <div className="panel-content">
            <div className="jeopardy-board-container">
              <div className="jeopardy-board">
              {/* Mock category grid for placeholder */}
              <div className="category-grid">
                {['A LONG CATEGORY NAME', 'CATEGORY 2', 'CATEGORY 3', 'CATEGORY 4', 'CATEGORY 5', 'CATEGORY 6'].map((category) => (
                  <div key={category} className="category-header">{category}</div>
                ))}
              </div>
              {/* Mock clue grid */}
              <div className="clue-grid">
                {(() => {
                  // Always focus the fifth clue (index 4), then randomly select 12 of the remaining 29 clues
                  const focusedIndex = 4; // Always the fifth clue
                  const remainingIndices = Array.from({ length: 30 }, (_, i) => i).filter((i) => i !== focusedIndex);
                  const shuffledRemaining = [...remainingIndices].sort(() => Math.random() - 0.5);
                  const revealedIndices = new Set(shuffledRemaining.slice(0, 12));

                  return Array.from({ length: 30 }, (_, index) => {
                    const value = (Math.floor(index / 6) + 1) * 200;
                    const isRevealed = revealedIndices.has(index);
                    const isFocused = index === focusedIndex;
                    const cellClass = `clue-cell ${isRevealed ? 'revealed' : ''} ${isFocused ? 'focused' : ''}`.trim();

                    return (
                      <div key={`clue-${index}-${value}`} className={cellClass}>
                        ${value}
                      </div>
                    )
                  });
                })()}
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Top Row - Panel 1: Player Control */}
        <div className="dashboard-panel player-scores-panel">
          <div className="panel-header">
            <h5>PLAYER CONTROL</h5>
          </div>
          <div className="panel-content">
            {/* Game Status Info - moved from Game Status Panel */}
            <div className="game-status-info">
              <div className="status-row">
                <div className="status-item">
                  <span className="text-uppercase jeopardy-gold">Round:</span>
                  <span className="text-capitalize">{game.current_round}</span>
                </div>
                <div className="status-item">
                  <span className="text-uppercase jeopardy-gold">Status:</span>
                  <span className="text-capitalize">{game.status}</span>
                </div>
                <div className="status-item">
                  <span className="text-uppercase jeopardy-gold">Clues Left:</span>
                  <span>17</span>
                </div>
              </div>
              <div className="round-progress">
                <label htmlFor="round-progress-bar" className="form-label">Round Progress</label>
                <progress
                  id="round-progress-bar"
                  className="progress-bar w-100"
                  value={17/30*100}
                  max={100}
                >
                  0% Complete
                </progress>
              </div>
            </div>

            {players.length === 0 ? (
              <p className="text-muted">No players joined yet</p>
            ) : (
              <div className="player-scores-list">
                {players.map((player, index) => (
                  <div key={player.user_id} className="player-score-item">
                    <div className="player-info">
                      <strong>{player.nickname || `Player ${index + 1}`}</strong>
                      <div className="player-score">${player.score}</div>
                    </div>
                    <small className="join-time">
                      {new Date(player.joined_at).toLocaleTimeString()}
                    </small>
                  </div>
                ))}
              </div>
            )}
            <div className="player-count">
              <small className="text-muted">Total Players: {players.length}</small>
            </div>
            {/* Score Adjustment - moved from Clue Control */}
            <div className="score-adjustment">
              <label className="form-label" htmlFor="score-adjustment-input">Score Adjustment:</label>
              <div className="input-group input-group-sm">
                <input
                  id="score-adjustment-input"
                  type="number"
                  className="form-control"
                  placeholder="Amount"
                  disabled
                />
                <button className="btn btn-outline-secondary" disabled>Apply</button>
              </div>
            </div>
          </div>
        </div>

        {/* Top Row - Panel 2: Buzzer Queue */}
        <div className="dashboard-panel buzzer-queue-panel">
          <div className="panel-header">
            <h5>BUZZER QUEUE</h5>
          </div>
          <div className="panel-content">
            {/* Connection & Latency Status - moved from Buzzer Control Panel */}
            <div className="connection-status">
              <span>Connection Status: <span className="text-success">ACTIVE</span></span>
              <span>Latency Compensation: <span className="text-success">ACTIVE</span></span>
            </div>

            <div className="queue-status">
              <p className="text-muted">No active buzzes</p>
            </div>
            <div className="queue-placeholder">
              <div className="queue-item placeholder">
                <span className="queue-position">1.</span>
                <span className="queue-player">Player Name</span>
                <span className="queue-timing">0 ms</span>
              </div>
              <div className="queue-item placeholder">
                <span className="queue-position">2.</span>
                <span className="queue-player">Player Name</span>
                <span className="queue-timing">+15 ms</span>
              </div>
            </div>
            <button className="jeopardy-button-small" disabled>
                Clear Queue
            </button>
          </div>
        </div>

        {/* Bottom Row - Panel 3: Clue Control */}
        <div className="dashboard-panel clue-control-panel">
          <div className="panel-header">
            <h5>CLUE CONTROL</h5>
          </div>
          <div className="panel-content">
            {/* Focused Clue Display */}
            <div className="focused-clue-display">
              <div className="clue-prompt">
                <div className="form-label">Selected Clue:</div>
                <div className="clue-text">
                  JFK's Brother-In-Law Sargent Shriver was President of this Intl. Sports Program for people with intellectual disabilities
                </div>
              </div>

              {/* Reveal Prompt and Buzzer Control Buttons */}
              <div className="clue-control-buttons">
                <div className="d-flex gap-2 mb-2">
                  <button className="jeopardy-button flex-1">
                    Reveal Prompt
                  </button>
                  <button
                    className={`jeopardy-button flex-1 buzzer-toggle-button ${game.is_buzzer_locked ? 'locked' : 'unlocked'}`}
                    onClick={handleToggleBuzzer}
                  >
                    {game.is_buzzer_locked ? 'Unlock Buzzer' : 'Lock Buzzer'}
                  </button>
                </div>
              </div>

              <div className="clue-response">
                <div className="form-label">Correct Response:</div>
                <div className="response-text">
                  What is the Special Olympics?
                </div>
              </div>
            </div>

            {/* Adjudication Control Buttons */}
            <div className="clue-control-buttons">
              <div className="d-flex gap-2">
                <button className="jeopardy-button flex-1">
                  Mark Correct
                </button>
                <button className="jeopardy-button flex-1">
                  Mark Wrong
                </button>
              </div>
            </div>

            {/* Game Control Buttons - moved from Game Status Panel */}
            <div className="game-control-buttons d-flex gap-2">
              <button
                className="jeopardy-button flex-1"
                disabled
                title="Round progression controls"
              >
                Next Round
              </button>
              <button
                className="jeopardy-button flex-1"
                onClick={handleEndGame}
                disabled={game.status === 'completed'}
              >
                End Game
              </button>
            </div>
          </div>
        </div>


      </div>
    </div>
  )
}
