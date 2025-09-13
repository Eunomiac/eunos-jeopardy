import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { GameService, type Game, type Player } from '../../services/games/GameService'

interface GameHostDashboardProps {
  readonly gameId: string
  readonly onBackToCreator: () => void
}

export function GameHostDashboard({ gameId, onBackToCreator }: Readonly<GameHostDashboardProps>) {
  const { user } = useAuth()
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  // Load game data
  useEffect(() => {
    if (!user || !gameId) { return }

    const loadGameData = async () => {
      try {
        setLoading(true)
        setMessage('')
        setMessageType('')

        // Load game details
        const gameData = await GameService.getGame(gameId, user.id)
        setGame(gameData)

        // Load players
        const playersData = await GameService.getPlayers(gameId)
        setPlayers(playersData)

      } catch (error) {
        console.error('Failed to load game data:', error)
        setMessage(`Failed to load game: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setMessageType('error')
      } finally {
        setLoading(false)
      }
    }

    loadGameData()
  }, [user, gameId])

  const handleToggleBuzzer = async () => {
    if (!user || !game) { return }

    try {
      setMessage('Updating buzzer state...')
      const updatedGame = await GameService.toggleBuzzerLock(gameId, user.id)
      setGame(updatedGame)
      setMessage(`Buzzer ${updatedGame.is_buzzer_locked ? 'locked' : 'unlocked'}`)
      setMessageType('success')
    } catch (error) {
      console.error('Failed to toggle buzzer:', error)
      setMessage(`Failed to toggle buzzer: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMessageType('error')
    }
  }

  const handleEndGame = async () => {
    if (!user || !game) { return }

    if (!confirm('Are you sure you want to end this game?')) {
      return
    }

    try {
      setMessage('Ending game...')
      await GameService.updateGame(gameId, { status: 'completed' }, user.id)
      setMessage('Game ended successfully')
      setMessageType('success')

      // Go back to creator after a delay
      setTimeout(() => {
        onBackToCreator()
      }, 2000)
    } catch (error) {
      console.error('Failed to end game:', error)
      setMessage(`Failed to end game: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMessageType('error')
    }
  }

  if (!user) {
    return (
      <div className="game-host-dashboard">
        <p className="text-muted">Please log in to access the game dashboard.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="game-host-dashboard">
        <h3>Loading Game...</h3>
        <p className="text-muted">Please wait while we load the game data.</p>
      </div>
    )
  }

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

  return (
    <div className="game-host-dashboard">
      <header className="dashboard-header mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <h2>Host Dashboard</h2>
          <button className="btn btn-secondary" onClick={onBackToCreator}>
            Back to Creator
          </button>
        </div>
        <p className="text-muted">Game ID: {gameId}</p>
      </header>

      {message && (
        <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-danger'} mb-4`}>
          {message}
        </div>
      )}

      <div className="row">
        {/* Game Controls */}
        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-header">
              <h5>Game Controls</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <h6>Buzzer Control</h6>
                <div className="d-flex align-items-center mb-2">
                  <span className={`badge ${game.is_buzzer_locked ? 'bg-danger' : 'bg-success'} me-2`}>
                    {game.is_buzzer_locked ? '🔒 LOCKED' : '🔓 UNLOCKED'}
                  </span>
                </div>
                <button
                  className={`btn ${game.is_buzzer_locked ? 'btn-success' : 'btn-warning'}`}
                  onClick={handleToggleBuzzer}
                >
                  {game.is_buzzer_locked ? 'Unlock Buzzer' : 'Lock Buzzer'}
                </button>
                <div className="text-muted mt-2">
                  <small>Press SPACE to toggle</small>
                </div>
              </div>

              <div className="mb-3">
                <h6>Game Status</h6>
                <p className="mb-1">
                  <strong>Status:</strong> <span className="text-capitalize">{game.status}</span>
                </p>
                <p className="mb-1">
                  <strong>Round:</strong> <span className="text-capitalize">{game.current_round}</span>
                </p>
              </div>

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

        {/* Player List */}
        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-header">
              <h5>Players ({players.length})</h5>
            </div>
            <div className="card-body">
              {players.length === 0 ? (
                <p className="text-muted">No players have joined yet.</p>
              ) : (
                <div className="player-list">
                  {players.map((player, index) => (
                    <div key={player.user_id} className="player-item mb-2 p-2 border rounded">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>
                            {player.nickname || `Player ${index + 1}`}
                          </strong>
                        </div>
                        <div className="text-end">
                          <span className="badge bg-primary">
                            ${player.score}
                          </span>
                        </div>
                      </div>
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

        {/* Game Information */}
        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-header">
              <h5>Game Information</h5>
            </div>
            <div className="card-body">
              <p><strong>Game ID:</strong> {game.id}</p>
              <p><strong>Created:</strong> {new Date(game.created_at).toLocaleString()}</p>
              <p><strong>Host:</strong> {user.email}</p>
              <p><strong>Status:</strong> <span className="text-capitalize">{game.status}</span></p>
              <p><strong>Current Round:</strong> <span className="text-capitalize">{game.current_round}</span></p>

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
