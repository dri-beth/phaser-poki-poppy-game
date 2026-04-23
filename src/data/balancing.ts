/**
 * balancing.ts
 * Central gameplay tuning for Fruit Pop.
 */

import { GAME_CONFIG } from './gameConfig'

export const FRUIT_POP_MAX_LEVEL = 25

const BOARD_SIZES = [
  2, 2, 2, 2,
  3, 3,
  4, 4,
  5, 5,
  6, 6, 6,
  7, 7, 7,
  8, 8, 8,
  9, 9, 9,
  10, 10, 10
] as const

export interface FruitPopLevelConfig {
  level: number
  label: string
  boardCols: number
  boardRows: number
  boardLabel: string
  timerStartMs: number
  greenToYellowMs: number
  yellowToRedMs: number
  redToOverripeMs: number
  dirtPerOverripe: number
  perfectPoints: number
  ripenRateMin: number
  ripenRateMax: number
  greenStartChance: number
  yellowStartChance: number
  redStartChance: number
  comboResetMs: number
}

export interface FruitPopBoardLayout {
  fruitSize: number
  gridGap: number
  hitSize: number
  boardSpanX: number
  boardSpanY: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function smoothStep(value: number): number {
  const t = clamp(value, 0, 1)
  return t * t * (3 - 2 * t)
}

function getBoardSizeForLevel(level: number): number {
  const clamped = clamp(Math.floor(level), 1, FRUIT_POP_MAX_LEVEL)
  return BOARD_SIZES[clamped - 1]
}

function getStageLabel(boardSize: number): string {
  switch (boardSize) {
    case 2:
      return 'Warmup'
    case 3:
      return 'Easy Grove'
    case 4:
      return 'Gentle Harvest'
    case 5:
      return 'Orchard Pace'
    case 6:
      return 'Hot House'
    case 7:
      return 'Rush Hour'
    case 8:
      return 'Late Harvest'
    case 9:
      return 'Final Press'
    default:
      return 'Peak Press'
  }
}

export function getFruitPopProgress(level: number): number {
  const clamped = clamp(Math.floor(level), 1, FRUIT_POP_MAX_LEVEL)
  return (clamped - 1) / (FRUIT_POP_MAX_LEVEL - 1)
}

export function getFruitPopBoardSize(level: number): number {
  return getBoardSizeForLevel(level)
}

export function getFruitPopBoardLayout(
  boardCols: number,
  boardRows: number
): FruitPopBoardLayout {
  const cols = clamp(Math.floor(boardCols), 2, 10)
  const rows = clamp(Math.floor(boardRows), 2, 10)
  const maxSide = Math.max(cols, rows)
  const gridGap = clamp(Math.round(16 - (maxSide - 2) * 1.4), 5, 16)

  const availableWidth = GAME_CONFIG.width - 48
  const availableHeight = GAME_CONFIG.height - 260
  const fitSize = Math.floor(
    Math.min(
      (availableWidth - (cols - 1) * gridGap) / cols,
      (availableHeight - (rows - 1) * gridGap) / rows
    )
  )

  const preferredSize = Math.round(128 - (maxSide - 2) * 11)
  const fruitSize = Math.max(32, Math.min(preferredSize, fitSize))
  const hitSize = fruitSize + Math.max(4, Math.floor(gridGap * 0.5))

  return {
    fruitSize,
    gridGap,
    hitSize,
    boardSpanX: cols * fruitSize + (cols - 1) * gridGap,
    boardSpanY: rows * fruitSize + (rows - 1) * gridGap
  }
}

function buildFruitPopLevel(level: number): FruitPopLevelConfig {
  const clamped = clamp(Math.floor(level), 1, FRUIT_POP_MAX_LEVEL)
  const progress = getFruitPopProgress(clamped)
  const ramp = smoothStep(progress)
  const boardSize = getBoardSizeForLevel(clamped)
  const label = getStageLabel(boardSize)

  const greenStartChance = Number((0.72 - ramp * 0.42).toFixed(2))
  const redStartChance = Number((0.06 + ramp * 0.32).toFixed(2))
  const yellowStartChance = Number((1 - greenStartChance - redStartChance).toFixed(2))

  return {
    level: clamped,
    label,
    boardCols: boardSize,
    boardRows: boardSize,
    boardLabel: `${boardSize}x${boardSize}`,
    timerStartMs: Math.round(40000 + boardSize * 1000 + ramp * 18000),
    greenToYellowMs: Math.round(3800 - ramp * 2000),
    yellowToRedMs: Math.round(7200 - ramp * 3700),
    redToOverripeMs: Math.round(10800 - ramp * 5600),
    dirtPerOverripe: Math.round(10 + ramp * 14),
    perfectPoints: clamped <= 4 ? 3 : clamped <= 12 ? 2 : 1,
    ripenRateMin: Number((0.7 + ramp * 0.28).toFixed(2)),
    ripenRateMax: Number((0.88 + ramp * 0.34).toFixed(2)),
    greenStartChance,
    yellowStartChance,
    redStartChance,
    comboResetMs: Math.round(2800 - ramp * 1000)
  }
}

export const FRUIT_POP_LEVELS: readonly FruitPopLevelConfig[] = Array.from(
  { length: FRUIT_POP_MAX_LEVEL },
  (_, index) => buildFruitPopLevel(index + 1)
) as readonly FruitPopLevelConfig[]

export function getFruitPopLevel(level: number): FruitPopLevelConfig {
  const clamped = clamp(Math.floor(level), 1, FRUIT_POP_MAX_LEVEL)
  return FRUIT_POP_LEVELS[clamped - 1]
}

export function getFruitPopMaxLevel(): number {
  return FRUIT_POP_MAX_LEVEL
}

export const BALANCING = {
  // Round defaults
  timerStartMs: 42_000,
  dirtFailThreshold: 100,

  // Feedback timings
  popPunchDuration: 90,
  splatFadeDuration: 320,
  splatScale: 1.2,
  popupDuration: 700,
  countdownStepMs: 700,
  countdownGoHoldMs: 500,

  // Pools / effects
  splatterPoolSize: 20,
  popupPoolSize: 10,
  particleBurstCount: 10,

  // Scene timing
  sceneFadeDuration: 300,
  bootDelay: 100,

  // Legacy compatibility for dormant helpers.
  difficultyRampTime: 60000,
  maxDifficultyMultiplier: 3.0,
  initialSpawnInterval: 2000,
  minSpawnInterval: 500
} as const

export type Balancing = typeof BALANCING
