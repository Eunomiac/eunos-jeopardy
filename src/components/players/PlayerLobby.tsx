import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { GameService, type Player } from '../../services/games/GameService'
import { supabase } from '../../services/supabase/client'
import './PlayerLobby.scss'

/**
 * Props for the PlayerLobby component.
 */
interface PlayerLobbyProps {
  /** Game ID the player has joined */
  gameId: string
  /** Callback to leave the game and return to join interface */
  onLeaveGame: () => void
}

/**
 * Player lobby interface showing game status and other players.
 *
 * This component displays the waiting room for players who have joined a game
 * but the host hasn't started it yet. Shows other players and game status.
 *
 * @param props - Component props
 * @returns JSX element for player lobby interface
 */
export function PlayerLobby({ gameId, onLeaveGame }: Readonly<PlayerLobbyProps>) {
  const { user } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /**
   * Loads game and player data.
   */
  const loadGameData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      // Load players (we can access this as a player)
      const playersData = await GameService.getPlayers(gameId)
      setPlayers(playersData)

      // Try to get basic game info (this might fail if we're not the host)
      // For now, we'll just show player list and assume game exists
      setLoading(false)
    } catch (err) {
      console.error('Failed to load game data:', err)
      setError('Failed to load game information')
      setLoading(false)
    }
  }, [gameId])

  // Load initial data
  useEffect(() => {
    loadGameData()
  }, [gameId, loadGameData])

  // Set up real-time subscriptions for player changes
  useEffect(() => {
    const subscription = supabase
      .channel(`player-lobby:${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `game_id=eq.${gameId}`
      }, async () => {
        console.log('Player change detected in lobby')
        try {
          const updatedPlayers = await GameService.getPlayers(gameId)
          setPlayers(updatedPlayers)
        } catch (err) {
          console.error('Failed to refresh players:', err)
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [gameId])

  /**
   * Handles leaving the game.
   */
  const handleLeaveGame = async () => {
    if (!user) { return }

    try {
      setLoading(true)
      // Remove player from game database
      await GameService.removePlayer(gameId, user.id)
      // Return to join interface
      onLeaveGame()
    } catch (err) {
      console.error('Failed to leave game:', err)
      setError(err instanceof Error ? err.message : 'Failed to leave game')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="player-lobby loading">
        <div className="loading-message">
          <h2>Loading game...</h2>
          <p>Please wait while we connect you to the game.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="player-lobby error">
        <div className="error-message">
          <h2>Connection Error</h2>
          <p>{error}</p>
          <button className="btn jeopardy-button" onClick={onLeaveGame}>
            Back to Join
          </button>
        </div>
      </div>
    )
  }

  const currentPlayer = players.find((p) => p.user_id === user?.id)

  return (
    <div className="player-lobby">
      <div className="lobby-container">
        <header className="lobby-header">
          <h1>Game Lobby</h1>
          <p className="game-code">Game Code: <strong>{gameId}</strong></p>
          {currentPlayer && (
            <p className="player-info">
              Playing as: <strong>{currentPlayer.nickname || 'Player'}</strong>
            </p>
          )}
        </header>

        <div className="lobby-content">
          <div className="game-status">
            <h2>Waiting for Host</h2>
            <p>The game host will start the game when ready. Please wait...</p>
          </div>

          <div className="players-section">
            <h3>Players in Game ({players.length})</h3>
            {players.length === 0 ? (
              <p className="no-players">No players have joined yet.</p>
            ) : (
              <div className="players-list">
                {players.map((player, index) => (
                  <div
                    key={player.user_id}
                    className={`player-item ${player.user_id === user?.id ? 'current-player' : ''}`}
                  >
                    <div className="player-info">
                      <span className="player-name">
                        {player.nickname || `Player ${index + 1}`}
                      </span>
                      {player.user_id === user?.id && (
                        <span className="you-indicator">(You)</span>
                      )}
                    </div>
                    <div className="player-status">Ready</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lobby-actions">
          <button
            className="btn btn-outline-secondary"
            onClick={handleLeaveGame}
          >
            Leave Game
          </button>
        </div>
      </div>
    </div>
  )
}
