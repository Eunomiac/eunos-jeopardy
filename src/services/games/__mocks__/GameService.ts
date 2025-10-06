/**
 * Manual mock for GameService
 * This ensures Jest properly mocks the static methods of the GameService class
 */

export const GameService = {
  getActiveGame: jest.fn(),
  getGame: jest.fn(),
  updateGame: jest.fn(),
  createGame: jest.fn(),
  endGame: jest.fn(),
  isFinalJeopardyCompleted: jest.fn(),
  startGame: jest.fn(),
  toggleBuzzerLock: jest.fn(),
  getPlayers: jest.fn(),
  addPlayer: jest.fn(),
  removePlayer: jest.fn(),
  getAvailableClueSets: jest.fn(),
  getBuzzesForClue: jest.fn(),
  recordBuzz: jest.fn(),
  clearBuzzesForClue: jest.fn(),
  setFocusedClue: jest.fn(),
  setFocusedPlayer: jest.fn(),
  markPlayerCorrect: jest.fn(),
  markPlayerWrong: jest.fn(),
  updatePlayerScore: jest.fn(),
  startGameIntroduction: jest.fn(),
  startCategoryIntroductions: jest.fn(),
  advanceToNextCategory: jest.fn(),
  completeCategoryIntroductions: jest.fn(),
  setDailyDoubleWager: jest.fn(),
  clearDailyDoubleWager: jest.fn(),
  getDailyDoubleWager: jest.fn(),
  getEffectiveClueValue: jest.fn(),
  setCurrentPlayer: jest.fn(),
  initializeCurrentPlayerRandomly: jest.fn(),
  transitionToNextRound: jest.fn(),
  getGameByJoinCode: jest.fn(),
  generateUniqueJoinCode: jest.fn(),
}

// Re-export types (these don't need to be mocked)
export type { Game, GameInsert, GameUpdate, Player, PlayerInsert, Buzz, BuzzInsert, AnswerInsert, WagerInsert, ClueState, ClueStateInsert } from '../GameService'
