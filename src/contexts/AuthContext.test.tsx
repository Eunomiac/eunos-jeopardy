import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { supabase } from '../services/supabase/client'
import type { Session } from '@supabase/supabase-js'
import type { Database } from '../services/supabase/types'
import { mockUser, mockSession } from '../test/testUtils'

// Mock Supabase client with proper typing (simplified approach)
jest.mock('../services/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn()
    },
    from: jest.fn().mockImplementation((table: keyof Database['public']['Tables']) => {
      // Table-specific defaults for AuthContext tests
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' } // No profile found by default
              })
            })
          }),
          insert: jest.fn().mockResolvedValue({ data: null, error: null })
        }
      }
      // Default mock for other tables
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null })
      }
    })
  }
}))

// Test component to access auth context
function TestComponent() {
  const { user, session, loading, login, logout } = useAuth()

  const handleLogin = async () => {
    try {
      await login('test@example.com', 'password')
    } catch {
      // Errors are expected in tests, just ignore them
    }
  }

  const handleLogout = async () => {
    try {
      logout()
    } catch {
      // Errors are expected in tests, just ignore them
    }
  }

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <div data-testid="session">{session ? 'has-session' : 'no-session'}</div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleLogout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  // Using consolidated mock data from commonTestData

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null
    })

    ;(supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
        })
      }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null })
    })
  })

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    expect(() => render(<TestComponent />)).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })

  it('should provide initial loading state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('loading')

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })
  })

  it('should handle no initial session', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
      expect(screen.getByTestId('session')).toHaveTextContent('no-session')
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })
  })

  it('should handle initial session with user', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('session')).toHaveTextContent('has-session')
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })
  })

  it('should handle successful login', async () => {
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    await act(async () => {
      screen.getByText('Login').click()
    })

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    })
  })

  it('should handle login error', async () => {
    const loginError = { message: 'Invalid credentials', name: 'AuthError' }
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: loginError
    })

    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    // The login function should be called and the error should be thrown internally
    await act(async () => {
      screen.getByText('Login').click()
    })

    // Verify that the login function was called with the error
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    })

    consoleSpy.mockRestore()
  })

  it('should handle logout', async () => {
    ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    await act(async () => {
      screen.getByText('Logout').click()
    })

    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('should handle logout error', async () => {
    const logoutError = { message: 'Logout failed', name: 'AuthError' }
    ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: logoutError
    })

    let testError: unknown = null

    function TestComponentForLogoutError() {
      const { user, session, loading, logout } = useAuth()

      const handleLogout = async () => {
        try {
          await logout()
        } catch (error) {
          testError = error
        }
      }

      return (
        <div>
          <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
          <div data-testid="user">{user ? user.email : 'no-user'}</div>
          <div data-testid="session">{session ? 'has-session' : 'no-session'}</div>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )
    }

    render(
      <AuthProvider>
        <TestComponentForLogoutError />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    // Trigger logout by clicking the button
    await act(async () => {
      screen.getByText('Logout').click()
    })

    // Wait for the error to be caught
    await waitFor(() => {
      expect(testError).toEqual(logoutError)
    })

    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('should handle auth state changes', async () => {
    let authStateCallback: (event: string, session: Session | null) => void

    ;(supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      authStateCallback = callback
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    // Simulate auth state change
    await act(async () => {
      authStateCallback('SIGNED_IN', mockSession)
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('session')).toHaveTextContent('has-session')
    })

    // Simulate sign out
    await act(async () => {
      authStateCallback('SIGNED_OUT', null)
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
      expect(screen.getByTestId('session')).toHaveTextContent('no-session')
    })
  })

  it('should create profile for new user', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    // Verify profile creation was attempted
    expect(supabase.from).toHaveBeenCalledWith('profiles')
  })

  it('should handle profile creation error gracefully', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null
    })

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'SOME_ERROR', message: 'Database error' }
          })
        })
      }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null })
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })

    // Should still work despite profile error
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
  })

  it('should unsubscribe from auth changes on unmount', () => {
    const unsubscribeMock = jest.fn()
    ;(supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: unsubscribeMock } }
    })

    const { unmount } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    unmount()

    expect(unsubscribeMock).toHaveBeenCalled()
  })
})
