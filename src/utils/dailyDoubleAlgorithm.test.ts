import {
  generateDailyDoublePositions,
  processDailyDoubles,
  type RoundData
} from './dailyDoubleAlgorithm'

describe('dailyDoubleAlgorithm', () => {
  describe('generateDailyDoublePositions', () => {
    it('should generate 1 Daily Double for Jeopardy round', () => {
      const positions = generateDailyDoublePositions('jeopardy')

      expect(positions).toHaveLength(1)
      expect(positions[0]).toHaveProperty('category')
      expect(positions[0]).toHaveProperty('row')
      expect(positions[0].category).toBeGreaterThanOrEqual(1)
      expect(positions[0].category).toBeLessThanOrEqual(6)
      expect(positions[0].row).toBeGreaterThanOrEqual(1)
      expect(positions[0].row).toBeLessThanOrEqual(5)
    })

    it('should generate 2 Daily Doubles for Double Jeopardy round', () => {
      const positions = generateDailyDoublePositions('double')

      expect(positions).toHaveLength(2)

      // Check that both positions are valid
      positions.forEach(position => {
        expect(position.category).toBeGreaterThanOrEqual(1)
        expect(position.category).toBeLessThanOrEqual(6)
        expect(position.row).toBeGreaterThanOrEqual(1)
        expect(position.row).toBeLessThanOrEqual(5)
      })

      // Check that Daily Doubles are in different categories
      expect(positions[0].category).not.toBe(positions[1].category)
    })

    it('should never place Daily Double in row 1', () => {
      // Run multiple times to ensure row 1 is never selected
      for (let i = 0; i < 100; i++) {
        const positions = generateDailyDoublePositions('jeopardy')
        expect(positions[0].row).not.toBe(1)
      }
    })

    it('should generate different positions on multiple calls', () => {
      const positions1 = generateDailyDoublePositions('jeopardy')
      const positions2 = generateDailyDoublePositions('jeopardy')
      const positions3 = generateDailyDoublePositions('jeopardy')

      // With randomness, at least one should be different
      const allSame = (
        positions1[0].category === positions2[0].category &&
        positions1[0].row === positions2[0].row &&
        positions2[0].category === positions3[0].category &&
        positions2[0].row === positions3[0].row
      )

      expect(allSame).toBe(false)
    })

    it('should respect probability distribution over many runs', () => {
      const rowCounts = { 2: 0, 3: 0, 4: 0, 5: 0 }
      const runs = 1000

      for (let i = 0; i < runs; i++) {
        const positions = generateDailyDoublePositions('jeopardy')
        rowCounts[positions[0].row as keyof typeof rowCounts]++
      }

      // Row 4 should be most common (39% probability)
      expect(rowCounts[4]).toBeGreaterThan(rowCounts[2])
      expect(rowCounts[4]).toBeGreaterThan(rowCounts[3])
      expect(rowCounts[4]).toBeGreaterThan(rowCounts[5])

      // Row 2 should be least common (9% probability)
      expect(rowCounts[2]).toBeLessThan(rowCounts[3])
      expect(rowCounts[2]).toBeLessThan(rowCounts[4])
      expect(rowCounts[2]).toBeLessThan(rowCounts[5])
    })
  })

  describe('processDailyDoubles', () => {
    const createValidRoundData = (round: 'jeopardy' | 'double'): RoundData => ({
      round,
      categories: Array.from({ length: 6 }, (_, i) => `Category ${i + 1}`),
      clues: Array.from({ length: 30 }, (_, i) => ({
        category: Math.floor(i / 5) + 1, // 6 categories, 5 clues each
        row: (i % 5) + 1,
        value: ((i % 5) + 1) * (round === 'jeopardy' ? 200 : 400),
        prompt: `Prompt ${Math.floor(i / 5) + 1}-${(i % 5) + 1}`,
        response: `Response ${Math.floor(i / 5) + 1}-${(i % 5) + 1}`
      }))
    })

    it('should successfully process valid Jeopardy round', () => {
      const roundData = createValidRoundData('jeopardy')

      const result = processDailyDoubles(roundData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.dailyDoublePositions).toHaveLength(1)
      expect(result.errors).toBeUndefined()
    })

    it('should successfully process valid Double Jeopardy round', () => {
      const roundData = createValidRoundData('double')

      const result = processDailyDoubles(roundData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.dailyDoublePositions).toHaveLength(2)
      expect(result.errors).toBeUndefined()
    })

    it('should mark correct clues as Daily Doubles', () => {
      const roundData = createValidRoundData('jeopardy')

      const result = processDailyDoubles(roundData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()

      if (result.data) {
        const position = result.data.dailyDoublePositions[0]

        // Verify that the Daily Double position is valid
        expect(position.category).toBeGreaterThanOrEqual(1)
        expect(position.category).toBeLessThanOrEqual(6)
        expect(position.row).toBeGreaterThanOrEqual(2) // Never row 1
        expect(position.row).toBeLessThanOrEqual(5)

        // Verify that the clue exists at that position
        const clueAtPosition = result.data.clues.find(clue =>
          clue.category === position.category && clue.row === position.row
        )
        expect(clueAtPosition).toBeDefined()

        // Check that only one Daily Double position is generated
        expect(result.data.dailyDoublePositions).toHaveLength(1)
      }
    })

    it('should fail validation for invalid round structure - wrong category count', () => {
      const invalidRoundData: RoundData = {
        round: 'jeopardy',
        categories: Array.from({ length: 5 }, (_, i) => `Category ${i + 1}`), // Only 5 categories instead of 6
        clues: Array.from({ length: 25 }, (_, i) => ({
          category: Math.floor(i / 5) + 1,
          row: (i % 5) + 1,
          value: ((i % 5) + 1) * 200,
          prompt: `Prompt ${Math.floor(i / 5) + 1}-${(i % 5) + 1}`,
          response: `Response ${Math.floor(i / 5) + 1}-${(i % 5) + 1}`
        }))
      }

      const result = processDailyDoubles(invalidRoundData)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0]).toContain('Expected 6 categories, found 5')
      expect(result.data).toBeUndefined()
    })

    it('should fail validation for invalid round structure - wrong clue count', () => {
      const invalidRoundData: RoundData = {
        round: 'jeopardy',
        categories: Array.from({ length: 6 }, (_, i) => `Category ${i + 1}`),
        clues: Array.from({ length: 24 }, (_, i) => ({ // Only 24 clues instead of 30
          category: Math.floor(i / 4) + 1,
          row: (i % 4) + 1,
          value: ((i % 4) + 1) * 200,
          prompt: `Prompt ${Math.floor(i / 4) + 1}-${(i % 4) + 1}`,
          response: `Response ${Math.floor(i / 4) + 1}-${(i % 4) + 1}`
        }))
      }

      const result = processDailyDoubles(invalidRoundData)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0]).toContain('Expected 30 clues, found 24')
      expect(result.data).toBeUndefined()
    })

    it('should preserve original round data structure', () => {
      const roundData = createValidRoundData('jeopardy')
      const originalData = JSON.parse(JSON.stringify(roundData)) // Deep copy

      const result = processDailyDoubles(roundData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()

      if (result.data) {
        // Check that all original data is preserved
        expect(result.data.round).toBe(originalData.round)
        expect(result.data.categories).toHaveLength(originalData.categories.length)
        expect(result.data.clues).toHaveLength(originalData.clues.length)

        result.data.categories.forEach((category, i) => {
          expect(category).toBe(originalData.categories[i])
        })

        result.data.clues.forEach((clue, i) => {
          expect(clue.category).toBe(originalData.clues[i].category)
          expect(clue.row).toBe(originalData.clues[i].row)
          expect(clue.value).toBe(originalData.clues[i].value)
          expect(clue.prompt).toBe(originalData.clues[i].prompt)
          expect(clue.response).toBe(originalData.clues[i].response)
        })
      }
    })
  })
})
