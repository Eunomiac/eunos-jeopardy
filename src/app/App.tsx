import { useState } from 'react'
import { SimpleLogin } from '../components/auth/SimpleLogin'
import { ClueSetSelector } from '../components/clueSets/ClueSetSelector'
import { GameCreator } from '../components/games/GameCreator'
import { GameHostDashboard } from '../components/games/GameHostDashboard'
import { useAuth } from '../contexts/AuthContext'

type AppMode = 'clue-sets' | 'host-game' | 'dashboard'

export function App() {
  const [count, setCount] = useState(0)
  const [mode, setMode] = useState<AppMode>('clue-sets')
  const [currentGameId, setCurrentGameId] = useState<string | null>(null)
  const { user } = useAuth()

  const handleGameCreated = (gameId: string) => {
    setCurrentGameId(gameId)
    setMode('dashboard')
  }

  const handleBackToCreator = () => {
    setCurrentGameId(null)
    setMode('host-game')
  }



  return (
    <div className="app">
      <header className="app__header">
        <h1>Euno's Jeopardy</h1>
      </header>

      <main className="app__main">
        <div className="d-flex flex-column align-center">
          <SimpleLogin />

          {user && (
            <>
              <h2>Welcome to Euno's Jeopardy!</h2>
              <p className="text-secondary mb-4">
                Logged in as: <strong>{user.email}</strong>
              </p>

              {/* Navigation Tabs */}
              <div className="mb-4">
                <nav className="nav nav-tabs">
                  <button
                    className={`nav-link ${mode === 'clue-sets' ? 'active' : ''}`}
                    onClick={() => setMode('clue-sets')}
                    disabled={mode === 'dashboard'}
                  >
                    Load Clue Sets
                  </button>
                  <button
                    className={`nav-link ${mode === 'host-game' ? 'active' : ''}`}
                    onClick={() => setMode('host-game')}
                    disabled={mode === 'dashboard'}
                  >
                    Host Game
                  </button>
                  {mode === 'dashboard' && (
                    <span className="nav-link active">
                      Game Dashboard
                    </span>
                  )}
                </nav>
              </div>

              {/* Content based on current mode */}
              <div className="mb-5 w-100">
                {mode === 'clue-sets' && (
                  <ClueSetSelector />
                )}

                {mode === 'host-game' && (
                  <GameCreator onGameCreated={handleGameCreated} />
                )}

                {mode === 'dashboard' && currentGameId && (
                  <GameHostDashboard
                    gameId={currentGameId}
                    onBackToCreator={handleBackToCreator}
                  />
                )}
              </div>

              {/* Development Tools - only show when not in dashboard mode */}
              {mode !== 'dashboard' && (
                <div className="mb-4">
                  <h3>Development Tools</h3>
                  <p className="text-secondary mb-4">
                    This is a template React application with TypeScript, SCSS, and Jest testing.
                  </p>

                  <div className="d-flex align-center mb-4">
                    <button
                      className="btn btn-secondary mr-3"
                      onClick={() => setCount(count - 1)}
                    >
                      -
                    </button>
                    <span className="font-bold text-xl">Count: {count}</span>
                    <button
                      className="btn btn-primary ml-3"
                      onClick={() => setCount(count + 1)}
                    >
                      +
                    </button>
                  </div>

                  <div className="text-center">
                    <p className="text-muted">
                      Edit <code>src/app/App.tsx</code> to get started.
                    </p>
                    <p className="text-muted">
                      Run <code>npm test</code> to run the test suite.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="app__footer">
        <p>&copy; 2025 Euno's Jeopardy. Built with React + TypeScript + Vite.</p>
      </footer>
    </div>
  )
}
