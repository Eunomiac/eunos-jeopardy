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
      <div className="simple-login">
        <p>Logged in as: <strong>{user.email}</strong></p>
        <button 
          className="btn btn-secondary"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    )
  }

  return (
    <div className="simple-login">
      <h3>Login</h3>
      <form onSubmit={handleLogin}>
        <div className="mb-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Login
        </button>
      </form>
      <p className="text-muted mt-2">
        Test accounts: host@test.com, player1@test.com, player2@test.com (password: 1234)
      </p>
    </div>
  )
}
