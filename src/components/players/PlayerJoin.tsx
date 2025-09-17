import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { GameService } from '../../services/games/GameService'
import { supabase } from '../../services/supabase/client'
import './PlayerJoin.scss'

/**
 * Props for the PlayerJoin component.
 */
interface PlayerJoinProps {
  /** Callback when player successfully joins a game */
  onGameJoined: (gameId: string) => void
}

/**
 * Player join interface that automatically detects available lobby games.
 *
 * This component automatically finds games in lobby status and allows players
 * to join them. It assumes only one game will be running at a time.
 *
 * @param props - Component props
 * @returns JSX element for player join interface
 */
/**
 * Extracts the username portion from an email address to use as default nickname.
 * @param email - The email address
 * @returns The username portion (everything before @)
 */
const getDefaultNicknameFromEmail = (email: string): string => {
  return email.split('@')[0] || 'Player'
}

export function PlayerJoin({ onGameJoined }: Readonly<PlayerJoinProps>) {
  const { user } = useAuth()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableGame, setAvailableGame] = useState<{ id: string; host_id: string } | null>(null)
  const [checkingForGame, setCheckingForGame] = useState(true)

  /**
   * Effect to load user's current nickname and check for available games.
   * Re-runs when user changes (i.e., when someone logs in).
   */
  useEffect(() => {
    // Don't run if no user is logged in
    if (!user) {
      setAvailableGame(null)
      setCheckingForGame(false)
      return undefined
    }

    // Load user's current nickname from profile to pre-populate field
    const loadUserNickname = async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.warn('Could not load user profile:', profileError)
        }

        // Set nickname to profile display_name or default to email prefix
        const currentNickname = profile?.display_name || getDefaultNicknameFromEmail(user.email || '')
        setNickname(currentNickname)
      } catch (err) {
        console.warn('Error loading user nickname:', err)
        // Fallback to email prefix
        setNickname(getDefaultNicknameFromEmail(user.email || ''))
      }
    }

    loadUserNickname()

    const checkForAvailableGame = async () => {
      try {
        setCheckingForGame(true)
        setError('')

        // Look for games in lobby status
        const { data: games, error: gameError } = await supabase
          .from('games')
          .select('id, host_id')
          .eq('status', 'lobby')
          .limit(1)

        if (gameError) {
          console.error('❌ Error checking for games:', gameError)
          setError('Failed to check for available games')
          setAvailableGame(null)
        } else {
          const foundGame = games && games.length > 0 ? games[0] : null
          setAvailableGame(foundGame)
        }
      } catch (err) {
        console.error('❌ Error in checkForAvailableGame:', err)
        setError('Failed to check for available games')
        setAvailableGame(null)
      } finally {
        setCheckingForGame(false)
      }
    }

    checkForAvailableGame()

    // Set up real-time subscription to monitor for new lobby games
    const subscription = supabase
      .channel(`lobby-games-${user.id}`) // Use unique channel name per user
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games'
      }, (payload) => {
        console.log('🔔 Real-time game event received:', {
          eventType: payload.eventType,
          table: payload.table,
          schema: payload.schema
        })
        checkForAvailableGame()
      })
      .subscribe((status, subscriptionErr) => {
        if (subscriptionErr) {
          console.error('📡 Subscription error:', subscriptionErr)
        }
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active')
        }
      })

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  /**
   * Handles joining the available lobby game.
   */
  const handleJoinGame = async () => {
    if (!user) {
      setError('You must be logged in to join a game')
      return
    }

    if (!availableGame) {
      setError('No game available to join')
      return
    }

    setLoading(true)
    setError('')

    try {
      const finalNickname = nickname.trim() || getDefaultNicknameFromEmail(user.email || '')

      // Save nickname to user profile for future games
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ display_name: finalNickname })
        .eq('id', user.id)

      if (profileError) {
        console.warn('Could not update user profile nickname:', profileError)
        // Continue anyway - this is not a critical failure
      }

      // Add player to the available game (this saves to players table)
      await GameService.addPlayer(availableGame.id, user.id, finalNickname)

      // Notify parent component that player joined
      onGameJoined(availableGame.id)
    } catch (err) {
      console.error('Failed to join game:', err)
      setError(err instanceof Error ? err.message : 'Failed to join game')
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

  // Determine button state and text
  const getButtonState = () => {
    if (checkingForGame) {
      return { className: 'jeopardy-button', text: 'Checking for Games...', disabled: true }
    }
    if (!availableGame) {
      return { className: 'jeopardy-button red', text: 'Waiting for Game', disabled: true }
    }
    if (loading) {
      return { className: 'jeopardy-button green', text: 'Joining...', disabled: true }
    }
    return { className: 'jeopardy-button green', text: 'Join Game', disabled: false }
  }

  const buttonState = getButtonState()

  return (
    <div className="player-join">
      <div className="player-join-container">
        <h2>Join Game</h2>
        <p className="join-description">
          {availableGame
            ? 'A game is available! Enter your nickname and join.'
            : 'Waiting for a host to create a game...'
          }
        </p>

        <form onSubmit={handleSubmit} className="join-form">
          <div className="form-group">
            <label htmlFor="nickname">Nickname</label>
            <input
              id="nickname"
              type="text"
              className="form-control"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your display name for this game..."
              disabled={loading || checkingForGame}
              maxLength={50}
            />
            <small className="form-text text-muted">
              This will be your display name in the game
            </small>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={buttonState.className}
            disabled={buttonState.disabled}
          >
            {buttonState.text}
          </button>
        </form>

        <div className="join-help">
          <h3>How It Works</h3>
          <ul>
            <li>Wait for a host to create a game</li>
            <li>When a game is available, click "Join Game"</li>
            <li>You can set a nickname for each game</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
