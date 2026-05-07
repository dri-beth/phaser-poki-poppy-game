import { GAME_CONFIG } from '../data/gameConfig'

export type GameplayLayoutProfile = 'compact' | 'normal' | 'landscapeTight'

export interface LayoutRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ViewportLayout {
  width: number
  height: number
  cx: number
  cy: number
  isLandscape: boolean
  safeMargin: number
  headerTop: number
  footerBottom: number
  sideRailX: number | null
  sideRailWidth: number
  boardLeft: number
  boardRight: number
  boardTop: number
  boardBottom: number
  boardCenterX: number
  profile: GameplayLayoutProfile
  hudRect: LayoutRect
  boardRect: LayoutRect
  comboAnchor: { x: number; y: number }
}

export function getViewportLayout(scene?: Phaser.Scene): ViewportLayout {
  const width = scene?.scale?.width ?? GAME_CONFIG.width
  const height = scene?.scale?.height ?? GAME_CONFIG.height
  const isLandscape = width > height
  const safeMargin = isLandscape ? 12 : 16
  const sideRailWidth = isLandscape ? (width <= 700 ? 124 : 138) : 0
  const sideRailX = isLandscape ? width - sideRailWidth - safeMargin : null
  const isCompact = width <= 360 || height <= 700
  const isLandscapeTight = isLandscape && (height <= 500 || width <= 700)
  const profile: GameplayLayoutProfile = isLandscapeTight ? 'landscapeTight' : isCompact ? 'compact' : 'normal'
  const panelWidth = Math.min(
    width - safeMargin * 2,
    isLandscape ? (isLandscapeTight ? width - safeMargin * 2 - 8 : width - safeMargin * 2 - 18) : isCompact ? width - safeMargin * 2 : width - safeMargin * 2 - 10
  )
  const panelHeight = isLandscape ? (isLandscapeTight ? 146 : 154) : isCompact ? 156 : 168
  const panelX = width / 2
  const panelY = safeMargin + panelHeight / 2 + (isLandscape ? 2 : 4)

  const boardLeft = safeMargin
  const boardRight = isLandscape && sideRailX !== null ? sideRailX - 10 : width - safeMargin
  const boardTop = panelY + panelHeight / 2 + (profile === 'compact' ? 102 : 112)
  const boardBottom = isLandscape ? height - 90 : height - (profile === 'compact' ? 104 : 118)
  const boardRect: LayoutRect = {
    x: boardLeft,
    y: boardTop,
    width: Math.max(0, boardRight - boardLeft),
    height: Math.max(0, boardBottom - boardTop)
  }
  const hudRect: LayoutRect = {
    x: panelX - panelWidth / 2,
    y: panelY - panelHeight / 2,
    width: panelWidth,
    height: panelHeight
  }

  return {
    width,
    height,
    cx: width / 2,
    cy: height / 2,
    isLandscape,
    safeMargin,
    headerTop: isLandscape ? 8 : 10,
    footerBottom: isLandscape ? height - 14 : height - 20,
    sideRailX,
    sideRailWidth,
    boardLeft,
    boardRight,
    boardTop,
    boardBottom,
    boardCenterX: (boardLeft + boardRight) / 2,
    profile,
    hudRect,
    boardRect,
    comboAnchor: {
      x: width / 2,
      y: panelY + panelHeight / 2 + (profile === 'compact' ? 26 : 30)
    }
  }
}
