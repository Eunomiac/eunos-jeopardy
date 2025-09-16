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
          } else {
            setBuzzerState(BuzzerState.UNLOCKED)
          }

          // Show clue modal if there's a focused clue
          if (gameUpdate.focused_clue_id) {
            // TODO: Load clue data and show modal
            setShowClueModal(true)
          } else {
            setShowClueModal(false)
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

    return () => {
      gameSubscription.unsubscribe()
      playersSubscription.unsubscribe()
    }
  }, [gameId, user, loadGameData])

  /**
   * Handles player buzzer click.
   */
  const handleBuzz = useCallback(() => {
    if (buzzerState === BuzzerState.UNLOCKED) {
      setBuzzerState(BuzzerState.BUZZED)

      // TODO: Send buzz event to server with timing data
      // This will be implemented when integrating with real-time subscriptions

      console.log('⚡ Player buzzed in!')
    } else if (buzzerState === BuzzerState.LOCKED) {
      // Player buzzed too early - set frozen state
      setBuzzerState(BuzzerState.FROZEN)
      console.log('❄️ Player buzzed too early - frozen!')
    }
  }, [buzzerState])

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
