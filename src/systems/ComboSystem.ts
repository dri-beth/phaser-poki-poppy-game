/**
 * ComboSystem.ts
 * Tracks a consecutive-pop streak and maps it to a score multiplier.
 *
 * The host scene is responsible for calling reset() after a configurable
 * idle window (comboResetMs) elapses with no pops.
 *
 * Multiplier steps (from balancing.ts):
 *   streak 0–4  → 1x
 *   streak 5–9  → 2x
 *   streak 10–14 → 3x
 *   streak 15+  → 5x
 */

export class ComboSystem {
  private _streak = 0
  private _multiplier: number
  private readonly _thresholds: readonly number[]
  private readonly _multipliers: readonly number[]

  constructor(thresholds: readonly number[], multipliers: readonly number[]) {
    if (thresholds.length !== multipliers.length || thresholds.length === 0) {
      throw new Error('ComboSystem: thresholds and multipliers must be non-empty and equal length')
    }
    this._thresholds = thresholds
    this._multipliers = multipliers
    this._multiplier = multipliers[0]
  }

  /**
   * Call on every successful pop.
   * Increments the streak and returns the *new* multiplier.
   */
  onPop(): number {
    this._streak++
    this._recalculate()
    return this._multiplier
  }

  /**
   * Call after the idle window expires (no pop within comboResetMs).
   * Resets streak to 0, multiplier back to 1x.
   */
  reset(): void {
    this._streak = 0
    this._recalculate()
  }

  get streak(): number {
    return this._streak
  }

  get multiplier(): number {
    return this._multiplier
  }

  /** True when the multiplier just changed — checked by comparing before/after onPop */
  multiplierAt(streak: number): number {
    let result = this._multipliers[0]
    for (let i = 0; i < this._thresholds.length; i++) {
      if (streak >= this._thresholds[i]) result = this._multipliers[i]
    }
    return result
  }

  // ──────────────────────────────────────────────────────────────────────────

  private _recalculate(): void {
    let result = this._multipliers[0]
    for (let i = 0; i < this._thresholds.length; i++) {
      if (this._streak >= this._thresholds[i]) result = this._multipliers[i]
    }
    this._multiplier = result
  }
}
