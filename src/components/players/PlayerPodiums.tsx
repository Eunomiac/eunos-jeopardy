import { useRef } from 'react'
import { IntegratedBuzzer } from './IntegratedBuzzer'
import { BuzzerState } from '../../types/BuzzerState'
import './PlayerPodiums.scss'

/**
 * Player information for podium display.
 */
export interface PlayerInfo {
  /** Player's unique ID */
  id: string
  /** Player's display name */
  name: string
  /** Player's current score */
  score: number
  /** Handwritten font family to use for the name */
  fontFamily: string
  /** Whether this is the current user (main player) */
  isMainPlayer: boolean
  /** Current buzzer state for this player */
  buzzerState?: BuzzerState
  /** Whether this player is currently focused by the host */
  isFocused?: boolean
  /** Player's reaction time if they've buzzed */
  reactionTime?: number | null
  /** Whether to show reaction time */
  showReactionTime?: boolean
}

/**
 * Props for the PlayerPodiums component.
 */
interface PlayerPodiumsProps {
  /** Array of players to display (up to 8 players) */
  players: PlayerInfo[]
  /** ID of the current user */
  currentUserId: string
  /** Callback when a player's buzzer is clicked */
  onBuzz?: (playerId: string) => void
}

/**
 * Player podiums component with three-section layout.
 *
 * **Layout Structure:**
 * - **Left Section**: Up to 3 competitor podiums
 * - **Center Section**: Main player podium (current user, larger)
 * - **Right Section**: Up to 4 competitor podiums
 *
 * **Dynamic Features:**
 * - Main player always centered regardless of join order
 * - Dynamic text scaling with scaleX transforms
 * - Ellipsis fallback for very long names
 * - Handwritten font assignment per player
 *
 * **Font Scaling Algorithm:**
 * 1. Measure container width
 * 2. Measure text width
 * 3. Apply scaleX transform if text exceeds container
 * 4. Fall back to ellipsis if scaling becomes too small
 *
 * @param props - Component props
 * @returns PlayerPodiums component
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function PlayerPodiums({ players, currentUserId, onBuzz }: Readonly<PlayerPodiumsProps>) {
  const podiumRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  /**
   * Separates players into main player and competitors.
   */
  const separatePlayers = () => {
    const foundMainPlayer = players.find((player) => player.id === currentUserId)
    const foundCompetitors = players.filter((player) => player.id !== currentUserId)

    return { mainPlayer: foundMainPlayer, competitors: foundCompetitors }
  }

  /**
   * Distributes competitors between left and right sections.
   * Left gets up to 3, right gets the rest (up to 4).
   */
  const distributeCompetitors = (competitorList: PlayerInfo[]) => {
    const leftSection = competitorList.slice(0, 3)
    const rightSection = competitorList.slice(3, 7) // Max 4 on right

    return { leftCompetitors: leftSection, rightCompetitors: rightSection }
  }



  /**
   * Formats score for display with proper currency formatting.
   */
  const formatScore = (score: number): string => {
    if (score >= 0) {
      return `$${score.toLocaleString()}`
    } else {
      return `-$${Math.abs(score).toLocaleString()}`
    }
  }

  /**
   * Renders a single player podium.
   */
  const renderPodium = (player: PlayerInfo, isMain = false) => {
    const podiumClass = isMain ? 'player-podium main' : 'player-podium competitor'

    return (
      <div
        key={player.id}
        className={podiumClass}
        data-player-id={player.id}
        ref={(el) => {
          if (el) {
            podiumRefs.current.set(player.id, el)
          } else {
            podiumRefs.current.delete(player.id)
          }
        }}
      >
        {/* Buzzed-in overlay image (hidden by default, shown by animation) */}
        <img
          src="/assets/images/player-podium-buzzed.webp"
          alt="Buzzed In"
          className="podium-buzzed-in"
          style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />

        <div className={`player-score ${player.score < 0 ? 'negative' : ''}`}>
          {formatScore(player.score)}
        </div>
        <div className="player-buzzer-container">
          {player.id === currentUserId ? (
            // Show integrated buzzer only for current user (main podium)
            <IntegratedBuzzer
              state={player.buzzerState || BuzzerState.INACTIVE}
              playerNickname={player.name}
              isCurrentUser={true}
              isFocused={player.isFocused || false}
              onBuzz={() => onBuzz?.(player.id)}
              reactionTime={player.reactionTime}
              showReactionTime={player.showReactionTime || false}
            />
          ) : (
            // Show just player name for other players
            <div className="player-name-display" style={{ fontFamily: `'${player.fontFamily}', cursive` }}>
              {player.name}
            </div>
          )}
        </div>
      </div>
    )
  }

  const { mainPlayer, competitors } = separatePlayers()
  const { leftCompetitors, rightCompetitors } = distributeCompetitors(competitors)

  return (
    <div className="player-podiums-container">
      <div className="player-podiums-layout">

        {/* Left Section - Up to 3 competitors */}
        <div className="player-podium-section player-podium-left">
          {leftCompetitors.map((player) => renderPodium(player))}
        </div>

        {/* Center Section - Main player */}
        <div className="player-podium-section player-podium-center">
          {mainPlayer && renderPodium(mainPlayer, true)}
        </div>

        {/* Right Section - Up to 4 competitors */}
        <div className="player-podium-section player-podium-right">
          {rightCompetitors.map((player) => renderPodium(player))}
        </div>

      </div>
    </div>
  )
}
