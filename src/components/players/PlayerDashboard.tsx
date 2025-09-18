import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { GameService } from '../../services/games/GameService'
import { FontAssignmentService } from '../../services/fonts/FontAssignmentService'
import { PlayerPodiums, type PlayerInfo } from './PlayerPodiums'
import { ClueRevealModal, type ClueInfo } from './ClueRevealModal'
import { BuzzerState } from '../../types/BuzzerState'
import { supabase } from '../../services/supabase/client'
import type { ClueState } from '../../services/clues/ClueService'

import type { ClueData, ClueSetData } from '../../services/clueSets/loader'
import './PlayerDashboard.scss'

interface PlayerDashboardProps {
  gameId: string
}

/**
 * Game update payload from real-time subscriptions.
 */
interface GameUpdatePayload {
  is_buzzer_locked?: boolean
  focused_clue_id?: string | null
  [key: string]: unknown
}

/**
 * Buzz payload from real-time subscriptions.
 */
interface BuzzPayload {
  user_id: string
  game_id: string
  clue_id: string
  created_at: string
}

/**
 * PlayerDashboard Component
 *
 * Main dashboard interface for players during a Jeopardy game.
 *
 * **Features:**
 * - Real-time game board display
 * - Player podiums with handwritten fonts
 * - Integrated buzzer system with client-side timing
 * - Clue reveal modal with buzzer integration
 * - Real-time subscriptions for game state updates
 *
 * **Client-Side Timing:**
 * - Records unlock timestamp when buzzer becomes available
 * - Calculates reaction time locally for fairness
 * - Sends timing data via real-time subscriptions
 *
 * **Font Management:**
 * - Assigns handwritten fonts on game join
 * - Handles font conflicts with temporary overrides
 * - Clears temporary fonts when game ends
 *
 * @param props - Component props
 * @returns PlayerDashboard component
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
const PlayerDashboard: React.FC<PlayerDashboardProps> = ({ gameId }) => {
  const { user } = useAuth()

  // Game state
  const [game, setGame] = useState<GameUpdatePayload | null>(null)
  const [players, setPlayers] = useState<PlayerInfo[]>([])
  const [currentClue, setCurrentClue] = useState<ClueInfo | null>(null)
  const [focusedClue, setFocusedClue] = useState<ClueInfo | null>(null)
  const [buzzerState, setBuzzerState] = useState<BuzzerState>(BuzzerState.LOCKED)
  const [reactionTime, setReactionTime] = useState<number | null>(null)

  // Game board data
  const [clueSetData, setClueSetData] = useState<ClueSetData | null>(null)
  const [clueStates, setClueStates] = useState<ClueState[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showClueModal, setShowClueModal] = useState(false)
  const [modalAnimatingOut, setModalAnimatingOut] = useState(false)

  // Buzzer timing
  const [buzzerUnlockTime, setBuzzerUnlockTime] = useState<number | null>(null)

  /**
   * Loads initial game data and player information.
   */
  const loadGameData = useCallback(async () => {
    if (!user) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Load game data - set a basic game state that will be updated by real-time subscriptions
      setGame({
        id: gameId,
        status: 'in_progress',
        current_round: 'jeopardy',
        is_buzzer_locked: true,
        focused_clue_id: null,
        focused_player_id: null
      } as GameUpdatePayload)

      // Load players
      const gamePlayers = await GameService.getPlayers(gameId)

      // Assign fonts and create player info
      const playersWithFonts = await Promise.all(
        gamePlayers.map(async (player) => {
          let font: string

          if (player.user_id === user.id) {
            // Get or assign font for current user
            font = await FontAssignmentService.getPlayerFont(user.id, gameId)
          } else {
            // For other players, get their assigned font from profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('handwritten_font, temp_handwritten_font')
              .eq('id', player.user_id)
              .single()

            font = profile?.temp_handwritten_font || profile?.handwritten_font || 'handwritten-1'
          }

          return {
            id: player.user_id, // Use user_id as the unique identifier
            name: player.nickname || 'Player',
            score: player.score,
            fontFamily: font,
            isMainPlayer: player.user_id === user.id
          }
        })
      )

      setPlayers(playersWithFonts)

    } catch (err) {
      console.error('❌ Error loading game data:', err)
      setError('Failed to load game data. Please try refreshing.')
    } finally {
      setLoading(false)
    }
  }, [gameId, user])

  /**
   * Loads game board data for players.
   * Gets actual category names and clue data from the database.
   */
  const loadGameBoardData = useCallback(async () => {
    try {
      // Load clue states to show board progress
      const { data: states, error: statesError } = await supabase
        .from('clue_states')
        .select('*')
        .eq('game_id', gameId)

      if (statesError) {
        throw statesError
      }
      setClueStates(states || [])

      // Load boards and categories for the game's clue set
      // First get the game to find the clue set ID
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('clue_set_id')
        .eq('id', gameId)
        .single()

      if (gameError) {
        throw gameError
      }

      if (!gameData?.clue_set_id) {
        throw new Error('Game does not have a clue set assigned')
      }

      // Load boards for this clue set
      const { data: boards, error: boardsError } = await supabase
        .from('boards')
        .select(`
          id,
          round,
          categories (
            id,
            name,
            position,
            clues (
              id,
              prompt,
              response,
              value,
              position
            )
          )
        `)
        .eq('clue_set_id', gameData.clue_set_id)
        .order('round')

      if (boardsError) {
        throw boardsError
      }

      // Transform boards into clue set structure
      const jeopardyBoard = boards?.find((board) => board.round === 'jeopardy')
      const doubleBoard = boards?.find((board) => board.round === 'double')
      const finalBoard = boards?.find((board) => board.round === 'final')

      setClueSetData({
        name: 'Game Board', // Players don't need the actual clue set name
        filename: 'game-board.csv', // Players don't need the actual filename
        rounds: {
          jeopardy: jeopardyBoard?.categories?.sort((a, b) => a.position - b.position).map((cat) => ({
            name: cat.name,
            clues: (cat.clues || []).sort((a, b) => (a.position || 0) - (b.position || 0))
          })) || [],
          double: doubleBoard?.categories?.sort((a, b) => a.position - b.position).map((cat) => ({
            name: cat.name,
            clues: (cat.clues || []).sort((a, b) => (a.position || 0) - (b.position || 0))
          })) || [],
          final: finalBoard?.categories?.[0] ? {
            name: finalBoard.categories[0].name,
            clues: (finalBoard.categories[0].clues || []).sort((a, b) => (a.position || 0) - (b.position || 0))
          } : { name: 'Final Jeopardy', clues: [] }
        }
      })

      // Players don't need Daily Double positions - they discover them when clues are revealed

    } catch (loadError) {
      console.error('Failed to load game board data:', loadError)
      setError('Failed to load game data')
    }
  }, [gameId])

  /**
   * Loads clue data for display in the modal.
   */
  const loadClueData = useCallback(async (clueId: string): Promise<ClueInfo | null> => {
    try {
      const { ClueService } = await import('../../services/clues/ClueService')
      const clue = await ClueService.getClueById(clueId)

      // Get category name from category_id
      const { data: category } = await supabase
        .from('categories')
        .select('name')
        .eq('id', clue.category_id)
        .single()

      const clueInfo: ClueInfo = {
        id: clue.id,
        prompt: clue.prompt,
        value: clue.value,
        category: category?.name || 'Unknown Category',
        isDailyDouble: false // Players discover Daily Doubles when they encounter them
      }

      setCurrentClue(clueInfo)
      return clueInfo
    } catch (clueError) {
      console.error('Failed to load clue:', clueError)
      setCurrentClue(null)
      return null
    }
  }, [])

  // Helper function to update clue states
  const updateClueState = useCallback((clueState: ClueState) => {
    setClueStates((prev) => {
      const updated = prev.filter((s) => s.clue_id !== clueState.clue_id)
      return [...updated, clueState]
    })
  }, [])

  /**
   * Sets up real-time subscriptions for game state updates.
   */
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!user) {
      return undefined
    }

    // Subscribe to game state changes
    const gameSubscription = supabase
      .channel(`game-${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      }, async (payload) => {
        console.log('🔔 Game state update:', payload)
        // Update game data based on changes
        if (payload.new) {
          const gameUpdate = payload.new as GameUpdatePayload
          setGame(gameUpdate)

          // Update buzzer state based on game state (but not during modal animation)
          if (!modalAnimatingOut) {
            if (gameUpdate.is_buzzer_locked) {
              setBuzzerState(BuzzerState.LOCKED)
              setBuzzerUnlockTime(null)
              setReactionTime(null)
            } else {
              setBuzzerState(BuzzerState.UNLOCKED)
              setBuzzerUnlockTime(Date.now()) // Record when buzzer was unlocked
            }
          }

          // Handle focused clue (just highlight on board, don't show modal)
          if (gameUpdate.focused_clue_id) {
            const clueInfo = await loadClueData(gameUpdate.focused_clue_id)
            setFocusedClue(clueInfo)
            // Note: Modal will only show when clue becomes revealed (via clue states subscription)
          } else {
            setFocusedClue(null)
            // Hide modal when clue is unfocused
            setShowClueModal(false)
            setCurrentClue(null)
            setBuzzerState(BuzzerState.LOCKED)
            setReactionTime(null)
          }

          // Handle player selection - hide modal when host selects a player from buzzer queue
          if (gameUpdate.focused_player_id) {
            // Host has selected a player for adjudication - start modal animation
            setModalAnimatingOut(true)
            setShowClueModal(false)

            // Delay buzzer state changes until modal animation completes (300ms)
            setTimeout(() => {
              setModalAnimatingOut(false)
            }, 300)
          } else if (gameUpdate.focused_clue_id && !gameUpdate.is_buzzer_locked && focusedClue) {
            // Player was marked wrong: focused_player_id is null, buzzer unlocked, clue still active
            // Check if current player is locked out before showing modal
            checkPlayerLockoutAndShowModal(gameUpdate.focused_clue_id, focusedClue)
          }
        }
      })
      .subscribe()

    // Subscribe to player changes
    const playersSubscription = supabase
      .channel(`players-${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `game_id=eq.${gameId}`
      }, async () => {
        console.log('🔔 Players update')
        // Update player data incrementally without full reload
        try {
          const gamePlayers = await GameService.getPlayers(gameId)
          const playersWithFonts = await Promise.all(
            gamePlayers.map(async (player) => {
              let font: string

              if (player.user_id === user.id) {
                font = await FontAssignmentService.getPlayerFont(user.id, gameId)
              } else {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('handwritten_font, temp_handwritten_font')
                  .eq('id', player.user_id)
                  .single()
                font = profile?.temp_handwritten_font || profile?.handwritten_font || 'handwritten-1'
              }

              return {
                id: player.user_id,
                name: player.nickname || 'Player',
                score: player.score,
                fontFamily: font,
                isMainPlayer: player.user_id === user.id
              }
            })
          )
          setPlayers(playersWithFonts)
        } catch (playerError) {
          console.error('Failed to update player data:', playerError)
        }
      })
      .subscribe()

    // Subscribe to clue state changes (for board display updates)
    const clueStatesSubscription = supabase
      .channel(`clue-states-${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'clue_states',
        filter: `game_id=eq.${gameId}`
      }, (payload) => {
        console.log('🔔 Clue state update:', payload)
        if (payload.new) {
          const clueState = payload.new as ClueState
          // Update clue states for board display
          updateClueState(clueState)

          // Show modal when clue is revealed and it's the focused clue (Reveal Prompt action)
          if (clueState.revealed && focusedClue && clueState.clue_id === focusedClue.id) {
            setCurrentClue(focusedClue)
            setShowClueModal(true)
            setBuzzerState(BuzzerState.LOCKED) // Lock buzzer when clue is revealed
          }

          // Hide modal and lock buzzer when clue is completed
          if (clueState.completed) {
            setShowClueModal(false)
            setCurrentClue(null)
            setBuzzerState(BuzzerState.LOCKED)
            setReactionTime(null)
          }
        }
      })
      .subscribe()

    // Subscribe to buzzer events
    const buzzesSubscription = supabase
      .channel(`buzzes-${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'buzzes',
        filter: `game_id=eq.${gameId}`
      }, (payload) => {
        console.log('🔔 Buzz event:', payload)
        // Handle buzzer state changes based on buzz events
        if (payload.new && (payload.new as BuzzPayload).user_id === user?.id) {
          // This player's buzz was recorded
          setBuzzerState(BuzzerState.BUZZED)
        }
      })
      .subscribe()

    // Subscribe to clue changes (for locked_out_player_ids updates)
    const cluesSubscription = supabase
      .channel(`clues-${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'clues'
      }, (payload) => {
        console.log('🔔 Clue lockout update:', payload)
        if (payload.new && user?.id) {
          const clueData = payload.new as any
          const lockedOutPlayers = clueData.locked_out_player_ids || []

          // If current player was just locked out and modal is showing, hide it
          if (lockedOutPlayers.includes(user.id) && showClueModal && focusedClue && clueData.id === focusedClue.id) {
            console.log('🚫 Current player locked out - hiding modal')
            setShowClueModal(false)
            setCurrentClue(null)
            setBuzzerState(BuzzerState.LOCKED)
            setReactionTime(null)
          }
        }
      })
      .subscribe()

    return () => {
      gameSubscription.unsubscribe()
      playersSubscription.unsubscribe()
      clueStatesSubscription.unsubscribe()
      buzzesSubscription.unsubscribe()
      cluesSubscription.unsubscribe()
    }
  }, [gameId, user, loadClueData, focusedClue, modalAnimatingOut, updateClueState])

  /**
   * Handles player buzzer click.
   */
  const handleBuzz = useCallback(async () => {
    if (buzzerState === BuzzerState.UNLOCKED && user && currentClue) {
      // Record buzz timestamp for client-side timing (will be implemented later)
      setBuzzerState(BuzzerState.BUZZED)

      try {
        // Calculate reaction time using client-side timing
        let reactionTimeMs: number | undefined
        if (buzzerUnlockTime) {
          reactionTimeMs = Date.now() - buzzerUnlockTime
          setReactionTime(reactionTimeMs)
          console.log(`⏱️ Reaction time: ${reactionTimeMs}ms`)
        }

        // Send buzz event to server with reaction time
        await GameService.recordBuzz(gameId, currentClue.id, user.id, reactionTimeMs)

        console.log('⚡ Player buzzed in successfully!')

      } catch (buzzError) {
        console.error('Failed to record buzz:', buzzError)
        // Reset buzzer state on error
        setBuzzerState(BuzzerState.UNLOCKED)
      }
    } else if (buzzerState === BuzzerState.LOCKED) {
      // Player buzzed too early - set frozen state
      setBuzzerState(BuzzerState.FROZEN)
      console.log('❄️ Player buzzed too early - frozen!')
    }
  }, [buzzerState, user, currentClue, gameId, buzzerUnlockTime])

  /**
   * Checks if current player is locked out and shows modal if they can still buzz.
   */
  const checkPlayerLockoutAndShowModal = useCallback(async (clueId: string, clueInfo: ClueInfo) => {
    if (!user?.id) return

    try {
      // Get the clue data to check locked_out_player_ids
      const { data: clueData, error } = await supabase
        .from('clues')
        .select('locked_out_player_ids')
        .eq('id', clueId)
        .single()

      if (error) {
        console.error('Failed to check player lockout status:', error)
        return
      }

      const lockedOutPlayers = clueData.locked_out_player_ids || []
      const isPlayerLockedOut = lockedOutPlayers.includes(user.id)

      if (!isPlayerLockedOut) {
        // Player can still buzz - show modal
        console.log('🔄 Re-showing modal for remaining player after wrong answer')
        setCurrentClue(clueInfo)
        setShowClueModal(true)
        setBuzzerState(BuzzerState.UNLOCKED) // Buzzer should be unlocked for remaining players
      } else {
        // Player is locked out - keep modal hidden
        console.log('🚫 Player is locked out from this clue')
      }
    } catch (error) {
      console.error('Error checking player lockout status:', error)
    }
  }, [user])

  /**
   * Handles clue modal close.
   */
  const handleClueModalClose = useCallback(() => {
    setShowClueModal(false)
    setCurrentClue(null)
    setBuzzerState(BuzzerState.LOCKED)
    setReactionTime(null)
  }, [])

  // Load initial data
  useEffect(() => {
    loadGameData()
    loadGameBoardData()
  }, [loadGameData, loadGameBoardData])

  // Set up real-time subscriptions
  useEffect(() => setupRealtimeSubscriptions(), [setupRealtimeSubscriptions])

  // Loading state
  if (loading) {
    return (
      <div className="player-dashboard loading">
        <div className="loading-message">
          Loading game...
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="player-dashboard error">
        <div className="error-message">
          <h3>Error Loading Game</h3>
          <p>{error}</p>
          <p>Game ID: {gameId}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="player-dashboard" data-game-id={gameId}>
      {/* Round Header */}
      <div className="jeopardy-board-header">
        <h2>
          {(() => {
            if (game?.current_round === 'final') {
              return 'Final Jeopardy'
            }
            if (game?.current_round === 'double') {
              return 'Double Jeopardy Round'
            }
            return 'The Jeopardy Round'
          })()}
        </h2>
      </div>

      {/* Jeopardy Board */}
      <div className="jeopardy-board-container">
        <div className="jeopardy-board">
          {clueSetData && game ? (
            <>
              {/* Category headers */}
              {(() => {
                if (game.current_round === "final") {
                  return (
                    <div key="final-category" className="category-header">
                      {clueSetData.rounds.final.name}
                    </div>
                  )
                } else {
                  const roundKey = game.current_round as 'jeopardy' | 'double'
                  const currentRoundData = clueSetData.rounds[roundKey] || []
                  return currentRoundData.map((category: { name: string; clues: ClueData[] }, index: number) => (
                    <div
                      key={`category-${index}-${category.name}`}
                      className="category-header"
                    >
                      {category.name}
                    </div>
                  ))
                }
              })()}

              {/* Clue cells */}
              {(() => {
                if (game.current_round === "final") {
                  const finalClue = clueSetData.rounds.final.clues?.[0]
                  return finalClue ? (
                    <button
                      type="button"
                      className="clue-cell final-jeopardy"
                      style={{ pointerEvents: 'none' }}
                      aria-label="Final Jeopardy"
                    >
                      Final Jeopardy
                    </button>
                  ) : null
                }

                // Regular rounds: create grid of all clues
                const roundKey = game.current_round as 'jeopardy' | 'double'
                const currentRoundData = clueSetData.rounds[roundKey] || []
                const allClues: Array<{
                  categoryIndex: number
                  clue: ClueData
                }> = []

                currentRoundData.forEach((category: { name: string; clues: ClueData[] }, categoryIndex: number) => {
                  category.clues.forEach((clue: ClueData) => {
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
                  // Find clue state for this clue
                  const clueState = clueStates.find(
                    (state) => state.clue_id === item.clue.id
                  )

                  const isRevealed = clueState?.revealed || false
                  const isCompleted = clueState?.completed || false
                  const isFocused = focusedClue && focusedClue.id === item.clue.id

                  // Players don't see Daily Double indicators until they encounter them
                  const isDailyDouble = false

                  let cellClass = "clue-cell"
                  if (isCompleted) {
                    cellClass += " completed revealed" // Completed clues should also be styled as revealed
                  } else if (isRevealed) {
                    cellClass += " revealed"
                  }
                  if (isFocused) {
                    cellClass += " focused"
                  }
                  if (isDailyDouble) {
                    cellClass += " daily-double"
                  }

                  let ariaLabel = `Clue for $${item.clue.value}`
                  if (isDailyDouble) {
                    ariaLabel += " - Daily Double"
                  }
                  if (isCompleted) {
                    ariaLabel += " - Completed"
                  } else if (isRevealed) {
                    ariaLabel += " - Revealed"
                  }
                  if (isFocused) {
                    ariaLabel += " - Focused"
                  }

                  return (
                    <button
                      key={`clue-${item.clue.id || index}-${item.clue.value}`}
                      type="button"
                      className={cellClass}
                      style={{ pointerEvents: 'none' }}
                      aria-label={ariaLabel}
                    >
                      ${item.clue.value}
                    </button>
                  )
                })
              })()}
            </>
          ) : (
            /* Loading placeholder */
            <>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={`loading-category-${i}`} className="category-header">
                  Loading...
                </div>
              ))}
              {Array.from({ length: 30 }, (_, i) => (
                <button
                  key={`loading-clue-${i}`}
                  type="button"
                  className="clue-cell"
                  style={{ pointerEvents: 'none' }}
                  aria-label="Loading clue"
                >
                  ...
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Player Podiums */}
      <PlayerPodiums
        players={players}
        currentUserId={user?.id || ''}
      />

      {/* Clue Reveal Modal */}
      <ClueRevealModal
        clue={currentClue}
        buzzerState={buzzerState}
        onBuzz={handleBuzz}
        isVisible={showClueModal}
        onClose={handleClueModalClose}
        reactionTime={reactionTime}
        showReactionTime={buzzerState === BuzzerState.BUZZED}
      />
    </div>
  )
}

export default PlayerDashboard
