import { render, screen, fireEvent } from '@testing-library/react'
import { PlayerBuzzer } from './PlayerBuzzer'
import { BuzzerState } from '../../types/BuzzerState'

describe('PlayerBuzzer', () => {
  const mockOnBuzz = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Buzzer States', () => {
    it('should render unlocked buzzer', () => {
      render(
        <PlayerBuzzer
          state={BuzzerState.UNLOCKED}
          onBuzz={mockOnBuzz}
        />
      )

      const buzzer = screen.getByRole('button', { name: /buzz in/i })
      expect(buzzer).toBeInTheDocument()
      expect(buzzer).not.toBeDisabled()
      expect(buzzer).toHaveClass('buzzer-unlocked')
    })

    it('should render locked buzzer', () => {
      render(
        <PlayerBuzzer
          state={BuzzerState.LOCKED}
          onBuzz={mockOnBuzz}
        />
      )

      const buzzer = screen.getByRole('button', { name: /wait for host/i })
      expect(buzzer).toBeDisabled()
      expect(buzzer).toHaveClass('buzzer-locked')
    })

    it('should render frozen buzzer', () => {
      render(
        <PlayerBuzzer
          state={BuzzerState.FROZEN}
          onBuzz={mockOnBuzz}
        />
      )

      const buzzer = screen.getByRole('button', { name: /too early/i })
      expect(buzzer).toBeDisabled()
      expect(buzzer).toHaveClass('buzzer-frozen')
    })

    it('should render buzzed state', () => {
      render(
        <PlayerBuzzer
          state={BuzzerState.BUZZED}
          onBuzz={mockOnBuzz}
        />
      )

      const buzzer = screen.getByRole('button', { name: /buzzed/i })
      expect(buzzer).toBeDisabled()
      expect(buzzer).toHaveClass('buzzer-buzzed')
    })
  })

  describe('Buzzer Interaction', () => {
    it('should call onBuzz when clicked and unlocked', () => {
      render(
        <PlayerBuzzer
          state={BuzzerState.UNLOCKED}
          onBuzz={mockOnBuzz}
        />
      )

      const buzzer = screen.getByRole('button', { name: /buzz in/i })
      fireEvent.click(buzzer)

      expect(mockOnBuzz).toHaveBeenCalledTimes(1)
    })

    it('should not call onBuzz when locked', () => {
      render(
        <PlayerBuzzer
          state={BuzzerState.LOCKED}
          onBuzz={mockOnBuzz}
        />
      )

      const buzzer = screen.getByRole('button', { name: /wait for host/i })
      fireEvent.click(buzzer)

      expect(mockOnBuzz).not.toHaveBeenCalled()
    })


  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <PlayerBuzzer
          state={BuzzerState.UNLOCKED}
          onBuzz={mockOnBuzz}
        />
      )

      const buzzer = screen.getByRole('button', { name: /buzz in/i })
      expect(buzzer).toHaveAttribute('aria-label')
      expect(buzzer).toHaveAttribute('type', 'button')
    })

    it('should indicate locked state to screen readers', () => {
      render(
        <PlayerBuzzer
          state={BuzzerState.LOCKED}
          onBuzz={mockOnBuzz}
        />
      )

      const buzzer = screen.getByRole('button', { name: /wait for host/i })
      expect(buzzer).toHaveAttribute('disabled')
    })
  })

  describe('Visual States', () => {
    it('should display correct text for each state', () => {
      const states = [
        { state: BuzzerState.UNLOCKED, expectedText: 'BUZZ IN!' },
        { state: BuzzerState.LOCKED, expectedText: 'Wait for host...' },
        { state: BuzzerState.FROZEN, expectedText: 'Too early - wait...' },
        { state: BuzzerState.BUZZED, expectedText: 'Buzzed!' }
      ]

      states.forEach(({ state, expectedText }) => {
        const { unmount } = render(
          <PlayerBuzzer
            state={state}
            onBuzz={mockOnBuzz}
          />
        )

        expect(screen.getByText(expectedText)).toBeInTheDocument()
        unmount()
      })
    })

    it('should apply correct CSS classes for each state', () => {
      const states = [
        { state: BuzzerState.UNLOCKED, expectedClass: 'buzzer-unlocked' },
        { state: BuzzerState.LOCKED, expectedClass: 'buzzer-locked' },
        { state: BuzzerState.FROZEN, expectedClass: 'buzzer-frozen' },
        { state: BuzzerState.BUZZED, expectedClass: 'buzzer-buzzed' }
      ]

      states.forEach(({ state, expectedClass }) => {
        const { unmount } = render(
          <PlayerBuzzer
            state={state}
            onBuzz={mockOnBuzz}
          />
        )

        const buzzer = screen.getByRole('button')
        expect(buzzer).toHaveClass(expectedClass)
        unmount()
      })
    })
  })
})
