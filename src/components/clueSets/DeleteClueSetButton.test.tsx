/**
 * Test suite for DeleteClueSetButton component
 *
 * Tests delete functionality, confirmation dialogs, loading states,
 * error handling, and user authentication requirements.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DeleteClueSetButton } from './DeleteClueSetButton'
import { useAuth } from '../../contexts/AuthContext'
import { ClueSetService } from '../../services/clueSets/clueSetService'
import { mockUser } from '../../test/testUtils'

// Mock dependencies
jest.mock('../../contexts/AuthContext')
jest.mock('../../services/clueSets/clueSetService')

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockClueSetService = ClueSetService as jest.Mocked<typeof ClueSetService>

// Mock window.confirm
const mockConfirm = jest.fn()
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true
})

describe('DeleteClueSetButton', () => {
  const mockProps = {
    clueSetId: 'clue-set-123',
    clueSetName: 'Test Game',
    onDeleted: jest.fn(),
    onError: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockConfirm.mockClear()

    // Default auth state - user is logged in
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn()
    })
  })

  describe('Rendering', () => {
    it('should render delete button with correct text', () => {
      render(<DeleteClueSetButton {...mockProps} />)

      const button = screen.getByRole('button', { name: /delete clue set "test game"/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Delete Clue Set')
    })

    it('should have correct CSS class', () => {
      render(<DeleteClueSetButton {...mockProps} />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('delete-clue-set-button')
    })

    it('should have correct title attribute', () => {
      render(<DeleteClueSetButton {...mockProps} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'Delete "Test Game"')
    })

    it('should have correct aria-label', () => {
      render(<DeleteClueSetButton {...mockProps} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Delete clue set "Test Game"')
    })
  })

  describe('Authentication Requirements', () => {
    it('should call onError when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      render(<DeleteClueSetButton {...mockProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(mockProps.onError).toHaveBeenCalledWith('You must be logged in to delete clue sets')
      expect(mockConfirm).not.toHaveBeenCalled()
    })

    it('should not call onError when onError prop is not provided and user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      const propsWithoutOnError = {
        clueSetId: 'clue-set-123',
        clueSetName: 'Test Game',
        onDeleted: jest.fn()
      }

      render(<DeleteClueSetButton {...propsWithoutOnError} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Should not throw error when onError is not provided
      expect(mockConfirm).not.toHaveBeenCalled()
    })
  })

  describe('Confirmation Dialog', () => {
    it('should show confirmation dialog with correct message', async () => {
      render(<DeleteClueSetButton {...mockProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to delete "Test Game"?\n\nThis action cannot be undone. All clues and categories will be permanently removed.'
      )
    })

    it('should not proceed with deletion when user cancels confirmation', async () => {
      mockConfirm.mockReturnValue(false)

      render(<DeleteClueSetButton {...mockProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(mockConfirm).toHaveBeenCalled()
      expect(mockClueSetService.deleteClueSet).not.toHaveBeenCalled()
      expect(mockProps.onDeleted).not.toHaveBeenCalled()
    })

    it('should proceed with deletion when user confirms', async () => {
      mockConfirm.mockReturnValue(true)
      mockClueSetService.deleteClueSet.mockResolvedValue({ success: true })

      render(<DeleteClueSetButton {...mockProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(mockConfirm).toHaveBeenCalled()

      await waitFor(() => {
        expect(mockClueSetService.deleteClueSet).toHaveBeenCalledWith('clue-set-123', 'user-123')
      })
    })
  })

  describe('Deletion Process', () => {
    beforeEach(() => {
      mockConfirm.mockReturnValue(true)
    })

    it('should show loading state during deletion', async () => {
      let resolveDelete: ((value: { success: boolean }) => void) | undefined
      const deletePromise = new Promise<{ success: boolean }>((resolve) => {
        resolveDelete = resolve
      })
      mockClueSetService.deleteClueSet.mockReturnValue(deletePromise)

      render(<DeleteClueSetButton {...mockProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Should show loading state
      await waitFor(() => {
        expect(button).toHaveTextContent('Deleting...')
        expect(button).toBeDisabled()
      })

      // Resolve the promise
      if (resolveDelete) {
        resolveDelete({ success: true })
      }

      await waitFor(() => {
        expect(button).toHaveTextContent('Delete Clue Set')
        expect(button).not.toBeDisabled()
      })
    })

    it('should call onDeleted on successful deletion', async () => {
      mockClueSetService.deleteClueSet.mockResolvedValue({ success: true })

      render(<DeleteClueSetButton {...mockProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockProps.onDeleted).toHaveBeenCalled()
      })
      expect(mockProps.onError).not.toHaveBeenCalled()
    })

    it('should call onError when deletion fails with error message', async () => {
      mockClueSetService.deleteClueSet.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      })

      render(<DeleteClueSetButton {...mockProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockProps.onError).toHaveBeenCalledWith('Database connection failed')
      })
      expect(mockProps.onDeleted).not.toHaveBeenCalled()
    })

    it('should call onError with default message when deletion fails without error message', async () => {
      mockClueSetService.deleteClueSet.mockResolvedValue({ success: false })

      render(<DeleteClueSetButton {...mockProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockProps.onError).toHaveBeenCalledWith('Failed to delete clue set')
      })
    })

    it('should handle service throwing Error', async () => {
      mockClueSetService.deleteClueSet.mockRejectedValue(new Error('Network error'))

      render(<DeleteClueSetButton {...mockProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockProps.onError).toHaveBeenCalledWith('Network error')
      })
    })

    it('should handle service throwing non-Error exception', async () => {
      mockClueSetService.deleteClueSet.mockRejectedValue('String error')

      render(<DeleteClueSetButton {...mockProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockProps.onError).toHaveBeenCalledWith('Unknown error occurred')
      })
    })

    it('should not call onError when onError prop is not provided and deletion fails', async () => {
      const propsWithoutOnError = {
        clueSetId: 'clue-set-123',
        clueSetName: 'Test Game',
        onDeleted: jest.fn()
      }

      mockClueSetService.deleteClueSet.mockResolvedValue({
        success: false,
        error: 'Database error'
      })

      render(<DeleteClueSetButton {...propsWithoutOnError} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(propsWithoutOnError.onDeleted).not.toHaveBeenCalled()
      })
      // Should not throw error when onError is not provided
    })
  })

  describe('Edge Cases', () => {
    it('should handle special characters in clue set name', () => {
      const propsWithSpecialChars = {
        ...mockProps,
        clueSetName: 'Test "Game" & More!'
      }

      render(<DeleteClueSetButton {...propsWithSpecialChars} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'Delete "Test "Game" & More!"')
      expect(button).toHaveAttribute('aria-label', 'Delete clue set "Test "Game" & More!"')
    })

    it('should handle empty clue set name', () => {
      const propsWithEmptyName = {
        ...mockProps,
        clueSetName: ''
      }

      render(<DeleteClueSetButton {...propsWithEmptyName} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'Delete ""')
      expect(button).toHaveAttribute('aria-label', 'Delete clue set ""')
    })
  })
})
