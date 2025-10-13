import { parseCSV, validateJeopardyStructure, type CSVRow } from './csvParser'

describe('csvParser', () => {
  describe('parseCSV', () => {
    it('should parse valid CSV data correctly', () => {
      const csvText = `round,category,value,prompt,response
jeopardy,Science,200,What is H2O?,Water
double,History,400,Who was the first president?,George Washington
final,Geography,0,What is the largest country?,Russia`

      const result = parseCSV(csvText)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        round: 'jeopardy',
        category: 'Science',
        value: 200,
        prompt: 'What is H2O?',
        response: 'Water'
      })
      expect(result[1]).toEqual({
        round: 'double',
        category: 'History',
        value: 400,
        prompt: 'Who was the first president?',
        response: 'George Washington'
      })
      expect(result[2]).toEqual({
        round: 'final',
        category: 'Geography',
        value: 0,
        prompt: 'What is the largest country?',
        response: 'Russia'
      })
    })

    it('should handle quoted fields with commas', () => {
      const csvText = `round,category,value,prompt,response
jeopardy,"Science, Technology",200,"What is H2O, chemically?","Water, H2O"`

      const result = parseCSV(csvText)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        round: 'jeopardy',
        category: 'Science, Technology',
        value: 200,
        prompt: 'What is H2O, chemically?',
        response: 'Water, H2O'
      })
    })

    it('should handle escaped quotes in fields', () => {
      const csvText = `round,category,value,prompt,response
jeopardy,Literature,400,"Who wrote ""To Kill a Mockingbird""?","Harper ""Scout"" Lee"`

      const result = parseCSV(csvText)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        round: 'jeopardy',
        category: 'Literature',
        value: 400,
        prompt: 'Who wrote "To Kill a Mockingbird"?',
        response: 'Harper "Scout" Lee'
      })
    })

    it('should trim whitespace from fields', () => {
      const csvText = `round,category,value,prompt,response
jeopardy,  Science  ,  200  ,  What is H2O?  ,  Water  `

      const result = parseCSV(csvText)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        round: 'jeopardy',
        category: 'Science',
        value: 200,
        prompt: 'What is H2O?',
        response: 'Water'
      })
    })

    it('should skip empty lines', () => {
      const csvText = `round,category,value,prompt,response
jeopardy,Science,200,What is H2O?,Water

double,History,400,Who was the first president?,George Washington

`

      const result = parseCSV(csvText)

      expect(result).toHaveLength(2)
      expect(result[0]?.round).toBe('jeopardy')
      expect(result[1]?.round).toBe('double')
    })

    it('should handle empty CSV gracefully', () => {
      // Empty string becomes empty array after processing
      expect(parseCSV('')).toEqual([])
      expect(parseCSV('   ')).toEqual([])
      expect(parseCSV('header\n')).toEqual([]) // Only header, no data
      expect(parseCSV('header\n\n')).toEqual([]) // Header with empty lines
    })

    it('should throw error for wrong number of fields', () => {
      const csvText = `round,category,value,prompt,response
jeopardy,Science,200,What is H2O?`

      expect(() => parseCSV(csvText)).toThrow('Row 2 has 4 fields, expected 5')
    })

    it('should throw error for invalid round type', () => {
      const csvText = `round,category,value,prompt,response
invalid,Science,200,What is H2O?,Water`

      expect(() => parseCSV(csvText)).toThrow('Invalid round type "invalid" in row 2. Expected: jeopardy, double, or final')
    })

    it('should throw error for invalid value', () => {
      const csvText = `round,category,value,prompt,response
jeopardy,Science,not-a-number,What is H2O?,Water`

      expect(() => parseCSV(csvText)).toThrow('Invalid value "not-a-number" in row 2. Expected a number')
    })

    it('should handle zero values correctly', () => {
      const csvText = `round,category,value,prompt,response
final,Geography,0,What is the largest country?,Russia`

      const result = parseCSV(csvText)

      expect(result).toHaveLength(1)
      expect(result[0]?.value).toBe(0)
    })

    it('should handle negative values correctly', () => {
      const csvText = `round,category,value,prompt,response
jeopardy,Science,-200,What is H2O?,Water`

      const result = parseCSV(csvText)

      expect(result).toHaveLength(1)
      expect(result[0]?.value).toBe(-200)
    })
  })

  describe('validateJeopardyStructure', () => {
    const createMockRows = (jeopardyCount: number, doubleCount: number, finalCount: number): CSVRow[] => {
      const rows: CSVRow[] = []

      // Add jeopardy rows
      for (let i = 0; i < jeopardyCount; i++) {
        rows.push({
          round: 'jeopardy',
          category: `Category ${(i % 6) + 1}`,
          value: ((i % 5) + 1) * 200,
          prompt: `Jeopardy prompt ${i + 1}`,
          response: `Jeopardy response ${i + 1}`
        })
      }

      // Add double rows
      for (let i = 0; i < doubleCount; i++) {
        rows.push({
          round: 'double',
          category: `Category ${(i % 6) + 1}`,
          value: ((i % 5) + 1) * 400,
          prompt: `Double prompt ${i + 1}`,
          response: `Double response ${i + 1}`
        })
      }

      // Add final rows
      for (let i = 0; i < finalCount; i++) {
        rows.push({
          round: 'final',
          category: 'Final Category',
          value: 0,
          prompt: `Final prompt ${i + 1}`,
          response: `Final response ${i + 1}`
        })
      }

      return rows
    }

    it('should validate correct Jeopardy structure', () => {
      const rows = createMockRows(30, 30, 1)

      expect(() => { validateJeopardyStructure(rows); }).not.toThrow()
    })

    it('should throw error for incorrect Jeopardy round count', () => {
      const rows = createMockRows(25, 30, 1)

      expect(() => { validateJeopardyStructure(rows); }).toThrow('Jeopardy round should have 30 clues, found 25')
    })

    it('should throw error for incorrect Double Jeopardy round count', () => {
      const rows = createMockRows(30, 25, 1)

      expect(() => { validateJeopardyStructure(rows); }).toThrow('Double Jeopardy round should have 30 clues, found 25')
    })

    it('should throw error for incorrect Final Jeopardy count', () => {
      const rows = createMockRows(30, 30, 2)

      expect(() => { validateJeopardyStructure(rows); }).toThrow('Final Jeopardy should have 1 clue, found 2')
    })

    it('should throw error for missing Final Jeopardy', () => {
      const rows = createMockRows(30, 30, 0)

      expect(() => { validateJeopardyStructure(rows); }).toThrow('Final Jeopardy should have 1 clue, found 0')
    })

    it('should throw error for wrong category count in Jeopardy', () => {
      // Create rows with only 5 categories but 30 total clues (6 clues in each category)
      const rows: CSVRow[] = []
      for (let cat = 1; cat <= 5; cat++) {
        for (let val = 1; val <= 6; val++) {
          rows.push({
            round: 'jeopardy',
            category: `Category ${cat}`,
            value: val * 200,
            prompt: `Prompt ${cat}-${val}`,
            response: `Response ${cat}-${val}`
          })
        }
      }
      // Add complete Double Jeopardy and Final
      rows.push(...createMockRows(0, 30, 1))

      expect(() => { validateJeopardyStructure(rows); }).toThrow('Jeopardy should have 6 categories, found 5')
    })

    it('should throw error for wrong clue count per category in Double Jeopardy', () => {
      // Create valid Jeopardy round
      const rows: CSVRow[] = createMockRows(30, 0, 0)

      // Add Double Jeopardy with wrong clue count per category
      // 6 categories but one has 6 clues and another has 4 (still 30 total)
      for (let cat = 1; cat <= 4; cat++) {
        for (let val = 1; val <= 5; val++) {
          rows.push({
            round: 'double',
            category: `Double Category ${cat}`,
            value: val * 400,
            prompt: `Double Prompt ${cat}-${val}`,
            response: `Double Response ${cat}-${val}`
          })
        }
      }
      // 5th category with 6 clues
      for (let val = 1; val <= 6; val++) {
        rows.push({
          round: 'double',
          category: 'Double Category 5',
          value: val * 400,
          prompt: `Double Prompt 5-${val}`,
          response: `Double Response 5-${val}`
        })
      }
      // 6th category with 4 clues (wrong! should be 5)
      for (let val = 1; val <= 4; val++) {
        rows.push({
          round: 'double',
          category: 'Double Category 6',
          value: val * 400,
          prompt: `Double Prompt 6-${val}`,
          response: `Double Response 6-${val}`
        })
      }
      // Add Final
      rows.push(...createMockRows(0, 0, 1))

      // Should fail on the first category with wrong count (Category 5 with 6 clues)
      expect(() => { validateJeopardyStructure(rows); }).toThrow('Category "Double Category 5" in Double Jeopardy should have 5 clues, found 6')
    })
  })
})
