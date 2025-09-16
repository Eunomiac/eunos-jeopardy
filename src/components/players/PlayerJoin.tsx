import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { GameService } from '../../services/games/GameService'
import './PlayerJoin.scss'

/**
 * Props for the PlayerJoin component.
 */
interface PlayerJoinProps {
  /** Optional game ID from URL parameter */
  gameId?: string
  /** Callback when player successfully joins a game */
  onGameJoined: (gameId: string) => void
}

/**
 * Player join interface for entering game codes and joining games.
 * 
 * This component provides a simple interface for players to join existing games
 * by entering a game code or using a direct link. It prevents players from
 * seeing the host game creation interface.
 * 
 * @param props - Component props
 * @returns JSX element for player join interface
 */
export function PlayerJoin({ gameId: initialGameId, onGameJoined }: Readonly<PlayerJoinProps>) {
  const { user } = useAuth()
  const [gameCode, setGameCode] = useState(initialGameId || '')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /**
   * Handles joining a game with the entered game code and nickname.
   */
  const handleJoinGame = async () => {
    if (!user) {
      setError('You must be logged in to join a game')
      return
    }

    if (!gameCode.trim()) {
      setError('Please enter a game code')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Add player to the game
      await GameService.addPlayer(gameCode.trim(), user.id, nickname.trim() || undefined)
      
      // Notify parent component that player joined
      onGameJoined(gameCode.trim())
    } catch (error) {
      console.error('Failed to join game:', error)
      setError(error instanceof Error ? error.message : 'Failed to join game')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handles form submission.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleJoinGame()
  }

  return (
    <div className="player-join">
      <div className="player-join-container">
        <h2>Join Game</h2>
        <p className="join-description">
          Enter the game code provided by your host to join the game.
        </p>

        <form onSubmit={handleSubmit} className="join-form">
          <div className="form-group">
            <label htmlFor="gameCode">Game Code</label>
            <input
              id="gameCode"
              type="text"
              className="form-control"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value)}
              placeholder="Enter game code..."
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="nickname">Nickname (Optional)</label>
            <input
              id="nickname"
              type="text"
              className="form-control"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your display name for this game..."
              disabled={loading}
              maxLength={50}
            />
            <small className="form-text text-muted">
              Leave blank to use your profile name
            </small>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn jeopardy-button"
            disabled={loading || !gameCode.trim()}
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </form>

        <div className="join-help">
          <h3>Need Help?</h3>
          <ul>
            <li>Ask your host for the game code</li>
            <li>Game codes are unique identifiers for each game</li>
            <li>You can change your nickname for each game</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
