/**
 * balancing.ts
 * All tunable gameplay numbers in one place.
 * Adjust here without touching system or scene code.
 */

export const BALANCING = {
  // ─── Board Layout ────────────────────────────────────────────────────────
  /** Number of bubble columns */
  boardCols: 5,
  /** Number of bubble rows */
  boardRows: 5,
  /** Bubble diameter in pixels */
  bubbleSize: 72,
  /** Gap between bubbles in pixels */
  gridGap: 8,

  // ─── Pop Feedback Timings ────────────────────────────────────────────────
  /** Scale punch tween duration (ms) — Back.easeIn */
  popPunchDuration: 80,
  /** Ring ripple alpha fade duration (ms) */
  rippleDuration: 300,
  /** Cell colour flash duration (ms) */
  flashDuration: 60,
  /** navigator.vibrate duration for haptic (ms) */
  hapticMs: 12,

  // ─── Combo System ────────────────────────────────────────────────────────
  /** Pause in ms before combo multiplier resets to 1x */
  comboResetMs: 2000,

  // ─── Scoring ─────────────────────────────────────────────────────────────
  /** Base points per popped bubble */
  pointsPerPop: 10,

  // ─── Combo Multiplier ────────────────────────────────────────────────────
  /**
   * Consecutive-pop streak thresholds that unlock each multiplier tier.
   * Index-aligned with comboMultipliers: streak >= threshold[i] → multipliers[i].
   */
  comboStreakThresholds: [0, 5, 10, 15] as readonly number[],
  /** Multiplier values for each streak tier (1x / 2x / 3x / 5x) */
  comboMultipliers: [1, 2, 3, 5] as readonly number[],

  // ─── Refill Animation ────────────────────────────────────────────────────
  /** Stagger delay per (row + col) step during board refill (ms) */
  refillStaggerMs: 30,

  // ─── Pattern Mode ────────────────────────────────────────────────────────
  /** How long the target pattern is visible before hiding (ms) */
  patternShowDuration: 2000,
  /** Freeze duration on wrong bubble tap (ms) */
  patternPenaltyMs: 500,

  // ─── Rhythm Mode ─────────────────────────────────────────────────────────
  /** Fire the visual cue this many ms before the actual beat */
  visualLeadMs: 50,
  /** Default BPM for rhythm mode */
  rhythmBpm: 120,

  // ─── Accessibility ───────────────────────────────────────────────────────
  /** WCAG 2.1 s2.3.1 — minimum ms between flashes (caps at <3/sec) */
  minFlashIntervalMs: 333,

  // ─── UI Timings ───────────────────────────────────────────────────────────
  /** Duration of scene transition fades, in milliseconds */
  sceneFadeDuration: 300,
  /** Delay before transitioning from BootScene to PreloadScene */
  bootDelay: 100,

  // ─── DifficultySystem (kept for system compatibility, unused in Poppy) ────
  initialSpawnInterval: 2000,
  minSpawnInterval: 500,
  difficultyRampTime: 60_000,
  maxDifficultyMultiplier: 3.0
} as const

export type Balancing = typeof BALANCING
