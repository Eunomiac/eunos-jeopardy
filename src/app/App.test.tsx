import { render, screen, waitFor } from '@testing-library/react'
import { App } from './App'
import { AuthProvider } from '../contexts/AuthContext'

// Helper function to render App with AuthProvider
const renderWithAuth = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>{ui}</AuthProvider>
  )
}

describe('App', () => {
  it('renders the project name', () => {
    renderWithAuth(<App />)

    expect(screen.getByText("Eunomiac's")).toBeInTheDocument()
    expect(screen.getByText("Jeopardy!")).toBeInTheDocument()
  })

  it('renders login form when user is not authenticated', async () => {
    renderWithAuth(<App />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('displays clue set selector when authenticated', () => {
    // Mock authenticated user
    const mockUser = { id: '1', email: 'test@example.com' }
    jest.spyOn(require('../contexts/AuthContext'), 'useAuth').mockReturnValue({
      user: mockUser,
      session: { user: mockUser },
      loading: false,
      login: jest.fn(),
      logout: jest.fn()
    })

    renderWithAuth(<App />)

    expect(screen.getByText('Clue Sets')).toBeInTheDocument()
    expect(screen.getByText('Host Game')).toBeInTheDocument()
  })



  it('renders footer with copyright', () => {
    renderWithAuth(<App />)

    expect(screen.getByText(/© 2025.*Built with React/)).toBeInTheDocument()
  })

  it('shows user email when authenticated', () => {
    // Mock authenticated user
    const mockUser = { id: '1', email: 'test@example.com' }
    jest.spyOn(require('../contexts/AuthContext'), 'useAuth').mockReturnValue({
      user: mockUser,
      session: { user: mockUser },
      loading: false,
      login: jest.fn(),
      logout: jest.fn()
    })

    renderWithAuth(<App />)

    expect(screen.getByText('Currently logged in as')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })
})
