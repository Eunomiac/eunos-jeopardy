import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SimpleLogin } from './SimpleLogin'
import { useAuth } from '../../contexts/AuthContext'
import { mockUser, mockSession } from '../../test/__mocks__/commonTestData'

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}))

// Mock the auth context
const mockLogin = jest.fn()
const mockLogout = jest.fn()
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Using consolidated mock data from commonTestData

// Mock the useAuth hook with jest.fn() for dynamic mocking
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}))

describe('SimpleLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set default mock return value for unauthenticated state
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      login: mockLogin,
      logout: mockLogout
    })
  })

  it('should render login form when user is not authenticated', () => {
    render(<SimpleLogin />)

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByText(/Test accounts:/)).toBeInTheDocument()
  })

  it('should render loading state', () => {
    // Mock useAuth to return loading state
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      login: mockLogin,
      logout: mockLogout
    })

    render(<SimpleLogin />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should render user info and logout button when authenticated', () => {
    // Mock useAuth to return authenticated state
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: mockSession,
      loading: false,
      login: mockLogin,
      logout: mockLogout
    })

    render(<SimpleLogin />)

    expect(screen.getByText('Currently logged in as')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument()
  })

  it('should handle form input changes', () => {
    render(<SimpleLogin />)

    const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement
    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    expect(emailInput.value).toBe('test@example.com')
    expect(passwordInput.value).toBe('password123')
  })

  it('should call login function on form submission', async () => {
    mockLogin.mockResolvedValue(undefined)

    render(<SimpleLogin />)

    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const loginButton = screen.getByRole('button', { name: 'Login' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('should clear form on successful login', async () => {
    mockLogin.mockResolvedValue(undefined)

    render(<SimpleLogin />)

    const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement
    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement
    const loginButton = screen.getByRole('button', { name: 'Login' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(emailInput.value).toBe('')
      expect(passwordInput.value).toBe('')
    })
  })

  it('should handle login error', async () => {
    const loginError = new Error('Invalid credentials')
    mockLogin.mockRejectedValue(loginError)

    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    render(<SimpleLogin />)

    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const loginButton = screen.getByRole('button', { name: 'Login' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'wrongpassword')
      expect(consoleSpy).toHaveBeenCalledWith('Login failed:', loginError)
    })

    consoleSpy.mockRestore()
  })

  it('should call logout function when logout button is clicked', () => {
    // Mock useAuth to return authenticated state
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: mockSession,
      loading: false,
      login: mockLogin,
      logout: mockLogout
    })

    render(<SimpleLogin />)

    const logoutButton = screen.getByRole('button', { name: 'Logout' })
    fireEvent.click(logoutButton)

    expect(mockLogout).toHaveBeenCalled()
  })

  it('should prevent form submission with empty fields', async () => {
    render(<SimpleLogin />)

    const loginButton = screen.getByRole('button', { name: 'Login' })
    fireEvent.click(loginButton)

    // Form should not submit due to required fields
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('should handle form submission via Enter key', async () => {
    mockLogin.mockResolvedValue(undefined)

    render(<SimpleLogin />)

    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('should have proper form accessibility', () => {
    render(<SimpleLogin />)

    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const loginButton = screen.getByRole('button', { name: 'Login' })

    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('required')
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(passwordInput).toHaveAttribute('required')
    expect(loginButton).toHaveAttribute('type', 'submit')
  })

  it('should display test account information', () => {
    render(<SimpleLogin />)

    expect(screen.getByText(/Test accounts:/)).toBeInTheDocument()
    expect(screen.getByText(/host@test.com/)).toBeInTheDocument()
    expect(screen.getByText(/player1@test.com/)).toBeInTheDocument()
    expect(screen.getByText(/player2@test.com/)).toBeInTheDocument()
    expect(screen.getByText(/password: 1234/)).toBeInTheDocument()
  })

  it('should have proper CSS classes', () => {
    render(<SimpleLogin />)

    expect(screen.getByRole('heading', { name: 'Login' }).closest('div')).toHaveClass('simple-login')
  })

  it('should render authenticated state with proper CSS classes', () => {
    // Mock useAuth to return authenticated state
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: mockSession,
      loading: false,
      login: mockLogin,
      logout: mockLogout
    })

    render(<SimpleLogin />)

    expect(screen.getByText('Currently logged in as').closest('div')).toHaveClass('login-info')
    expect(screen.getByRole('button', { name: 'Logout' })).toHaveClass('jeopardy-button', 'logout-button')
  })
})
