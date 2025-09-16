import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { GameService, type Game, type Player, type Buzz } from '../../services/games/GameService'
import { ClueService, type Clue, type ClueState } from '../../services/clues/ClueService'
import { ClueSetService } from '../../services/clueSets/clueSetService'
import type { ClueSetData, ClueData } from '../../services/clueSets/loader'
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

  /** Complete clue set data for the current game */
  const [clueSetData, setClueSetData] = useState<ClueSetData | null>(null)

  /** List of players who have joined the game with scores and timestamps */
  const [players, setPlayers] = useState<Player[]>([])

  /** Current focused clue data */
  const [focusedClue, setFocusedClue] = useState<Clue | null>(null)

  /** All clue states for the current game */
  const [clueStates, setClueStates] = useState<ClueState[]>([])

  /** Current buzzer queue for the focused clue */
  const [buzzerQueue, setBuzzerQueue] = useState<Buzz[]>([])

  /** Daily Double positions for the current round */
  const [dailyDoublePositions, setDailyDoublePositions] = useState<Array<{category: number, row: number}>>([])

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

        // Fetch complete clue set data for the game board
        // This provides all categories and clues needed for the dashboard
        const loadedClueSetData = await ClueSetService.loadClueSetFromDatabase(gameData.clue_set_id)
        setClueSetData(loadedClueSetData)

        // Fetch current player list for the game
        // This provides real-time player information for the dashboard
        const playersData = await GameService.getPlayers(gameId)
        setPlayers(playersData)

        // Load clue states for the game
        const clueStatesData = await ClueService.getGameClueStates(gameId)
        setClueStates(clueStatesData)

        // Load Daily Double positions for the current round
        const dailyDoubleData = await ClueService.getDailyDoublePositions(gameData.clue_set_id, gameData.current_round)
        setDailyDoublePositions(dailyDoubleData)

        // Load focused clue if one is set
        if (gameData.focused_clue_id) {
          const focusedClueData = await ClueService.getClueById(gameData.focused_clue_id)
          setFocusedClue(focusedClueData)
        } else {
          setFocusedClue(null)
        }

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
   * Loads the current buzzer queue for the focused clue.
   */
  const loadBuzzerQueue = useCallback(async () => {
    if (!focusedClue) {
      setBuzzerQueue([])
      return
    }

    try {
      const buzzes = await GameService.getBuzzesForClue(gameId, focusedClue.id)
      setBuzzerQueue(buzzes)
    } catch (error) {
      console.error('Failed to load buzzer queue:', error)
      setBuzzerQueue([])
    }
  }, [focusedClue, gameId])

  // Load buzzer queue when focused clue changes
  useEffect(() => {
    loadBuzzerQueue()
  }, [loadBuzzerQueue])

  /**
   * Handles clue selection from the game board.
   *
   * Sets the selected clue as the focused clue for the game, which highlights
   * it on both the host dashboard and player interfaces. The clue selection
   * can be changed until the clue is revealed.
   *
   * @param clueId - UUID of the clue to select
   * @param clueData - The clue data for immediate UI updates
   */
  const handleClueSelection = async (clueId: string, clueData: ClueData) => {
    if (!user || !game) { return }

    try {
      setMessage('Selecting clue...')

      // Set focused clue in game state
      const updatedGame = await GameService.setFocusedClue(gameId, clueId, user.id)
      setGame(updatedGame)

      // Get full clue data and set as focused
      const fullClueData = await ClueService.getClueById(clueId)
      setFocusedClue(fullClueData)

      // Check if this is a Daily Double
      const isDailyDouble = await ClueService.isDailyDouble(clueId)

      if (isDailyDouble) {
        setMessage(`🎯 Daily Double selected! Get player's wager before revealing.`)
        setMessageType('success')
      } else {
        setMessage(`Clue selected: ${clueData.prompt.substring(0, 50)}...`)
        setMessageType('success')
      }
    } catch (error) {
      console.error('Failed to select clue:', error)
      setMessage(`Failed to select clue: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMessageType('error')
    }
  }

  /**
   * Handles revealing the focused clue to all players.
   *
   * Marks the clue as revealed in the database and locks the clue selection.
   * After revelation, players can see the clue prompt and the host can unlock
   * the buzzer for player responses.
   */
  const handleRevealClue = async () => {
    if (!user || !game || !focusedClue) { return }

    try {
      setMessage('Revealing clue...')

      // Mark clue as revealed
      await ClueService.revealClue(gameId, focusedClue.id)

      // Update clue states
      const updatedClueStates = await ClueService.getGameClueStates(gameId)
      setClueStates(updatedClueStates)

      setMessage('Clue revealed to all players')
      setMessageType('success')
    } catch (error) {
      console.error('Failed to reveal clue:', error)
      setMessage(`Failed to reveal clue: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMessageType('error')
    }
  }



  /**
   * Handles selecting a player from the buzzer queue.
   *
   * Sets the selected player as the focused player for answer adjudication.
   *
   * @param playerId - UUID of the player to select
   */
  const handlePlayerSelection = async (playerId: string) => {
    if (!user || !game) { return }

    try {
      setMessage('Selecting player...')

      const updatedGame = await GameService.setFocusedPlayer(gameId, playerId, user.id)
      setGame(updatedGame)

      // Find player name for feedback
      const player = players.find((p) => p.user_id === playerId)
      const playerName = player?.nickname || 'Unknown Player'

      setMessage(`Selected player: ${playerName}`)
      setMessageType('success')
    } catch (error) {
      console.error('Failed to select player:', error)
      setMessage(`Failed to select player: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMessageType('error')
    }
  }

  /**
   * Handles marking an answer as correct or incorrect.
   *
   * Completes the adjudication workflow by recording the answer, updating
   * the player's score, and managing clue completion state.
   *
   * @param isCorrect - Whether the player's answer is correct
   */
  const handleAdjudication = async (isCorrect: boolean) => {
    if (!user || !game || !focusedClue || !game.focused_player_id) { return }

    try {
      setMessage(`Marking answer ${isCorrect ? 'correct' : 'incorrect'}...`)

      // For now, use a placeholder response - in a real implementation,
      // this would come from the player's actual response
      const playerResponse = isCorrect ? 'Correct response' : 'Incorrect response'

      // Use clue value for scoring (Daily Double wagers would be handled separately)
      const scoreValue = focusedClue.value

      // Complete adjudication workflow
      const updatedGame = await GameService.adjudicateAnswer(
        gameId,
        focusedClue.id,
        game.focused_player_id,
        playerResponse,
        isCorrect,
        scoreValue,
        user.id
      )

      setGame(updatedGame)

      // If answer was correct, clear focused clue
      if (isCorrect) {
        setFocusedClue(null)
      }

      // Update clue states and player scores
      const [updatedClueStates, updatedPlayers] = await Promise.all([
        ClueService.getGameClueStates(gameId),
        GameService.getPlayers(gameId)
      ])

      setClueStates(updatedClueStates)
      setPlayers(updatedPlayers)

      setMessage(`Answer marked ${isCorrect ? 'correct' : 'incorrect'}, score updated`)
      setMessageType('success')
    } catch (error) {
      console.error('Failed to adjudicate answer:', error)
      setMessage(`Failed to adjudicate answer: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMessageType('error')
    }
  }

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
        <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-danger'} jeopardy-alert`}>
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
              {/* Game board with real clue set data */}
              {clueSetData && game ? (
                <>
                  {/* Category headers from current round */}
                  <div className="category-grid">
                    {(() => {
                      // Handle different round types with proper data structure
                      if (game.current_round === 'final') {
                        // Final jeopardy has single category
                        return (
                          <div key="final-category" className="category-header">
                            {clueSetData.rounds.final.name}
                          </div>
                        )
                      } else {
                        // Regular rounds have array of categories
                        const currentRoundData = clueSetData.rounds[game.current_round] || []
                        return currentRoundData.map((category, index) => (
                          <div key={`category-${index}-${category.name}`} className="category-header">
                            {category.name}
                          </div>
                        ))
                      }
                    })()}
                  </div>

                  {/* Clue grid with real values from current round */}
                  <div className="clue-grid">
                    {(() => {
                      if (game.current_round === 'final') {
                        // Final Jeopardy has only one clue
                        const finalClue = clueSetData.rounds.final.clues?.[0]
                        return finalClue ? (
                          <div className="clue-cell final-jeopardy">
                            Final Jeopardy
                          </div>
                        ) : null
                      }

                      // Regular rounds: create grid of all clues
                      const currentRoundData = clueSetData.rounds[game.current_round] || []
                      const allClues: Array<{categoryIndex: number, clue: ClueData}> = []

                      currentRoundData.forEach((category, categoryIndex) => {
                        category.clues.forEach((clue) => {
                          allClues.push({ categoryIndex, clue })
                        })
                      })

                      // Sort by position to maintain proper board order
                      allClues.sort((a, b) => {
                        if (a.clue.position !== b.clue.position) {
                          return a.clue.position - b.clue.position
                        }
                        return a.categoryIndex - b.categoryIndex
                      })

                      return allClues.map((item, index) => {
                        // Find clue state for this clue using the clue ID
                        const clueState = clueStates.find((state) =>
                          state.clue_id === item.clue.id
                        )

                        const isRevealed = clueState?.revealed || false
                        const isCompleted = clueState?.completed || false
                        const isFocused = focusedClue && focusedClue.id === item.clue.id

                        // Check if this clue is a Daily Double
                        const isDailyDouble = dailyDoublePositions.some((position) =>
                          position.category === (item.categoryIndex + 1) &&
                          position.row === item.clue.position
                        )

                        let cellClass = 'clue-cell'
                        if (isCompleted) {
                          cellClass += ' completed'
                        } else if (isRevealed) {
                          cellClass += ' revealed'
                        }
                        if (isFocused) {
                          cellClass += ' focused'
                        }
                        if (isDailyDouble) {
                          cellClass += ' daily-double'
                        }

                        const handleClick = () => {
                          if (!isCompleted && !isRevealed && item.clue.id) {
                            handleClueSelection(item.clue.id, item.clue)
                          }
                        }



                        const isInteractive = !isCompleted && !isRevealed

                        // Build aria-label without nested ternary
                        let ariaLabel = `Clue for $${item.clue.value}`
                        if (isDailyDouble) {
                          ariaLabel += ' - Daily Double'
                        }
                        if (isCompleted) {
                          ariaLabel += ' - Completed'
                        } else if (isRevealed) {
                          ariaLabel += ' - Revealed'
                        }

                        return (
                          <button
                            key={`clue-${item.clue.id || index}-${item.clue.value}`}
                            type="button"
                            className={cellClass}
                            onClick={handleClick}
                            disabled={!isInteractive}
                            aria-label={ariaLabel}
                            style={{ cursor: isInteractive ? 'pointer' : 'default' }}
                          >
                            ${item.clue.value}
                          </button>
                        )
                      })
                    })()}
                  </div>
                </>
              ) : (
                /* Loading placeholder */
                <>
                  <div className="category-grid">
                    {Array.from({ length: 6 }, (_, i) => (
                      <div key={`loading-category-${i}`} className="category-header">
                        Loading...
                      </div>
                    ))}
                  </div>
                  <div className="clue-grid">
                    {Array.from({ length: 30 }, (_, i) => (
                      <div key={`loading-clue-${i}`} className="clue-cell">
                        ...
                      </div>
                    ))}
                  </div>
                </>
              )}
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
                  <span>{(() => {
                    // Calculate clues left in current round
                    const completedCount = clueStates.filter((state) => state.completed).length
                    const totalClues = game.current_round === 'final' ? 1 : 30 // 6 categories × 5 clues = 30
                    return totalClues - completedCount
                  })()}</span>
                </div>
              </div>
              <div className="round-progress">
                <label htmlFor="round-progress-bar" className="form-label">Round Progress</label>
                <progress
                  id="round-progress-bar"
                  className="progress-bar w-100"
                  value={(() => {
                    const completedCount = clueStates.filter((state) => state.completed).length
                    const totalClues = game.current_round === 'final' ? 1 : 30
                    return totalClues > 0 ? (completedCount / totalClues) * 100 : 0
                  })()}
                  max={100}
                >
                  {(() => {
                    const completedCount = clueStates.filter((state) => state.completed).length
                    const totalClues = game.current_round === 'final' ? 1 : 30
                    return totalClues > 0 ? Math.round((completedCount / totalClues) * 100) : 0
                  })()}% Complete
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

            {buzzerQueue.length === 0 ? (
              <div className="queue-status">
                <p className="text-muted">No active buzzes</p>
              </div>
            ) : (
              <div className="queue-list">
                {buzzerQueue.map((buzz, index) => {
                  const player = players.find((p) => p.user_id === buzz.user_id)
                  const playerName = player?.nickname || 'Unknown Player'
                  const buzzTime = new Date(buzz.created_at)
                  const firstBuzzTime = new Date(buzzerQueue[0].created_at)
                  const timeDiff = buzzTime.getTime() - firstBuzzTime.getTime()



                  // Build timing text without nested template literals
                  const timingText = timeDiff === 0 ? '0 ms' : `+${timeDiff} ms`
                  const ariaLabel = `Select player ${playerName} (position ${index + 1}, ${timingText})`

                  return (
                    <button
                      key={buzz.id}
                      type="button"
                      className={`queue-item ${game?.focused_player_id === buzz.user_id ? 'selected' : ''}`}
                      onClick={() => handlePlayerSelection(buzz.user_id)}
                      aria-label={ariaLabel}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="queue-position">{index + 1}.</span>
                      <span className="queue-player">{playerName}</span>
                      <span className="queue-timing">{timingText}</span>
                    </button>
                  )
                })}
              </div>
            )}
            <button
              className="jeopardy-button-small"
              onClick={() => setBuzzerQueue([])}
              disabled={buzzerQueue.length === 0}
            >
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
              {focusedClue ? (
                <>
                  <div className="clue-prompt">
                    <div className="form-label">Selected Clue (${focusedClue.value}):</div>
                    <div className="clue-text">
                      {focusedClue.prompt}
                    </div>
                  </div>

                  {/* Reveal Prompt and Buzzer Control Buttons */}
                  <div className="clue-control-buttons">
                    <div className="d-flex gap-2 mb-2">
                      <button
                        className="jeopardy-button flex-1"
                        onClick={handleRevealClue}
                        disabled={clueStates.find((state) => state.clue_id === focusedClue.id)?.revealed || false}
                      >
                        {clueStates.find((state) => state.clue_id === focusedClue.id)?.revealed ? 'Clue Revealed' : 'Reveal Prompt'}
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
                      {focusedClue.response}
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-clue-selected">
                  <div className="form-label">No Clue Selected</div>
                  <div className="clue-text text-muted">
                    Click on a clue from the game board to select it for play.
                  </div>
                </div>
              )}
            </div>

            {/* Adjudication Control Buttons */}
            <div className="clue-control-buttons">
              <div className="d-flex gap-2">
                <button
                  className="jeopardy-button flex-1"
                  onClick={() => handleAdjudication(true)}
                  disabled={!focusedClue || !game.focused_player_id}
                >
                  Mark Correct
                </button>
                <button
                  className="jeopardy-button flex-1"
                  onClick={() => handleAdjudication(false)}
                  disabled={!focusedClue || !game.focused_player_id}
                >
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
