/**
 * Clue Display Service
 *
 * Manages populating the dynamic display window with clue content
 * before animations run. Handles both regular clues and daily doubles.
 */

import { supabase } from '../supabase/client';
import { ClueService } from '../clues/ClueService';
import type { ClueSetData } from '../clueSets/loader';

export interface ClueDisplayContent {
  clueId: string;
  prompt: string;
  response: string;
  value: number;
  category: string;
  isDailyDouble: boolean;
}

export class ClueDisplayService {
  private static instance: ClueDisplayService;
  private clueCache: Map<string, ClueDisplayContent> = new Map();

  static getInstance(): ClueDisplayService {
    if (!this.instance) {
      this.instance = new ClueDisplayService();
    }
    return this.instance;
  }

  /**
   * Get clue content for display
   */
  async getClueContent(clueId: string, gameId: string): Promise<ClueDisplayContent | null> {
    // Check cache first
    if (this.clueCache.has(clueId)) {
      return this.clueCache.get(clueId)!;
    }

    try {
      // Fetch clue with category information
      const { data: clue, error } = await supabase
        .from('clues')
        .select(`
          id,
          prompt,
          response,
          value,
          position,
          category:categories!inner(
            name,
            position,
            board:boards!inner(
              daily_double_cells
            )
          )
        `)
        .eq('id', clueId)
        .single();

      if (error || !clue) {
        console.error('Failed to fetch clue content:', error);
        return null;
      }

      // Check if daily double
      const isDailyDouble = await ClueService.isDailyDouble(clueId);

      const content: ClueDisplayContent = {
        clueId: clue.id,
        prompt: clue.prompt,
        response: clue.response,
        value: clue.value,
        category: clue.category.name,
        isDailyDouble
      };

      // Cache for future use
      this.clueCache.set(clueId, content);

      return content;
    } catch (error) {
      console.error('Error getting clue content:', error);
      return null;
    }
  }

  /**
   * Populate the display window with clue content
   */
  async populateDisplayWindow(
    clueId: string,
    gameId: string,
    displayWindow: HTMLElement
  ): Promise<void> {
    const content = await this.getClueContent(clueId, gameId);
    if (!content) {
      console.warn('Could not get clue content for display');
      return;
    }

    // Clear existing content and classes
    displayWindow.innerHTML = '';
    displayWindow.className = 'dynamic-display-window';

    if (content.isDailyDouble) {
      // Daily double layout: splash graphic + hidden clue content
      displayWindow.classList.add('daily-double-display');
      displayWindow.innerHTML = `
        <div class="daily-double-splash" style="opacity: 1;">
          <img src="/assets/images/splash-daily-double.webp" alt="Daily Double" />
        </div>
        <div class="clue-content" style="opacity: 0;">
          ${content.prompt}
        </div>
      `;
    } else {
      // Regular clue layout: just the clue text with jeopardy-clue-display class
      displayWindow.classList.add('jeopardy-clue-display');
      displayWindow.textContent = content.prompt;
    }

    console.log(`🎬 [ClueDisplayService] Populated display window for clue ${clueId} (daily double: ${content.isDailyDouble})`);
  }

  /**
   * Clear the cache (useful when game ends)
   */
  clearCache(): void {
    this.clueCache.clear();
  }
}
