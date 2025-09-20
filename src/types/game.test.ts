import { isValidRoundType, isValidGameStatus } from './game'

describe('game types', () => {
  describe('isValidRoundType', () => {
    it('should return true for valid round types', () => {
      expect(isValidRoundType('jeopardy')).toBe(true)
      expect(isValidRoundType('double')).toBe(true)
      expect(isValidRoundType('final')).toBe(true)
    })

    it('should return false for invalid round types', () => {
      expect(isValidRoundType('invalid')).toBe(false)
      expect(isValidRoundType('JEOPARDY')).toBe(false)
      expect(isValidRoundType('Double')).toBe(false)
      expect(isValidRoundType('FINAL')).toBe(false)
      expect(isValidRoundType('')).toBe(false)
      expect(isValidRoundType('round')).toBe(false)
      expect(isValidRoundType('game')).toBe(false)
    })

    it('should return false for non-string values', () => {
      expect(isValidRoundType(null)).toBe(false)
      expect(isValidRoundType(undefined)).toBe(false)
      expect(isValidRoundType(123)).toBe(false)
      expect(isValidRoundType(true)).toBe(false)
      expect(isValidRoundType({})).toBe(false)
      expect(isValidRoundType([])).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidRoundType(' jeopardy ')).toBe(false) // with spaces
      expect(isValidRoundType('jeopardy\n')).toBe(false) // with newline
      expect(isValidRoundType('jeopardy\t')).toBe(false) // with tab
    })

    it('should be case sensitive', () => {
      expect(isValidRoundType('Jeopardy')).toBe(false)
      expect(isValidRoundType('DOUBLE')).toBe(false)
      expect(isValidRoundType('Final')).toBe(false)
      expect(isValidRoundType('JeOpArDy')).toBe(false)
    })

    it('should work as type guard', () => {
      const testValue: string = 'jeopardy'

      if (isValidRoundType(testValue)) {
        // TypeScript should know testValue is RoundType here
        const roundType: RoundType = testValue
        expect(roundType).toBe('jeopardy')
      }
    })
  })

  describe('isValidGameStatus', () => {
    it('should return true for valid game statuses', () => {
      expect(isValidGameStatus('lobby')).toBe(true)
      expect(isValidGameStatus('game_intro')).toBe(true)
      expect(isValidGameStatus('introducing_categories')).toBe(true)
      expect(isValidGameStatus('in_progress')).toBe(true)
      expect(isValidGameStatus('completed')).toBe(true)
      expect(isValidGameStatus('cancelled')).toBe(true)
    })

    it('should return false for invalid game statuses', () => {
      expect(isValidGameStatus('invalid')).toBe(false)
      expect(isValidGameStatus('LOBBY')).toBe(false)
      expect(isValidGameStatus('In_Progress')).toBe(false)
      expect(isValidGameStatus('COMPLETED')).toBe(false)
      expect(isValidGameStatus('CANCELLED')).toBe(false)
      expect(isValidGameStatus('')).toBe(false)
      expect(isValidGameStatus('pending')).toBe(false)
      expect(isValidGameStatus('active')).toBe(false)
      expect(isValidGameStatus('finished')).toBe(false)
    })

    it('should return false for non-string values', () => {
      expect(isValidGameStatus(null)).toBe(false)
      expect(isValidGameStatus(undefined)).toBe(false)
      expect(isValidGameStatus(123)).toBe(false)
      expect(isValidGameStatus(true)).toBe(false)
      expect(isValidGameStatus({})).toBe(false)
      expect(isValidGameStatus([])).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidGameStatus(' lobby ')).toBe(false) // with spaces
      expect(isValidGameStatus('lobby\n')).toBe(false) // with newline
      expect(isValidGameStatus('lobby\t')).toBe(false) // with tab
      expect(isValidGameStatus('in progress')).toBe(false) // space instead of underscore
      expect(isValidGameStatus('in-progress')).toBe(false) // hyphen instead of underscore
    })

    it('should be case sensitive', () => {
      expect(isValidGameStatus('Lobby')).toBe(false)
      expect(isValidGameStatus('IN_PROGRESS')).toBe(false)
      expect(isValidGameStatus('Completed')).toBe(false)
      expect(isValidGameStatus('Cancelled')).toBe(false)
      expect(isValidGameStatus('LoBbY')).toBe(false)
    })

    it('should work as type guard', () => {
      const testValue: string = 'in_progress'

      if (isValidGameStatus(testValue)) {
        // TypeScript should know testValue is GameStatus here
        const gameStatus: GameStatus = testValue
        expect(gameStatus).toBe('in_progress')
      }
    })

    it('should handle underscore variations correctly', () => {
      expect(isValidGameStatus('in_progress')).toBe(true)
      expect(isValidGameStatus('inprogress')).toBe(false)
      expect(isValidGameStatus('in__progress')).toBe(false)
      expect(isValidGameStatus('_in_progress')).toBe(false)
      expect(isValidGameStatus('in_progress_')).toBe(false)
    })
  })

  describe('type guard integration', () => {
    it('should work together for validation', () => {
      const roundValues = ['jeopardy', 'double', 'final', 'invalid']
      const statusValues = ['lobby', 'in_progress', 'completed', 'cancelled', 'invalid']

      const validRounds = roundValues.filter(isValidRoundType)
      const validStatuses = statusValues.filter(isValidGameStatus)

      expect(validRounds).toEqual(['jeopardy', 'double', 'final'])
      expect(validStatuses).toEqual(['lobby', 'in_progress', 'completed', 'cancelled'])
    })

    it('should handle mixed type validation', () => {
      const mixedValues = [
        'jeopardy',    // valid round
        'lobby',       // valid status
        'invalid',     // invalid for both
        'double',      // valid round
        'completed',   // valid status
        123,           // invalid type
        null           // invalid type
      ]

      const validRounds = mixedValues.filter((val): val is RoundType =>
        typeof val === 'string' && isValidRoundType(val)
      )

      const validStatuses = mixedValues.filter((val): val is GameStatus =>
        typeof val === 'string' && isValidGameStatus(val)
      )

      expect(validRounds).toEqual(['jeopardy', 'double'])
      expect(validStatuses).toEqual(['lobby', 'completed'])
    })
  })

  describe('performance and edge cases', () => {
    it('should handle large number of validations efficiently', () => {
      const start = performance.now()

      for (let i = 0; i < 10000; i++) {
        isValidRoundType('jeopardy')
        isValidRoundType('invalid')
        isValidGameStatus('lobby')
        isValidGameStatus('invalid')
      }

      const end = performance.now()
      const duration = end - start

      // Should complete in reasonable time (less than 100ms for 40k validations)
      expect(duration).toBeLessThan(100)
    })

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000)

      expect(isValidRoundType(longString)).toBe(false)
      expect(isValidGameStatus(longString)).toBe(false)
    })

    it('should handle special characters', () => {
      const specialChars = ['jeopardy!', 'jeopardy?', 'jeopardy.', 'jeopardy,', 'jeopardy;']

      specialChars.forEach(char => {
        expect(isValidRoundType(char)).toBe(false)
        expect(isValidGameStatus(char)).toBe(false)
      })
    })

    it('should handle unicode characters', () => {
      const unicodeStrings = ['jéopardy', 'jeopardy™', 'jeopardy®', 'jeopardy©']

      unicodeStrings.forEach(str => {
        expect(isValidRoundType(str)).toBe(false)
        expect(isValidGameStatus(str)).toBe(false)
      })
    })
  })
})
