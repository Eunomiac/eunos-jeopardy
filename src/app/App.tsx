import { useState, useEffect } from 'react'
import { SimpleLogin } from '../components/auth/SimpleLogin'
import { ClueSetSelector } from '../components/clueSets/ClueSetSelector'
import { GameHostDashboard } from '../components/games/GameHostDashboard'
import { useAuth } from '../contexts/AuthContext'
import { GameService } from '../services/games/GameService'
import { loadClueSetFromCSV, saveClueSetToDatabase } from '../services/clueSets/loader'


type AppMode = 'clue-sets' | 'host-game' | 'dashboard'

export function App() {
  const [mode, setMode] = useState<AppMode>('clue-sets')
  const [currentGameId, setCurrentGameId] = useState<string | null>(null)
  const [selectedClueSetId, setSelectedClueSetId] = useState<string>('')
  const { user } = useAuth()

  // Clear app state when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentGameId(null)
      setSelectedClueSetId('')
      setMode('clue-sets')
    }
  }, [user])

  const handleGameCreated = (gameId: string) => {
    setCurrentGameId(gameId)
    setMode('dashboard')
  }

  const handleBackToCreator = () => {
    setCurrentGameId(null)
    setSelectedClueSetId('')
    setMode('clue-sets')
  }

  const handleHostGame = async () => {
    if (!selectedClueSetId || !user) {
      return
    }

    try {
      // Authentication is working properly now

      // First, load the CSV file and parse it
      const clueSetData = await loadClueSetFromCSV(selectedClueSetId)

      // Save the clue set to the database and get the UUID
      const clueSetUuid = await saveClueSetToDatabase(clueSetData, user.id)


      // Create the game using the UUID
      const game = await GameService.createGame(user.id, clueSetUuid)
      handleGameCreated(game.id)
    } catch (error) {
      console.error('Failed to create game:', error)
      // Could add error handling UI here
    }
  }



  return (
    <div className="app-container">
      {/* Header with login info */}
      {user && (
        <header className="app-top-header">
          <SimpleLogin />
        </header>
      )}

      <header className="app-header">
        <div className="jeopardy-sur-title">Eunomiac's</div>
        <h1 className="jeopardy-title">Jeopardy!</h1>
      </header>

      <main className="app-main">
        <div className="app-content">
          {!user && (
            <div className="content-section">
              <SimpleLogin />
            </div>
          )}

          {user && (
            <>
              {/* Content based on current mode */}
              <div className="content-section game-creator-section">
                {mode === 'dashboard' && currentGameId && (
                  <>
                    <div className="navigation-tabs">
                      <span className="jeopardy-button">
                        Game Dashboard
                      </span>
                    </div>
                    <GameHostDashboard
                      gameId={currentGameId}
                      onBackToCreator={handleBackToCreator}
                    />
                  </>
                )}

                {mode !== 'dashboard' && (
                  <>
                    {/* Clue Set Selection */}
                    <ClueSetSelector
                      selectedClueSetId={selectedClueSetId}
                      onClueSetSelected={setSelectedClueSetId}
                    />

                    {/* Host Game Button */}
                    <div className="host-game-section">
                      <button
                        className={`jeopardy-button jeopardy-button-large ${!selectedClueSetId ? 'inactive' : ''}`}
                        onClick={handleHostGame}
                        disabled={!selectedClueSetId}
                      >
                        Host Game
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p className="jeopardy-category footer-text">
          &copy; 2025 Euno's Jeopardy. Built with React + TypeScript + Vite.
        </p>
      </footer>
    </div>
  )
}
