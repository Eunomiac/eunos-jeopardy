import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { GameService } from '../../services/games/GameService'
import type { Tables } from '../../services/supabase/types'

interface GameCreatorProps {
  onGameCreated: (gameId: string) => void
}

export function GameCreator({ onGameCreated }: GameCreatorProps) {
  const { user } = useAuth()
  const [clueSets, setClueSets] = useState<Tables<'clue_sets'>[]>([])
  const [selectedClueSetId, setSelectedClueSetId] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingClueSets, setLoadingClueSets] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  // Load available clue sets on component mount
  useEffect(() => {
    if (!user) return

    const loadClueSets = async () => {
      try {
        setLoadingClueSets(true)
        const availableClueSets = await GameService.getAvailableClueSets(user.id)
        setClueSets(availableClueSets)
      } catch (error) {
        console.error('Failed to load clue sets:', error)
        setMessage(`Failed to load clue sets: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setMessageType('error')
      } finally {
        setLoadingClueSets(false)
      }
    }

    loadClueSets()
  }, [user])

  const handleCreateGame = async () => {
    if (!selectedClueSetId) {
      setMessage('Please select a clue set')
      setMessageType('error')
      return
    }

    if (!user) {
      setMessage('You must be logged in to create a game')
      setMessageType('error')
      return
    }

    setLoading(true)
    setMessage('')
    setMessageType('')

    try {
      setMessage('Creating game...')
      const game = await GameService.createGame(user.id, selectedClueSetId)
      
      setMessage(`Game created successfully! Game ID: ${game.id}`)
      setMessageType('success')
      
      // Notify parent component
      onGameCreated(game.id)
      
      // Reset form
      setSelectedClueSetId('')

    } catch (error) {
      console.error('Failed to create game:', error)
      setMessage(`Failed to create game: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="game-creator">
        <p className="text-muted">Please log in to create games.</p>
      </div>
    )
  }

  if (loadingClueSets) {
    return (
      <div className="game-creator">
        <p className="text-muted">Loading clue sets...</p>
      </div>
    )
  }

  if (clueSets.length === 0) {
    return (
      <div className="game-creator">
        <h3>Create New Game</h3>
        <div className="alert alert-info">
          <p><strong>No clue sets available.</strong></p>
          <p>You need to load at least one clue set before creating a game.</p>
          <p>Go to the "Load Clue Sets" tab to upload a CSV file with your questions.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="game-creator">
      <h3>Create New Game</h3>

      <div className="mb-3">
        <label htmlFor="clue-set-select" className="form-label">
          Select Clue Set:
        </label>
        <select
          id="clue-set-select"
          className="form-select"
          value={selectedClueSetId}
          onChange={(e) => setSelectedClueSetId(e.target.value)}
          disabled={loading}
        >
          <option value="">Choose a clue set...</option>
          {clueSets.map((clueSet) => (
            <option key={clueSet.id} value={clueSet.id}>
              {clueSet.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <button
          className="btn btn-primary"
          onClick={handleCreateGame}
          disabled={loading || !selectedClueSetId}
        >
          {loading ? 'Creating Game...' : 'Create Game'}
        </button>
      </div>

      {message && (
        <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {message}
        </div>
      )}

      <div className="text-muted mt-3">
        <small>
          <strong>Available Clue Sets:</strong>
          <ul className="mt-2">
            {clueSets.map((clueSet) => (
              <li key={clueSet.id}>
                <strong>{clueSet.name}</strong>
                <br />
                <small className="text-muted">
                  Created: {new Date(clueSet.created_at).toLocaleDateString()}
                </small>
              </li>
            ))}
          </ul>
        </small>
      </div>
    </div>
  )
}
