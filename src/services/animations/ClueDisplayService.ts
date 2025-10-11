/**
 * Clue Display Service
 *
 * Manages populating the dynamic display window with clue content
 * before animations run. Handles both regular clues and daily doubles.
 */

import { supabase } from '../supabase/client';
import { ClueService } from '../clues/ClueService';

export interface ClueDisplayContent {
  clueId: string;
  prompt: string;
  response: string;
  value: number;
  category: string;
  isDailyDouble: boolean;
}

export class ClueDisplayService {
  private static instance: Maybe<ClueDisplayService>;
  private readonly clueCache = new Map<string, ClueDisplayContent>();

  static getInstance(): ClueDisplayService {
    ClueDisplayService.instance ??= new ClueDisplayService();
    return ClueDisplayService.instance;
  }

  /**
   * Get clue content for display
   */
  async getClueContent(clueId: string): Promise<ClueDisplayContent | null> {
    // Check cache first
    if (this.clueCache.has(clueId)) {
      return this.clueCache.get(clueId) ?? null;
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

      if (error) {
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
    displayWindow: HTMLElement
  ): Promise<void> {
    const content = await this.getClueContent(clueId);
    if (!content) {
      console.warn('Could not get clue content for display');
      return;
    }

    // Clear existing content and classes
    displayWindow.innerHTML = '';
    displayWindow.className = 'dynamic-display-window';

    if (content.isDailyDouble) {
      // Daily double layout: clue text + splash image overlay
      // Both jeopardy-clue-display (for base styling) and daily-double-display (for splash)
      displayWindow.classList.add('jeopardy-clue-display', 'daily-double-display');
      displayWindow.textContent = content.prompt;

      // Add splash image as overlay (will be hidden by animation)
      const splashImg = document.createElement('img');
      splashImg.src = '/assets/images/splash-daily-double.webp';
      splashImg.alt = 'Daily Double';
      splashImg.className = 'daily-double-splash';
      displayWindow.appendChild(splashImg);
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
