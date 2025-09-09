import { 
  filenameToDisplayName, 
  getAvailableQuestionSets, 
  getQuestionSetURL 
} from './questionSetUtils'

describe('questionSetUtils', () => {
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

  describe('getAvailableQuestionSets', () => {
    it('should return array of available question sets', () => {
      const questionSets = getAvailableQuestionSets()
      
      expect(Array.isArray(questionSets)).toBe(true)
      expect(questionSets.length).toBeGreaterThan(0)
    })

    it('should include test-game-1.csv', () => {
      const questionSets = getAvailableQuestionSets()
      
      expect(questionSets).toContain('test-game-1.csv')
    })

    it('should return consistent results on multiple calls', () => {
      const questionSets1 = getAvailableQuestionSets()
      const questionSets2 = getAvailableQuestionSets()
      
      expect(questionSets1).toEqual(questionSets2)
    })

    it('should return only CSV files', () => {
      const questionSets = getAvailableQuestionSets()
      
      questionSets.forEach(filename => {
        expect(filename).toMatch(/\.csv$/i)
      })
    })
  })

  describe('getQuestionSetURL', () => {
    it('should generate correct URL for question set file', () => {
      const url = getQuestionSetURL('test-game-1.csv')
      
      expect(url).toBe('/clue-sets/test-game-1.csv')
    })

    it('should handle different filenames', () => {
      expect(getQuestionSetURL('world-capitals.csv')).toBe('/clue-sets/world-capitals.csv')
      expect(getQuestionSetURL('science_facts.csv')).toBe('/clue-sets/science_facts.csv')
    })

    it('should handle filenames with special characters', () => {
      expect(getQuestionSetURL('before-and-after_2024.csv')).toBe('/clue-sets/before-and-after_2024.csv')
    })

    it('should handle empty filename', () => {
      expect(getQuestionSetURL('')).toBe('/clue-sets/')
    })

    it('should not modify the filename', () => {
      const filename = 'Test-Game-1.CSV'
      expect(getQuestionSetURL(filename)).toBe('/clue-sets/Test-Game-1.CSV')
    })

    it('should handle filenames without extension', () => {
      expect(getQuestionSetURL('test-game-1')).toBe('/clue-sets/test-game-1')
    })

    it('should handle filenames with path separators', () => {
      // Note: This tests the current behavior, but in practice we might want to sanitize this
      expect(getQuestionSetURL('folder/test-game-1.csv')).toBe('/clue-sets/folder/test-game-1.csv')
    })
  })

  describe('integration tests', () => {
    it('should work together for available question sets', () => {
      const questionSets = getAvailableQuestionSets()
      
      questionSets.forEach(filename => {
        // Should be able to generate display name
        const displayName = filenameToDisplayName(filename)
        expect(displayName).toBeTruthy()
        expect(typeof displayName).toBe('string')
        
        // Should be able to generate URL
        const url = getQuestionSetURL(filename)
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
      
      testFilenames.forEach(filename => {
        const displayName = filenameToDisplayName(filename)
        const url = getQuestionSetURL(filename)
        
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
