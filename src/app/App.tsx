import { useState } from 'react'

export function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <header className="app__header">
        <h1>Euno's Jeopardy</h1>
      </header>

      <main className="app__main">
        <div className="d-flex flex-column align-center">
          <h2>Welcome to your new project!</h2>
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
      </main>

      <footer className="app__footer">
        <p>&copy; 2025 Euno's Jeopardy. Built with React + TypeScript + Vite.</p>
      </footer>
    </div>
  )
}
