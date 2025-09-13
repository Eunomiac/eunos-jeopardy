import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export function SimpleLogin() {
  const { user, login, logout, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      // Clear form on success
      setEmail('')
      setPassword('')
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const handleLogout = () => {
    logout()
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (user) {
    return (
      <div className="login-info">
        <span className="login-text">Currently logged in as </span>
        <span className="user-email jeopardy-category">
          {user.email}
        </span>
        <button
          className="jeopardy-button logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    )
  }

  return (
    <div className="simple-login game-creator login-form">
      <h3 className="jeopardy-category login-title">
        Login
      </h3>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="jeopardy-input"
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="jeopardy-input"
          />
        </div>
        <button
          type="submit"
          className="jeopardy-button full-width"
        >
          Login
        </button>
      </form>
      <p className="jeopardy-category login-help-text">
        Test accounts: host@test.com, player1@test.com, player2@test.com (password: 1234)
      </p>
    </div>
  )
}
