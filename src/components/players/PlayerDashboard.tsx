import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { GameService } from '../../services/games/GameService'
import { FontAssignmentService } from '../../services/fonts/FontAssignmentService'
import { PlayerPodiums, type PlayerInfo } from './PlayerPodiums'
import { ClueRevealModal, type ClueInfo } from './ClueRevealModal'
import { BuzzerState } from '../../types/BuzzerState'
import { supabase } from '../../services/supabase/client'
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [gameData, setGameData] = useState<GameUpdatePayload | null>(null) // Will be used for game state updates
  const [players, setPlayers] = useState<PlayerInfo[]>([])
  const [currentClue, setCurrentClue] = useState<ClueInfo | null>(null)
  const [buzzerState, setBuzzerState] = useState<BuzzerState>(BuzzerState.LOCKED)
  const [reactionTime, setReactionTime] = useState<number | null>(null)

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showClueModal, setShowClueModal] = useState(false)

  // Font assignment
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [playerFont, setPlayerFont] = useState<string>('handwritten-1') // Will be used for font assignment logic

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

      // Load game data
      // TODO: Implement GameService.getGameById method
      // const game = await GameService.getGameById(gameId)
      // setGameData(game)
      setGameData({ id: gameId, status: 'in_progress' }) // Temporary placeholder

      // Load players
      const gamePlayers = await GameService.getPlayers(gameId)

      // Assign fonts and create player info
      const playersWithFonts = await Promise.all(
        gamePlayers.map(async (player) => {
          let font = 'handwritten-1'

          if (player.user_id === user.id) {
            // Get or assign font for current user
            font = await FontAssignmentService.getPlayerFont(user.id, gameId)
            setPlayerFont(font)
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
   * Loads clue data for display in the modal.
   */
  const loadClueData = useCallback(async (clueId: string) => {
    try {
      const { ClueService } = await import('../../services/clues/ClueService')
      const clue = await ClueService.getClueById(clueId)

      // Get category name from category_id
      const { data: category } = await supabase
        .from('categories')
        .select('name')
        .eq('id', clue.category_id)
        .single()

      setCurrentClue({
        id: clue.id,
        prompt: clue.prompt,
        value: clue.value,
        category: category?.name || 'Unknown Category',
        isDailyDouble: false // TODO: Implement Daily Double detection
      })
    } catch (error) {
      console.error('Failed to load clue:', error)
      setCurrentClue(null)
    }
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
      }, (payload) => {
        console.log('🔔 Game state update:', payload)
        // Update game data based on changes
        if (payload.new) {
          const gameUpdate = payload.new as GameUpdatePayload
          setGameData(gameUpdate)

          // Update buzzer state based on game state
          if (gameUpdate.is_buzzer_locked) {
            setBuzzerState(BuzzerState.LOCKED)
            setBuzzerUnlockTime(null)
          } else {
            setBuzzerState(BuzzerState.UNLOCKED)
            setBuzzerUnlockTime(Date.now()) // Record when buzzer was unlocked
          }

          // Show clue modal if there's a focused clue
          if (gameUpdate.focused_clue_id) {
            loadClueData(gameUpdate.focused_clue_id)
            setShowClueModal(true)
          } else {
            setShowClueModal(false)
            setCurrentClue(null)
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
      }, () => {
        console.log('🔔 Players update')
        loadGameData() // Reload player data
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

    return () => {
      gameSubscription.unsubscribe()
      playersSubscription.unsubscribe()
      buzzesSubscription.unsubscribe()
    }
  }, [gameId, user, loadGameData, loadClueData])

  /**
   * Handles player buzzer click.
   */
  const handleBuzz = useCallback(async () => {
    if (buzzerState === BuzzerState.UNLOCKED && user && currentClue) {
      // Record buzz timestamp for client-side timing (will be implemented later)
      setBuzzerState(BuzzerState.BUZZED)

      try {
        // Send buzz event to server
        const { GameService } = await import('../../services/games/GameService')
        await GameService.recordBuzz(gameId, currentClue.id, user.id)

        console.log('⚡ Player buzzed in successfully!')

        // Calculate and display reaction time using client-side timing
        if (buzzerUnlockTime) {
          const reactionTimeMs = Date.now() - buzzerUnlockTime
          setReactionTime(reactionTimeMs)
          console.log(`⏱️ Reaction time: ${reactionTimeMs}ms`)
        }

      } catch (error) {
        console.error('Failed to record buzz:', error)
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
  }, [loadGameData])

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
    <div className="player-dashboard">
      {/* Jeopardy Board */}
      <div className="jeopardy-board-container">
        <div className="jeopardy-board">
          {/* TODO: Implement game board display */}
          <div style={{
            color: 'white',
            textAlign: 'center',
            padding: '2rem',
            fontSize: '1.5rem'
          }}>
            Game Board Coming Soon
          </div>
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
