import { ScaleManager } from './ScaleManager'

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
}

export function getViewportLayout(): ViewportLayout {
  const width = ScaleManager.viewportWidth
  const height = ScaleManager.viewportHeight
  const isLandscape = ScaleManager.isLandscape
  const safeMargin = isLandscape ? 12 : 16
  const sideRailWidth = isLandscape ? 138 : 0
  const sideRailX = isLandscape ? width - sideRailWidth - safeMargin : null
  const boardLeft = safeMargin
  const boardRight = isLandscape && sideRailX !== null ? sideRailX - 10 : width - safeMargin
  const boardTop = isLandscape ? 96 : 118
  const boardBottom = isLandscape ? height - 96 : height - 126

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
    boardCenterX: (boardLeft + boardRight) / 2
  }
}
