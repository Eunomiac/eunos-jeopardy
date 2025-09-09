import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

    expect(screen.getByText("Euno's Jeopardy")).toBeInTheDocument()
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

  it('displays initial count of 0 when authenticated', () => {
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

    expect(screen.getByText('Count: 0')).toBeInTheDocument()
  })

  it('increments count when + button is clicked', () => {
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

    const incrementButton = screen.getByText('+')
    fireEvent.click(incrementButton)

    expect(screen.getByText('Count: 1')).toBeInTheDocument()
  })

  it('decrements count when - button is clicked', () => {
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

    const decrementButton = screen.getByText('-')
    fireEvent.click(decrementButton)

    expect(screen.getByText('Count: -1')).toBeInTheDocument()
  })

  it('renders footer with copyright', () => {
    renderWithAuth(<App />)

    expect(screen.getByText(/© 2025.*Built with React/)).toBeInTheDocument()
  })

  it('shows welcome message and user email when authenticated', () => {
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

    expect(screen.getByText("Welcome to Euno's Jeopardy!")).toBeInTheDocument()
    // Use getAllByText since the email appears in multiple places
    expect(screen.getAllByText('test@example.com')).toHaveLength(2)
  })
})
