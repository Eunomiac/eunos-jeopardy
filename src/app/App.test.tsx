import { render, screen, fireEvent } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('renders the project name', () => {
    render(<App />)

    // Note: In a real project, replace this with the actual project name
    expect(screen.getByText("Euno's Jeopardy")).toBeInTheDocument()
  })

  it('renders welcome message', () => {
    render(<App />)

    expect(screen.getByText('Welcome to your new project!')).toBeInTheDocument()
    expect(screen.getByText(/This is a template React application/)).toBeInTheDocument()
  })

  it('displays initial count of 0', () => {
    render(<App />)

    expect(screen.getByText('Count: 0')).toBeInTheDocument()
  })

  it('increments count when + button is clicked', () => {
    render(<App />)

    const incrementButton = screen.getByText('+')
    fireEvent.click(incrementButton)

    expect(screen.getByText('Count: 1')).toBeInTheDocument()
  })

  it('decrements count when - button is clicked', () => {
    render(<App />)

    const decrementButton = screen.getByText('-')
    fireEvent.click(decrementButton)

    expect(screen.getByText('Count: -1')).toBeInTheDocument()
  })

  it('renders footer with copyright', () => {
    render(<App />)

    expect(screen.getByText(/© 2025.*Built with React/)).toBeInTheDocument()
  })
})
