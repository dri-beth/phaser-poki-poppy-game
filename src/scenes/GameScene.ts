/**
 * GameScene.ts
 * Fruit Pop gameplay.
 *
 * Core loop:
 * - Square fruit board that grows per level
 * - Fruits ripen over time
 * - Tap outcomes depend on ripeness
 * - Perfect taps score, overripe taps add dirt
 * - Win by clearing the board, lose by timer or dirt
 */

import { AudioManager } from '../core/AudioManager'
import { pokiGameplayStart, pokiGameplayStop } from '../core/PokiLifecycle'
import { ScoreSystem } from '../systems/ScoreSystem'
import { GAME_CONFIG } from '../data/gameConfig'
import {
  BALANCING,
  FRUIT_POP_MAX_LEVEL,
  getFruitPopBoardLayout,
  getFruitPopLevel,
  getFruitPopProgress
} from '../data/balancing'
import { formatTime } from '../utils/helpers'
import type {
  FruitPopOutcome,
  FruitPopGrade,
  FruitPopResultData,
  FruitPopRunData
} from '../types/fruitPop'

const CX = GAME_CONFIG.width / 2

type FruitState = 0 | 1 | 2 | 3

interface FruitCell {
  sprite: Phaser.GameObjects.Image
  hitArea: Phaser.GameObjects.Zone
  state: FruitState
  elapsedMs: number
  active: boolean
  ripenRate: number
  wobblePhase: number
  baseScale: number
  row: number
  col: number
}

interface PopupEntry {
  text: Phaser.GameObjects.Text
  active: boolean
}

interface SplatterEntry {
  image: Phaser.GameObjects.Image
  active: boolean
}

const FRUIT_TINTS: Record<FruitState, number> = {
  0: 0x7ccf5b,
  1: 0xffcf5a,
  2: 0xf26b5d,
  3: 0x7a4b35
}

const POPUP_COLORS: Record<FruitState, string> = {
  0: '#8c7352',
  1: '#a87b00',
  2: '#ffffff',
  3: '#5f4b2c'
}

const POPUP_LABELS: Record<FruitState, string> = {
  0: 'EARLY',
  1: 'WAIT',
  2: 'PERFECT!',
  3: 'ROTTEN!'
}

export class GameScene extends Phaser.Scene {
  private level = 1
  private levelConfig = getFruitPopLevel(1)
  private scoreSystem!: ScoreSystem
  private fruits: FruitCell[] = []
  private popParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null
  private splatterPool: SplatterEntry[] = []
  private popupPool: PopupEntry[] = []

  private dirtTrack!: Phaser.GameObjects.Graphics
  private dirtFill!: Phaser.GameObjects.Graphics
  private dirtValueText!: Phaser.GameObjects.Text
  private timerText!: Phaser.GameObjects.Text
  private perfectText!: Phaser.GameObjects.Text
  private comboText!: Phaser.GameObjects.Text

  private timerRemainingMs: number = BALANCING.timerStartMs
  private dirtMeter = 0
  private perfectPops = 0
  private comboChain = 0
  private fruitsRemaining = 0
  private lastShownSecond = -1
  private lastDirtValue = -1
  private lastPerfectValue = -1
  private gameEnded = false
  private comboResetTimer: Phaser.Time.TimerEvent | null = null
  private resultQueued = false
  private pokiGameplayActive = false

  constructor() {
    super({ key: 'GameScene' })
  }

  init(data: FruitPopRunData): void {
    this.level = Math.max(1, Math.floor(data?.level ?? 1))
    this.levelConfig = getFruitPopLevel(this.level)
  }

  create(): void {
    this.cameras.main.setBackgroundColor(GAME_CONFIG.backgroundColor)
    this.cameras.main.fadeIn(BALANCING.sceneFadeDuration, 0, 0, 0)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this)

    this.scoreSystem = new ScoreSystem()
    this.fruits = []
    this.splatterPool = []
    this.popupPool = []
    this.destroyParticles()
    this.timerRemainingMs = this.levelConfig.timerStartMs
    this.dirtMeter = 0
    this.perfectPops = 0
    this.comboChain = 0
    this.fruitsRemaining = 0
    this.lastShownSecond = -1
    this.lastDirtValue = -1
    this.lastPerfectValue = -1
    this.gameEnded = false
    this.resultQueued = false

    this.createBackground()
    this.createParticles()
    this.createPools()
    this.createHUD()
    this.createFruitBoard()
    this.updateHUD(true)
    this.startPokiGameplay()

    // TODO: analytics hook - gameplay_started
  }

  private startPokiGameplay(): void {
    if (this.pokiGameplayActive) {
      return
    }

    this.pokiGameplayActive = true
    pokiGameplayStart(this)
  }

  private stopPokiGameplay(): void {
    if (!this.pokiGameplayActive) {
      return
    }

    this.pokiGameplayActive = false
    pokiGameplayStop(this)
  }

  private createBackground(): void {
    const bg = this.add.graphics()
    bg.fillGradientStyle(0xf7ead4, 0xf7ead4, 0xe9f4dc, 0xe7f0ff, 1)
    bg.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)

    bg.fillStyle(0xffffff, 0.12)
    bg.fillCircle(CX - 120, 150, 170)
    bg.fillStyle(0xffb18f, 0.1)
    bg.fillCircle(CX + 110, GAME_CONFIG.height - 180, 210)
  }

  private createParticles(): void {
    this.popParticles = this.add.particles(0, 0, 'particle', {
      speed: { min: 80, max: 200 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 360,
      quantity: BALANCING.particleBurstCount,
      emitting: false
    })
    this.popParticles.setDepth(35)
  }

  private createHUD(): void {
    const progress = getFruitPopProgress(this.level)
    const progressBarWidth = 220
    const progressBarHeight = 10
    const progressBarX = CX - progressBarWidth / 2
    const progressBarY = 34
    const progressFillWidth = Math.max(0, Math.round(progressBarWidth * progress))

    this.add
      .text(CX, 10, `LEVEL ${this.level} / ${FRUIT_POP_MAX_LEVEL}`, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        fontStyle: 'bold',
        resolution: 2
      })
      .setOrigin(0.5, 0)
      .setDepth(20)

    this.add
      .text(CX, 30, `BOARD ${this.levelConfig.boardLabel}`, {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#8c7352',
        resolution: 2
      })
      .setOrigin(0.5, 0)
      .setDepth(20)

    const progressTrack = this.add.graphics().setDepth(19)
    progressTrack.fillStyle(0x8c7352, 0.18)
    progressTrack.fillRoundedRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 5)
    progressTrack.lineStyle(1, 0x7a3e2c, 0.25)
    progressTrack.strokeRoundedRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 5)

    const progressFill = this.add.graphics().setDepth(20)
    if (progressFillWidth > 0) {
      progressFill.fillStyle(0x7ccf5b, 1)
      progressFill.fillRoundedRect(progressBarX, progressBarY, progressFillWidth, progressBarHeight, 5)
    }

    this.add
      .text(progressBarX + progressBarWidth + 8, progressBarY - 1, `${Math.round(progress * 100)}%`, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        resolution: 2
      })
      .setOrigin(0, 0)
      .setDepth(20)

    this.add
      .text(16, 10, 'DIRT', {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        fontStyle: 'bold',
        resolution: 2
      })
      .setDepth(20)

    this.dirtValueText = this.add
      .text(16, 28, '0 / 100', {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        resolution: 2
      })
      .setDepth(20)

    this.dirtTrack = this.add.graphics().setDepth(19)
    this.dirtFill = this.add.graphics().setDepth(20)

    this.timerText = this.add
      .text(GAME_CONFIG.width - 16, 12, formatTime(this.levelConfig.timerStartMs), {
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        fontStyle: 'bold',
        resolution: 2
      })
      .setOrigin(1, 0)
      .setDepth(20)

    this.perfectText = this.add
      .text(CX, 72, 'Perfect: 0', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        fontStyle: 'bold',
        resolution: 2
      })
      .setOrigin(0.5, 0)
      .setDepth(20)

    this.comboText = this.add
      .text(GAME_CONFIG.width - 16, GAME_CONFIG.height - 72, '', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        fontStyle: 'bold',
        resolution: 2
      })
      .setOrigin(1, 0)
      .setDepth(20)
      .setVisible(false)
  }

  private createPools(): void {
    for (let i = 0; i < BALANCING.splatterPoolSize; i++) {
      const image = this.add.image(0, 0, 'splatter')
      image.setVisible(false)
      image.setDepth(30)
      this.splatterPool.push({ image, active: false })
    }

    for (let i = 0; i < BALANCING.popupPoolSize; i++) {
      const text = this.add
        .text(0, 0, '', {
          fontSize: '18px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffffff',
          fontStyle: 'bold',
          resolution: 2,
          stroke: '#7a3e2c',
          strokeThickness: 3
        })
        .setOrigin(0.5)
        .setVisible(false)
        .setDepth(40)

      this.popupPool.push({ text, active: false })
    }
  }

  private createFruitBoard(): void {
    const boardCols = this.levelConfig.boardCols
    const boardRows = this.levelConfig.boardRows
    const layout = getFruitPopBoardLayout(boardCols, boardRows)
    const topInset = 118
    const bottomInset = 126
    const availableHeight = GAME_CONFIG.height - topInset - bottomInset
    const startX = CX - layout.boardSpanX / 2 + layout.fruitSize / 2
    const startY = topInset + (availableHeight - layout.boardSpanY) / 2 + layout.fruitSize / 2

    this.fruitsRemaining = boardCols * boardRows

    for (let row = 0; row < boardRows; row++) {
      for (let col = 0; col < boardCols; col++) {
        const x = startX + col * (layout.fruitSize + layout.gridGap)
        const y = startY + row * (layout.fruitSize + layout.gridGap)
        const seed = this.getInitialFruitSeed()
        const initialElapsed = seed.elapsedMs
        const state = seed.state
        const sprite = this.add.image(x, y, 'fruit')
        sprite.setDisplaySize(layout.fruitSize, layout.fruitSize)
        sprite.setDepth(10)
        sprite.setTint(FRUIT_TINTS[state])
        sprite.setAngle(Phaser.Math.Between(-8, 8))

        const hitArea = this.add.zone(x, y, layout.hitSize, layout.hitSize)
        hitArea.setDepth(11)
        hitArea.setInteractive({ useHandCursor: true })

        const cell: FruitCell = {
          sprite,
          hitArea,
          state,
          elapsedMs: initialElapsed,
          active: true,
          ripenRate: Phaser.Math.FloatBetween(this.levelConfig.ripenRateMin, this.levelConfig.ripenRateMax),
          wobblePhase: Phaser.Math.FloatBetween(0, Math.PI * 2),
          baseScale: 1,
          row,
          col
        }

        hitArea.on('pointerdown', () => this.tapFruit(cell))
        this.fruits.push(cell)
        this.updateFruitVisual(cell)
      }
    }
  }

  private getInitialFruitSeed(): { state: FruitState; elapsedMs: number } {
    const roll = Math.random()

    if (roll < this.levelConfig.greenStartChance) {
      return {
        state: 0,
        elapsedMs: Phaser.Math.FloatBetween(0, this.levelConfig.greenToYellowMs - 1)
      }
    }

    if (roll < this.levelConfig.greenStartChance + this.levelConfig.yellowStartChance) {
      return {
        state: 1,
        elapsedMs: Phaser.Math.FloatBetween(
          this.levelConfig.greenToYellowMs,
          this.levelConfig.yellowToRedMs - 1
        )
      }
    }

    return {
      state: 2,
      elapsedMs: Phaser.Math.FloatBetween(this.levelConfig.yellowToRedMs, this.levelConfig.redToOverripeMs - 1)
    }
  }

  private getFruitState(elapsedMs: number): FruitState {
    if (elapsedMs >= this.levelConfig.redToOverripeMs) return 3
    if (elapsedMs >= this.levelConfig.yellowToRedMs) return 2
    if (elapsedMs >= this.levelConfig.greenToYellowMs) return 1
    return 0
  }

  private updateFruitVisual(cell: FruitCell): void {
    const state = this.getFruitState(cell.elapsedMs)
    cell.state = state

    const fruit = cell.sprite
    fruit.setTint(FRUIT_TINTS[state])

    const wobble = Math.sin(cell.elapsedMs * 0.006 + cell.wobblePhase)
    let scale = cell.baseScale
    if (state === 0) {
      scale += wobble * 0.015
    } else if (state === 1) {
      scale += wobble * 0.035
    } else if (state === 2) {
      scale += wobble * 0.06
    } else {
      scale = 0.96 + wobble * 0.03
    }

    fruit.setScale(scale)
    fruit.setAlpha(state === 3 ? 0.98 : 1)
    fruit.setAngle(Math.sin(cell.elapsedMs * 0.0025 + cell.wobblePhase) * (state === 3 ? 5 : 3))
  }

  update(_time: number, delta: number): void {
    if (this.gameEnded) {
      return
    }

    this.timerRemainingMs = Math.max(0, this.timerRemainingMs - delta)
    this.updateTimerText()
    this.updateTimerPulse()

    if (this.timerRemainingMs <= 0) {
      this.endRound('lose', "Time's up")
      return
    }

    for (let i = 0; i < this.fruits.length; i++) {
      const cell = this.fruits[i]
      if (!cell.active) {
        continue
      }

      cell.elapsedMs += delta * cell.ripenRate
      this.updateFruitVisual(cell)
    }
  }

  private tapFruit(cell: FruitCell): void {
    if (this.gameEnded || !cell.active) {
      return
    }

    const state = this.getFruitState(cell.elapsedMs)
    cell.active = false
    cell.hitArea.disableInteractive()
    this.fruitsRemaining -= 1

    if (this.comboResetTimer) {
      this.comboResetTimer.destroy()
      this.comboResetTimer = null
    }

    if (state === 2) {
      this.perfectPops += 1
      this.scoreSystem.add(this.levelConfig.perfectPoints)
      this.comboChain += 1
      this.spawnPopup(
        cell.sprite.x,
        cell.sprite.y - 4,
        `+${this.levelConfig.perfectPoints} PERFECT!`,
        POPUP_COLORS[state],
        this.levelConfig.perfectPoints > 1 ? 1.05 : 1
      )
      this.spawnSplatter(cell.sprite.x, cell.sprite.y, FRUIT_TINTS[state], 1.1)
      this.popParticles?.explode(BALANCING.particleBurstCount, cell.sprite.x, cell.sprite.y)
      this.cameras.main.flash(60, 255, 255, 255)
      AudioManager.playSfx(this, 'sfx_perfect')
      this.scheduleComboReset()
    } else if (state === 3) {
      this.dirtMeter = Math.min(
        BALANCING.dirtFailThreshold,
        this.dirtMeter + this.levelConfig.dirtPerOverripe
      )
      this.comboChain = 0
      this.spawnPopup(
        cell.sprite.x,
        cell.sprite.y - 4,
        `+${this.levelConfig.dirtPerOverripe} DIRT`,
        POPUP_COLORS[state],
        1
      )
      this.spawnSplatter(cell.sprite.x, cell.sprite.y, FRUIT_TINTS[state], 1.2)
      this.popParticles?.explode(BALANCING.particleBurstCount, cell.sprite.x, cell.sprite.y)
      this.cameras.main.shake(100, 0.0025)
      AudioManager.playSfx(this, 'sfx_rotten')
    } else {
      this.comboChain = 0
      this.spawnPopup(cell.sprite.x, cell.sprite.y - 4, POPUP_LABELS[state], POPUP_COLORS[state], 1)
      this.spawnSplatter(cell.sprite.x, cell.sprite.y, FRUIT_TINTS[state], 0.95)
      this.popParticles?.explode(BALANCING.particleBurstCount, cell.sprite.x, cell.sprite.y)
      AudioManager.playSfx(this, 'sfx_pop')
    }

    this.animateFruitRemoval(cell.sprite)
    this.updateComboText()
    this.drawDirtMeter()
    this.updatePerfectText()

    if (this.dirtMeter >= BALANCING.dirtFailThreshold) {
      this.endRound('lose', 'Too rotten')
      return
    }

    if (this.fruitsRemaining <= 0) {
      this.endRound('win', 'All fruit cleared')
    }
  }

  private animateFruitRemoval(sprite: Phaser.GameObjects.Image): void {
    this.tweens.add({
      targets: sprite,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: BALANCING.popPunchDuration,
      ease: 'Back.easeIn',
      onComplete: () => {
        sprite.setVisible(false)
      }
    })
  }

  private spawnSplatter(x: number, y: number, tint: number, scale: number): void {
    const entry = this.splatterPool.find((candidate) => !candidate.active)
    if (!entry) {
      return
    }

    entry.active = true
    entry.image
      .setPosition(x + Phaser.Math.Between(-4, 4), y + Phaser.Math.Between(-4, 4))
      .setTint(tint)
      .setScale(scale)
      .setRotation(Phaser.Math.FloatBetween(-0.8, 0.8))
      .setAlpha(0.85)
      .setVisible(true)

    this.tweens.add({
      targets: entry.image,
      alpha: 0,
      scaleX: scale * BALANCING.splatScale,
      scaleY: scale * BALANCING.splatScale,
      duration: BALANCING.splatFadeDuration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        entry.image.setVisible(false)
        entry.active = false
      }
    })
  }

  private spawnPopup(x: number, y: number, label: string, color: string, scale: number): void {
    const entry = this.popupPool.find((candidate) => !candidate.active)
    if (!entry) {
      return
    }

    entry.active = true
    entry.text
      .setPosition(x, y)
      .setText(label)
      .setColor(color)
      .setScale(scale)
      .setAlpha(1)
      .setVisible(true)

    this.tweens.add({
      targets: entry.text,
      y: y - 34,
      alpha: 0,
      scaleX: scale * 1.08,
      scaleY: scale * 1.08,
      duration: BALANCING.popupDuration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        entry.text.setVisible(false)
        entry.active = false
      }
    })
  }

  private scheduleComboReset(): void {
    this.comboText.setVisible(this.comboChain > 1)
    if (this.comboChain <= 1) {
      return
    }

    this.comboResetTimer = this.time.delayedCall(this.levelConfig.comboResetMs, () => {
      this.comboChain = 0
      this.updateComboText()
    })
  }

  private updateComboText(): void {
    if (this.comboChain > 1) {
      this.comboText.setText(`COMBO x${this.comboChain}`).setVisible(true)
      return
    }

    this.comboText.setVisible(false)
  }

  private updateHUD(force = false): void {
    if (force) {
      this.lastShownSecond = -1
      this.lastDirtValue = -1
      this.lastPerfectValue = -1
    }

    this.updateTimerText()
    this.drawDirtMeter()
    this.updatePerfectText()
    this.updateComboText()
  }

  private updateTimerText(): void {
    const shownSecond = Math.ceil(this.timerRemainingMs / 1000)
    if (shownSecond === this.lastShownSecond) {
      return
    }

    this.lastShownSecond = shownSecond
    this.timerText.setText(formatTime(this.timerRemainingMs))
    this.tweens.killTweensOf(this.timerText)
    this.timerText.setScale(1)

    if (shownSecond <= 5) {
      this.timerText.setColor('#b0362f')
    } else if (shownSecond <= 10) {
      this.timerText.setColor('#d95a4e')
    } else {
      this.timerText.setColor('#7a3e2c')
    }
  }

  private updateTimerPulse(): void {
    const remainingSeconds = this.timerRemainingMs / 1000
    if (remainingSeconds <= 5) {
      const pulse = 1 + Math.sin(this.time.now * 0.02) * 0.08
      this.timerText.setScale(pulse)
      return
    }

    if (remainingSeconds <= 10) {
      const pulse = 1 + Math.sin(this.time.now * 0.012) * 0.03
      this.timerText.setScale(pulse)
      return
    }

    this.timerText.setScale(1)
  }

  private drawDirtMeter(): void {
    if (this.dirtMeter === this.lastDirtValue) {
      return
    }

    this.lastDirtValue = this.dirtMeter

    const ratio = Phaser.Math.Clamp(this.dirtMeter / BALANCING.dirtFailThreshold, 0, 1)
    const barWidth = 170
    const barHeight = 14
    const fillWidth = Math.max(0, Math.round(barWidth * ratio))
    let fillColor = 0x7ccf5b
    if (ratio >= 0.75) {
      fillColor = 0xd95a4e
    } else if (ratio >= 0.4) {
      fillColor = 0xffb14d
    }

    this.dirtTrack.clear()
    this.dirtTrack.fillStyle(0x8c7352, 0.16)
    this.dirtTrack.fillRoundedRect(16, 92, barWidth, barHeight, 7)
    this.dirtTrack.lineStyle(2, 0x7a3e2c, 0.28)
    this.dirtTrack.strokeRoundedRect(16, 92, barWidth, barHeight, 7)

    this.dirtFill.clear()
    if (fillWidth > 0) {
      this.dirtFill.fillStyle(fillColor, 1)
      this.dirtFill.fillRoundedRect(16, 92, fillWidth, barHeight, 7)
    }

    this.dirtValueText.setText(`${this.dirtMeter} / ${BALANCING.dirtFailThreshold}`)
  }

  private updatePerfectText(): void {
    if (this.perfectPops === this.lastPerfectValue) {
      return
    }

    this.lastPerfectValue = this.perfectPops
    this.perfectText.setText(`Perfect: ${this.perfectPops}`)
  }

  private endRound(outcome: FruitPopOutcome, reason: string): void {
    if (this.gameEnded || this.resultQueued) {
      return
    }

    this.gameEnded = true
    this.resultQueued = true
    this.stopPokiGameplay()

    if (this.comboResetTimer) {
      this.comboResetTimer.destroy()
      this.comboResetTimer = null
    }

    for (let i = 0; i < this.fruits.length; i++) {
      this.fruits[i].hitArea.disableInteractive()
    }

    if (outcome === 'win') {
      this.cameras.main.flash(140, 255, 244, 224)
      AudioManager.playSfx(this, 'sfx_win')
    } else {
      this.cameras.main.shake(180, 0.004)
      AudioManager.playSfx(this, 'sfx_lose')
    }

    const score = this.scoreSystem.getScore()
    const highScore = this.scoreSystem.getHighScore()
    const isNewHighScore = this.scoreSystem.isNewHighScore()
    const grade = this.getGrade(this.perfectPops, this.fruits.length)
    const nextLevel = outcome === 'win' ? Math.min(this.level + 1, FRUIT_POP_MAX_LEVEL) : 1
    const data: FruitPopResultData = {
      level: this.level,
      nextLevel,
      outcome,
      reason,
      score,
      perfectPops: this.perfectPops,
      totalFruits: this.fruits.length,
      highScore,
      isNewHighScore,
      grade
    }

    this.cameras.main.fadeOut(BALANCING.sceneFadeDuration, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('ResultScene', data)
    })
  }

  private getGrade(perfectPops: number, totalFruits: number): FruitPopGrade {
    if (perfectPops >= totalFruits) return 'S'
    const ratio = totalFruits > 0 ? perfectPops / totalFruits : 0
    if (ratio >= 0.7) return 'A'
    if (ratio >= 0.5) return 'B'
    if (ratio >= 0.3) return 'C'
    return 'D'
  }

  shutdown(): void {
    if (this.comboResetTimer) {
      this.comboResetTimer.destroy()
      this.comboResetTimer = null
    }

    this.stopPokiGameplay()
    this.destroyPools()
    this.destroyParticles()
  }

  private destroyPools(): void {
    for (const entry of this.splatterPool) {
      this.tweens.killTweensOf(entry.image)
      entry.image.destroy()
    }

    for (const entry of this.popupPool) {
      this.tweens.killTweensOf(entry.text)
      entry.text.destroy()
    }

    this.splatterPool = []
    this.popupPool = []
  }

  private destroyParticles(): void {
    if (!this.popParticles) {
      return
    }

    this.popParticles.destroy()
    this.popParticles = null
  }
}
