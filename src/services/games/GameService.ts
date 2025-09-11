import { supabase } from '../supabase/client'
import type { Tables, TablesInsert, TablesUpdate } from '../supabase/types'

export type Game = Tables<'games'>
export type GameInsert = TablesInsert<'games'>
export type GameUpdate = TablesUpdate<'games'>

export type Player = Tables<'players'>
export type PlayerInsert = TablesInsert<'players'>

export type Buzz = Tables<'buzzes'>
export type BuzzInsert = TablesInsert<'buzzes'>

export type Answer = Tables<'answers'>
export type AnswerInsert = TablesInsert<'answers'>

export type Wager = Tables<'wagers'>
export type WagerInsert = TablesInsert<'wagers'>

export type ClueState = Tables<'clue_states'>
export type ClueStateInsert = TablesInsert<'clue_states'>

/**
 * Service for managing game operations
 */
export class GameService {
  /**
   * Create a new game with the specified clue set
   */
  static async createGame(hostId: string, clueSetId: string): Promise<Game> {
    const gameData: GameInsert = {
      host_id: hostId,
      question_set_id: clueSetId, // Using existing schema naming
      status: 'lobby',
      current_round: 'jeopardy',
      is_buzzer_locked: true
    }

    const { data, error } = await supabase
      .from('games')
      .insert(gameData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create game: ${error.message}`)
    }

    if (!data) {
      throw new Error('No game data returned from database')
    }

    return data
  }

  /**
   * Get game by ID with host authorization check
   */
  static async getGame(gameId: string, userId: string): Promise<Game> {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch game: ${error.message}`)
    }

    if (!data) {
      throw new Error('Game not found')
    }

    // Check if user is the host
    if (data.host_id !== userId) {
      throw new Error('Only the game host can access this game')
    }

    return data
  }

  /**
   * Update game state
   */
  static async updateGame(gameId: string, updates: GameUpdate, hostId: string): Promise<Game> {
    // First verify the user is the host
    await this.getGame(gameId, hostId)

    const { data, error } = await supabase
      .from('games')
      .update(updates)
      .eq('id', gameId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update game: ${error.message}`)
    }

    if (!data) {
      throw new Error('No game data returned from update')
    }

    return data
  }

  /**
   * Toggle buzzer lock state
   */
  static async toggleBuzzerLock(gameId: string, hostId: string): Promise<Game> {
    const game = await this.getGame(gameId, hostId)
    
    return this.updateGame(gameId, {
      is_buzzer_locked: !game.is_buzzer_locked
    }, hostId)
  }

  /**
   * Get all players in a game
   */
  static async getPlayers(gameId: string): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select(`
        *,
        profiles:user_id (
          display_name,
          username
        )
      `)
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch players: ${error.message}`)
    }

    return data || []
  }

  /**
   * Add a player to a game
   */
  static async addPlayer(gameId: string, userId: string, nickname?: string): Promise<Player> {
    const playerData: PlayerInsert = {
      game_id: gameId,
      user_id: userId,
      nickname: nickname || null,
      score: 0
    }

    const { data, error } = await supabase
      .from('players')
      .insert(playerData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to add player: ${error.message}`)
    }

    if (!data) {
      throw new Error('No player data returned from database')
    }

    return data
  }

  /**
   * Get available clue sets for game creation
   */
  static async getAvailableClueSets(userId: string): Promise<Tables<'clue_sets'>[]> {
    const { data, error } = await supabase
      .from('clue_sets')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch clue sets: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get buzzes for a specific clue in order
   */
  static async getBuzzesForClue(gameId: string, clueId: string): Promise<Buzz[]> {
    const { data, error } = await supabase
      .from('buzzes')
      .select(`
        *,
        profiles:user_id (
          display_name,
          username
        )
      `)
      .eq('game_id', gameId)
      .eq('clue_id', clueId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch buzzes: ${error.message}`)
    }

    return data || []
  }

  /**
   * Record a buzz for a clue
   */
  static async recordBuzz(gameId: string, clueId: string, userId: string): Promise<Buzz> {
    const buzzData: BuzzInsert = {
      game_id: gameId,
      clue_id: clueId,
      user_id: userId
    }

    const { data, error } = await supabase
      .from('buzzes')
      .insert(buzzData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to record buzz: ${error.message}`)
    }

    if (!data) {
      throw new Error('No buzz data returned from database')
    }

    return data
  }

  /**
   * Clear all buzzes for a clue (reset buzzer)
   */
  static async clearBuzzesForClue(gameId: string, clueId: string, hostId: string): Promise<void> {
    // Verify host authorization
    await this.getGame(gameId, hostId)

    const { error } = await supabase
      .from('buzzes')
      .delete()
      .eq('game_id', gameId)
      .eq('clue_id', clueId)

    if (error) {
      throw new Error(`Failed to clear buzzes: ${error.message}`)
    }
  }

  /**
   * Update player score
   */
  static async updatePlayerScore(gameId: string, userId: string, scoreChange: number, hostId: string): Promise<Player> {
    // Verify host authorization
    await this.getGame(gameId, hostId)

    // Get current player data
    const { data: currentPlayer, error: fetchError } = await supabase
      .from('players')
      .select('score')
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch player: ${fetchError.message}`)
    }

    if (!currentPlayer) {
      throw new Error('Player not found')
    }

    const newScore = currentPlayer.score + scoreChange

    const { data, error } = await supabase
      .from('players')
      .update({ score: newScore })
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update score: ${error.message}`)
    }

    if (!data) {
      throw new Error('No player data returned from update')
    }

    return data
  }
}
