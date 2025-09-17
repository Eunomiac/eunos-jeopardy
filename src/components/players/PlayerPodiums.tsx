import { useEffect, useRef } from 'react'
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
}

/**
 * Props for the PlayerPodiums component.
 */
interface PlayerPodiumsProps {
  /** Array of players to display (up to 8 players) */
  players: PlayerInfo[]
  /** ID of the current user */
  currentUserId: string
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
export function PlayerPodiums({ players, currentUserId }: Readonly<PlayerPodiumsProps>) {
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
   * Applies dynamic text scaling to player names.
   */
  const applyTextScaling = (playerId: string) => {
    const podiumElement = podiumRefs.current.get(playerId)
    if (!podiumElement) {
      return
    }

    const nameContainer = podiumElement.querySelector('.player-name-container') as HTMLElement
    const nameElement = podiumElement.querySelector('.player-name-text') as HTMLElement

    if (!nameContainer || !nameElement) {
      return
    }

    // Reset any previous scaling
    nameElement.style.transform = ''
    nameElement.style.overflow = ''
    nameElement.style.textOverflow = ''
    nameElement.style.whiteSpace = ''

    // Measure container and text dimensions
    const containerWidth = nameContainer.offsetWidth - 16 // Account for padding
    const textWidth = nameElement.scrollWidth

    if (textWidth > containerWidth) {
      const scaleRatio = containerWidth / textWidth

      // If scaling would make text too small, use ellipsis instead
      if (scaleRatio < 0.6) {
        nameElement.style.overflow = 'hidden'
        nameElement.style.textOverflow = 'ellipsis'
        nameElement.style.whiteSpace = 'nowrap'
      } else {
        // Apply scaleX transform
        nameElement.style.transform = `scaleX(${scaleRatio})`
        nameElement.style.transformOrigin = 'center'
      }
    }
  }

  /**
   * Effect to apply text scaling when players change.
   */
  useEffect(() => {
    players.forEach((player) => {
      applyTextScaling(player.id)
    })
  }, [players])

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
        ref={(el) => {
          if (el) {
            podiumRefs.current.set(player.id, el)
          } else {
            podiumRefs.current.delete(player.id)
          }
        }}
      >
        <div className="player-name-container">
          <div
            className="player-name-text"
            style={{ fontFamily: `'${player.fontFamily}', cursive` }}
          >
            {player.name}
          </div>
        </div>
        <div className={`player-score ${player.score < 0 ? 'negative' : ''}`}>
          {formatScore(player.score)}
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
