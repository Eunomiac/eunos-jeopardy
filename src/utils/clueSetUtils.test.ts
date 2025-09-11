import {
  filenameToDisplayName,
  getAvailableClueSets,
  getClueSetURL
} from './clueSetUtils'

describe('clueSetUtils', () => {
  describe('filenameToDisplayName', () => {
    it('should convert basic filename to display name', () => {
      expect(filenameToDisplayName('test-game-1.csv')).toBe('Test Game 1')
    })

    it('should handle underscores in filename', () => {
      expect(filenameToDisplayName('world_capitals_easy.csv')).toBe('World Capitals Easy')
    })

    it('should handle mixed hyphens and underscores', () => {
      expect(filenameToDisplayName('before-and-after_2024.csv')).toBe('Before And After 2024')
    })

    it('should handle filename without extension', () => {
      expect(filenameToDisplayName('test-game-1')).toBe('Test Game 1')
    })

    it('should handle uppercase CSV extension', () => {
      expect(filenameToDisplayName('test-game-1.CSV')).toBe('Test Game 1')
    })

    it('should handle mixed case CSV extension', () => {
      expect(filenameToDisplayName('test-game-1.CsV')).toBe('Test Game 1')
    })

    it('should handle single word filename', () => {
      expect(filenameToDisplayName('science.csv')).toBe('Science')
    })

    it('should handle filename with numbers', () => {
      expect(filenameToDisplayName('game-2024-round-1.csv')).toBe('Game 2024 Round 1')
    })

    it('should handle filename with multiple consecutive separators', () => {
      expect(filenameToDisplayName('test--game__1.csv')).toBe('Test  Game  1')
    })

    it('should handle empty filename', () => {
      expect(filenameToDisplayName('.csv')).toBe('')
    })

    it('should handle filename with only separators', () => {
      expect(filenameToDisplayName('---___.csv')).toBe('      ')
    })

    it('should preserve proper capitalization patterns', () => {
      expect(filenameToDisplayName('tv-shows-and-movies.csv')).toBe('Tv Shows And Movies')
    })

    it('should handle special characters in title case', () => {
      expect(filenameToDisplayName('before-and-after.csv')).toBe('Before And After')
    })
  })

  describe('getAvailableClueSets', () => {
    it('should return array of available clue sets', () => {
      const clueSets = getAvailableClueSets()

      expect(Array.isArray(clueSets)).toBe(true)
      expect(clueSets.length).toBeGreaterThan(0)
    })

    it('should include test-game-1.csv', () => {
      const clueSets = getAvailableClueSets()

      expect(clueSets).toContain('test-game-1.csv')
    })

    it('should return consistent results on multiple calls', () => {
      const clueSets1 = getAvailableClueSets()
      const clueSets2 = getAvailableClueSets()

      expect(clueSets1).toEqual(clueSets2)
    })

    it('should return only CSV files', () => {
      const clueSets = getAvailableClueSets()

      clueSets.forEach((filename: string) => {
        expect(filename).toMatch(/\.csv$/i)
      })
    })
  })

  describe('getClueSetURL', () => {
    it('should generate correct URL for clue set file', () => {
      const url = getClueSetURL('test-game-1.csv')

      expect(url).toBe('/clue-sets/test-game-1.csv')
    })

    it('should handle different filenames', () => {
      expect(getClueSetURL('world-capitals.csv')).toBe('/clue-sets/world-capitals.csv')
      expect(getClueSetURL('science_facts.csv')).toBe('/clue-sets/science_facts.csv')
    })

    it('should handle filenames with special characters', () => {
      expect(getClueSetURL('before-and-after_2024.csv')).toBe('/clue-sets/before-and-after_2024.csv')
    })

    it('should handle empty filename', () => {
      expect(getClueSetURL('')).toBe('/clue-sets/')
    })

    it('should not modify the filename', () => {
      const filename = 'Test-Game-1.CSV'
      expect(getClueSetURL(filename)).toBe('/clue-sets/Test-Game-1.CSV')
    })

    it('should handle filenames without extension', () => {
      expect(getClueSetURL('test-game-1')).toBe('/clue-sets/test-game-1')
    })

    it('should handle filenames with path separators', () => {
      // Note: This tests the current behavior, but in practice we might want to sanitize this
      expect(getClueSetURL('folder/test-game-1.csv')).toBe('/clue-sets/folder/test-game-1.csv')
    })
  })

  describe('integration tests', () => {
    it('should work together for available clue sets', () => {
      const clueSets = getAvailableClueSets()

      clueSets.forEach((filename: string) => {
        // Should be able to generate display name
        const displayName = filenameToDisplayName(filename)
        expect(displayName).toBeTruthy()
        expect(typeof displayName).toBe('string')

        // Should be able to generate URL
        const url = getClueSetURL(filename)
        expect(url).toMatch(/^\/clue-sets\//)
        expect(url).toContain(filename)
      })
    })

    it('should handle round-trip conversion consistently', () => {
      const testFilenames = [
        'test-game-1.csv',
        'world_capitals_easy.csv',
        'before-and-after_2024.csv',
        'science.csv'
      ]

      testFilenames.forEach((filename: string) => {
        const displayName = filenameToDisplayName(filename)
        const url = getClueSetURL(filename)

        // Display name should be human-readable
        expect(displayName).not.toContain('-')
        expect(displayName).not.toContain('_')
        expect(displayName).not.toContain('.csv')

        // URL should contain original filename
        expect(url).toContain(filename)
      })
    })
  })
})
