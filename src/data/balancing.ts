/**
 * balancing.ts
 * Central gameplay tuning for Fruit Pop.
 */

export const BALANCING = {
  // Board layout
  fruitCols: 5,
  fruitRows: 3,
  fruitSize: 76,
  gridGap: 10,

  // Ripeness timing
  greenToYellowMs: 2500,
  yellowToRedMs: 5000,
  redToOverripeMs: 7500,

  // Round timing
  timerStartMs: 35_000,
  dirtPerOverripe: 20,
  dirtFailThreshold: 100,
  perfectPoints: 1,
  comboResetMs: 2000,

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
