import { supabase } from '../supabase/client'
import { GameService } from '../games/GameService'

/**
 * Service for managing handwritten font assignments to ensure variety and avoid conflicts.
 *
 * **Font Assignment Algorithm:**
 * 1. Check if user already has a permanent font assigned
 * 2. If not, assign using fair distribution (least-used fonts get priority)
 * 3. Check for conflicts with currently connected players
 * 4. If conflict exists, assign temporary override font
 *
 * **Font Management:**
 * - 8 available handwritten fonts (handwritten-1 through handwritten-8)
 * - Permanent assignments stored in profiles.handwritten_font
 * - Temporary overrides stored in profiles.temp_handwritten_font
 * - Temporary fonts are cleared when games end
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export class FontAssignmentService {
  /**
   * Available handwritten font families.
   */
  private static readonly AVAILABLE_FONTS = [
    'handwritten-1',
    'handwritten-2',
    'handwritten-3',
    'handwritten-4',
    'handwritten-5',
    'handwritten-6',
    'handwritten-7',
    'handwritten-8'
  ] as const

  /**
   * Fonts that are narrower and better suited for long names.
   */
  private static readonly NARROW_FONTS = [
    'handwritten-1',
    'handwritten-3',
    'handwritten-5'
  ] as const

  /**
   * Character count threshold for considering a name "long".
   * Names with this many characters or more will preferentially receive narrow fonts.
   */
  private static readonly LONG_NAME_THRESHOLD = 12

  /**
   * Gets or assigns a handwritten font for a player joining a game.
   * Implements the three-step font assignment algorithm.
   *
   * @param userId - The user's ID
   * @param gameId - The game ID they're joining
   * @param displayName - The player's display name (optional, used for narrow font preference)
   * @returns Promise resolving to the font name to use
   */
  static async getPlayerFont(userId: string, gameId: string, displayName?: string): Promise<string> {
    try {
      // Step 1: Check if user already has a font assigned
      const userProfile = await this.getUserProfile(userId)

      if (!userProfile.handwritten_font) {
        // Step 2: Assign permanent font using fair distribution
        const newFont = await this.assignPermanentFont(userId, displayName)
        await this.updateUserFont(userId, newFont)
        userProfile.handwritten_font = newFont
      }

      // Step 3: Check for conflicts with currently connected players
      const connectedPlayers = await GameService.getPlayers(gameId)
      const fontsInUse = await this.getFontsInUse(connectedPlayers, userId)

      if (fontsInUse.includes(userProfile.handwritten_font)) {
        // Assign temporary override (doesn't overwrite permanent assignment)
        const tempFont = await this.assignTemporaryFont(userId, fontsInUse)
        await this.setTemporaryFont(userId, tempFont)
        return tempFont
      }

      // Clear any existing temporary override since permanent font is available
      if (userProfile.temp_handwritten_font) {
        await this.clearTemporaryFont(userId)
      }

      return userProfile.handwritten_font
    } catch (error) {
      console.error('❌ Error in getPlayerFont:', error)
      // Fallback to first available font
      return this.AVAILABLE_FONTS[0]
    }
  }

  /**
   * Gets user profile with font information.
   */
  private static async getUserProfile(userId: string) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('handwritten_font, temp_handwritten_font')
      .eq('id', userId)
      .single()

    if (error) {
      throw new Error(`Failed to get user profile: ${error.message}`)
    }

    return profile || { handwritten_font: null, temp_handwritten_font: null }
  }

  /**
   * Step 2: Assigns a permanent font using fair distribution algorithm.
   * Prefers narrow fonts for players with long display names.
   *
   * @param userId - The user's ID
   * @param displayName - The player's display name (optional)
   */
  private static async assignPermanentFont(userId: string, displayName?: string): Promise<string> {
    // Get font assignment counts across all users
    const fontCounts = await this.getFontAssignmentCounts()

    // Find fonts with lowest assignment count
    const minCount = Math.min(...Object.values(fontCounts))
    let availableFonts = this.AVAILABLE_FONTS.filter(
      (font) => (fontCounts[font] || 0) === minCount
    )

    // If player has a long name, prefer narrow fonts
    const hasLongName = displayName && displayName.length >= this.LONG_NAME_THRESHOLD
    if (hasLongName) {
      const narrowFontsAvailable = availableFonts.filter((font) =>
        this.NARROW_FONTS.includes(font as typeof this.NARROW_FONTS[number])
      )

      // Use narrow fonts if any are available, otherwise fall back to all available fonts
      if (narrowFontsAvailable.length > 0) {
        availableFonts = narrowFontsAvailable
        console.log(`🎨 Preferring narrow fonts for long name "${displayName}"`)
      }
    }

    // Random selection from available fonts
    const selectedFont = availableFonts[Math.floor(Math.random() * availableFonts.length)]

    console.log(`🎨 Assigned permanent font "${selectedFont}" to user ${userId}`)
    return selectedFont
  }

  /**
   * Gets font assignment counts across all users.
   */
  private static async getFontAssignmentCounts(): Promise<Record<string, number>> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('handwritten_font')
      .not('handwritten_font', 'is', null)

    if (error) {
      console.error('❌ Error getting font counts:', error)
      return {}
    }

    const counts: Record<string, number> = {}

    // Initialize all fonts with 0 count
    this.AVAILABLE_FONTS.forEach((font) => {
      counts[font] = 0
    })

    // Count actual assignments
    profiles?.forEach((profile) => {
      if (profile.handwritten_font && profile.handwritten_font in counts) {
        counts[profile.handwritten_font]++
      }
    })

    return counts
  }

  /**
   * Gets fonts currently in use by connected players (excluding current user).
   */
  private static async getFontsInUse(connectedPlayers: Array<{ user_id: string }>, excludeUserId: string): Promise<string[]> {
    const otherPlayerIds = connectedPlayers
      .filter((player) => player.user_id !== excludeUserId)
      .map((player) => player.user_id)

    if (otherPlayerIds.length === 0) {
      return []
    }

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('handwritten_font, temp_handwritten_font')
      .in('id', otherPlayerIds)

    if (error) {
      console.error('❌ Error getting fonts in use:', error)
      return []
    }

    const fontsInUse: string[] = []

    profiles?.forEach((profile) => {
      // Use temporary font if assigned, otherwise use permanent font
      const activeFont = profile.temp_handwritten_font || profile.handwritten_font
      if (activeFont) {
        fontsInUse.push(activeFont)
      }
    })

    return fontsInUse
  }

  /**
   * Assigns a temporary font that doesn't conflict with fonts in use.
   */
  private static async assignTemporaryFont(userId: string, fontsInUse: string[]): Promise<string> {
    const availableFonts = this.AVAILABLE_FONTS.filter((font) => !fontsInUse.includes(font))

    if (availableFonts.length === 0) {
      // All fonts in use, assign random font (rare edge case with 8+ players)
      console.warn('⚠️ All fonts in use, assigning random font')
      return this.AVAILABLE_FONTS[Math.floor(Math.random() * this.AVAILABLE_FONTS.length)]
    }

    // Random selection from available fonts
    const tempFont = availableFonts[Math.floor(Math.random() * availableFonts.length)]

    console.log(`🎨 Assigned temporary font "${tempFont}" to user ${userId}`)
    return tempFont
  }

  /**
   * Updates user's permanent font assignment.
   */
  private static async updateUserFont(userId: string, font: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ handwritten_font: font })
      .eq('id', userId)

    if (error) {
      throw new Error(`Failed to update user font: ${error.message}`)
    }
  }

  /**
   * Sets temporary font override for user.
   */
  private static async setTemporaryFont(userId: string, font: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ temp_handwritten_font: font })
      .eq('id', userId)

    if (error) {
      throw new Error(`Failed to set temporary font: ${error.message}`)
    }
  }

  /**
   * Clears temporary font override for user.
   */
  private static async clearTemporaryFont(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ temp_handwritten_font: null })
      .eq('id', userId)

    if (error) {
      console.error('❌ Error clearing temporary font:', error)
    }
  }

  /**
   * Clears all temporary font overrides (called when game ends).
   */
  static async clearAllTemporaryFonts(): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ temp_handwritten_font: null })
      .not('temp_handwritten_font', 'is', null)

    if (error) {
      console.error('❌ Error clearing all temporary fonts:', error)
    } else {
      console.log('🧹 Cleared all temporary font overrides')
    }
  }
}
