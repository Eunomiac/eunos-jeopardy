import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Simple authentication component providing login/logout functionality for Euno's Jeopardy.
 *
 * This component serves as the primary authentication interface, displaying either
 * a login form for unauthenticated users or user information with logout option
 * for authenticated users. Designed for development and private use scenarios.
 *
 * **Key Features:**
 * - Dual-mode interface (login form vs. user info display)
 * - Email/password authentication via Supabase Auth
 * - Automatic form clearing on successful login
 * - Loading state management during authentication
 * - Test account information for development
 * - Jeopardy-themed styling and branding
 *
 * **Authentication Flow:**
 * 1. Unauthenticated: Shows login form with email/password fields
 * 2. User enters credentials and submits form
 * 3. AuthContext handles authentication via Supabase
 * 4. Authenticated: Shows user email and logout button
 * 5. Logout clears session and returns to login form
 *
 * **State Management:**
 * - email/password: Local form state for login credentials
 * - Uses AuthContext for global authentication state
 * - Automatic state cleanup on successful authentication
 *
 * **Development Features:**
 * - Includes test account credentials for easy development
 * - Simple error handling with console logging
 * - No complex validation or password reset functionality
 *
 * **Future Enhancements (Phase 4):**
 * - User registration functionality
 * - Password reset flow
 * - Email verification
 * - Enhanced error messaging
 * - Form validation and UX improvements
 *
 * @returns JSX element representing the authentication interface
 *
 * @example
 * ```typescript
 * // Used in App.tsx for authentication gate
 * {!user && (
 *   <div className="content-section">
 *     <SimpleLogin />
 *   </div>
 * )}
 *
 * // Used in header for authenticated users
 * {user && (
 *   <header className="app-top-header">
 *     <SimpleLogin />
 *   </header>
 * )}
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function SimpleLogin() {
  // Authentication context and state
  /** Authentication state and functions from AuthContext */
  const { user, login, logout, loading } = useAuth()

  // Local form state for login credentials
  /** Email input field value */
  const [email, setEmail] = useState('')

  /** Password input field value */
  const [password, setPassword] = useState('')

  /**
   * Handles form submission for user login.
   *
   * Processes the login form submission by calling the AuthContext login function
   * with the provided credentials. Includes form clearing on success and basic
   * error handling for development debugging.
   *
   * **Login Process:**
   * 1. Prevents default form submission behavior
   * 2. Calls AuthContext login with email/password
   * 3. Clears form fields on successful authentication
   * 4. Logs errors to console for debugging
   *
   * **Error Handling:**
   * - Basic console logging for development
   * - AuthContext handles user-facing error states
   * - Form remains populated on error for user convenience
   *
   * **Future Enhancement:**
   * - Could add user-friendly error messages
   * - Could add form validation feedback
   * - Could add loading states for submit button
   *
   * @param e - Form submission event
   */
  const handleLogin = async (e: React.FormEvent) => {
    // Prevent default form submission
    e.preventDefault()

    try {
      // Attempt authentication via AuthContext
      await login(email, password)

      // Clear form fields on successful login
      setEmail('')
      setPassword('')
    } catch (error) {
      // Log error for development debugging
      // AuthContext handles user-facing error states
      console.error('Login failed:', error)
    }
  }

  /**
   * Handles user logout by calling the AuthContext logout function.
   *
   * Simple wrapper around the AuthContext logout function that clears
   * the user session and returns to the unauthenticated state.
   *
   * **Logout Process:**
   * - Calls AuthContext logout function
   * - AuthContext handles session cleanup
   * - Component automatically re-renders to show login form
   */
  const handleLogout = () => {
    void logout()
  }

  // Loading state: Show loading indicator during authentication
  if (loading) {
    return <div>Loading...</div>
  }

  // Authenticated state: Show user info and logout option
  if (user) {
    return (
      <div className="login-info">
        <span className="login-text">Currently logged in as </span>
        {/* Display user email with Jeopardy styling */}
        <span className="user-email jeopardy-category">
          {user.email}
        </span>
        {/* Logout button with Jeopardy theme */}
        <button
          className="jeopardy-button logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    )
  }

  // Unauthenticated state: Show login form
  return (
    <div className="simple-login game-creator login-form">
      {/* Login form header with Jeopardy styling */}
      <h3 className="jeopardy-category login-title">
        Login
      </h3>

      {/* Login form with email/password fields */}
      <form onSubmit={(e) => { void handleLogin(e) }}>
        {/* Email input field */}
        <div className="form-group">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); }}
            required
            className="jeopardy-input"
          />
        </div>

        {/* Password input field */}
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
            required
            className="jeopardy-input"
          />
        </div>

        {/* Submit button with full-width styling */}
        <button
          type="submit"
          className="jeopardy-button full-width"
        >
          Login
        </button>
      </form>

      {/* Development helper text with test account credentials */}
      <p className="jeopardy-category login-help-text">
        Test accounts: host@test.com, player1@test.com, player2@test.com (password: 1234)
      </p>
    </div>
  )
}
