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
import { pokiBridge } from '../lib/poki/PokiBridge'
import { getViewportLayout, type ViewportLayout } from '../core/ViewportLayout'
import { ComboWidget } from '../components/ComboWidget'
import { GameTopHud } from '../components/GameTopHud'
import { RipeFruitCue } from '../components/RipeFruitCue'
import { ComboFxController } from '../systems/ComboFxController'
import { ComboSystem } from '../systems/ComboSystem'
import { ScoreSystem } from '../systems/ScoreSystem'
import { GAME_CONFIG } from '../data/gameConfig'
import {
  BALANCING,
  FRUIT_POP_MAX_LEVEL,
  getFruitPopBoardLayout,
  getFruitPopLevel,
  getFruitPopProgress
} from '../data/balancing'
import { FRUIT_TEXTURE_KEYS, getFruitStateTextureKey } from '../data/fruitAssets'
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
  2: 0xff6258,
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
  private backgroundGraphics: Phaser.GameObjects.Graphics | null = null

  private topHud!: GameTopHud
  private ripeCue!: RipeFruitCue
  private comboSystem!: ComboSystem
  private comboWidget: ComboWidget | null = null
  private comboFx: ComboFxController | null = null

  private timerRemainingMs: number = BALANCING.timerStartMs
  private dirtMeter = 0
  private perfectPops = 0
  private fruitsRemaining = 0
  private lastDirtValue = -1
  private lastPerfectValue = -1
  private gameEnded = false
  private resultQueued = false
  private hasPlayerInteracted = false
  private firstInteractionHandler: (() => void) | null = null
  private comboWidgetX = CX
  private comboWidgetY = 120
  private boardCenterX = CX
  private boardCenterY = GAME_CONFIG.height / 2
  private ripeCueBaseSize = 42
  private fruitDisplaySize = 42
  private fruitHitSize = 48
  private fruitGridGap = 10
  private resizeHandler: ((gameSize: Phaser.Structs.Size) => void) | null = null

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
    this.fruitsRemaining = 0
    this.lastDirtValue = -1
    this.lastPerfectValue = -1
    this.gameEnded = false
    this.resultQueued = false
    this.hasPlayerInteracted = false
    this.firstInteractionHandler = null
    this.comboSystem = new ComboSystem(this.levelConfig.comboResetMs)
    this.ripeCue = new RipeFruitCue({ scene: this, animationEnabled: true })
    this.registerResizeHandler()

    this.createBackground()
    this.createParticles()
    this.createPools()
    this.createFruitBoard()
    this.createHUD()
    this.refreshRipeCue()
    this.updateHUD(true)
    pokiBridge.init(this)
    this.armFirstInputGate()

    // TODO: analytics hook - gameplay_started
  }

  private armFirstInputGate(): void {
    if (this.firstInteractionHandler) {
      return
    }

    this.firstInteractionHandler = () => {
      if (this.hasPlayerInteracted || this.gameEnded) {
        return
      }

      this.hasPlayerInteracted = true
      pokiBridge.gameplayStart('first_player_input')
      this.disarmFirstInputGate()
    }

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.firstInteractionHandler)
    this.input.keyboard?.on('keydown', this.firstInteractionHandler)
  }

  private disarmFirstInputGate(): void {
    if (!this.firstInteractionHandler) {
      return
    }

    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.firstInteractionHandler)
    this.input.keyboard?.off('keydown', this.firstInteractionHandler)
    this.firstInteractionHandler = null
  }

  private createBackground(): void {
    this.backgroundGraphics?.destroy()
    const width = this.cameras.main.width
    const height = this.cameras.main.height
    const bg = this.add.graphics()
    bg.fillGradientStyle(0xf7ead4, 0xf7ead4, 0xe9f4dc, 0xe7f0ff, 1)
    bg.fillRect(0, 0, width, height)
    bg.fillStyle(0xffffff, 0.12)
    bg.fillCircle(width * 0.24, height * 0.2, Math.min(170, width * 0.4))
    bg.fillStyle(0xffb18f, 0.1)
    bg.fillCircle(width * 0.78, height * 0.82, Math.min(210, width * 0.48))
    bg.setDepth(0)
    this.backgroundGraphics = bg
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
    const layout = getViewportLayout(this)
    const progress = getFruitPopProgress(this.level)
    const panelX = layout.hudRect.x + layout.hudRect.width / 2
    const panelY = layout.hudRect.y + layout.hudRect.height / 2

    this.topHud = new GameTopHud({
      scene: this,
      x: panelX,
      y: panelY,
      width: layout.hudRect.width,
      height: layout.hudRect.height,
      compact: layout.profile !== 'normal',
      layoutVariant: layout.profile === 'normal' ? 'normal' : 'compact',
      fontScale: layout.profile === 'compact' ? 1.02 : layout.profile === 'landscapeTight' ? 0.94 : 1.06,
      level: this.level,
      progress,
      dirtValue: this.dirtMeter,
      dirtMax: BALANCING.dirtFailThreshold,
      timerMs: this.timerRemainingMs,
      perfectCount: this.perfectPops
    })

    this.comboWidgetX = layout.comboAnchor.x
    this.comboWidgetY = layout.comboAnchor.y
    this.comboWidget = new ComboWidget({
      scene: this,
      x: this.comboWidgetX,
      y: this.comboWidgetY,
      width: layout.profile === 'landscapeTight' ? 176 : layout.profile === 'compact' ? 198 : 220,
      showMeter: true,
      animationEnabled: true
    })
    this.comboFx = new ComboFxController(this)
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
    const viewport = getViewportLayout(this)
    const boardCols = this.levelConfig.boardCols
    const boardRows = this.levelConfig.boardRows
    const boardLayout = getFruitPopBoardLayout(boardCols, boardRows)
    this.computeBoardMetrics(viewport, boardLayout)
    const spanX = boardCols * this.fruitDisplaySize + (boardCols - 1) * this.fruitGridGap
    const spanY = boardRows * this.fruitDisplaySize + (boardRows - 1) * this.fruitGridGap
    const startX = viewport.boardRect.x + (viewport.boardRect.width - spanX) / 2 + this.fruitDisplaySize / 2
    const startY = viewport.boardRect.y + (viewport.boardRect.height - spanY) / 2 + this.fruitDisplaySize / 2
    this.boardCenterX = startX + ((boardCols - 1) * (this.fruitDisplaySize + this.fruitGridGap)) / 2
    this.boardCenterY = startY + ((boardRows - 1) * (this.fruitDisplaySize + this.fruitGridGap)) / 2
    this.ripeCueBaseSize = this.fruitDisplaySize

    this.fruitsRemaining = boardCols * boardRows

    for (let row = 0; row < boardRows; row++) {
      for (let col = 0; col < boardCols; col++) {
        const x = startX + col * (this.fruitDisplaySize + this.fruitGridGap)
        const cellY = startY + row * (this.fruitDisplaySize + this.fruitGridGap)
        const seed = this.getInitialFruitSeed()
        const initialElapsed = seed.elapsedMs
        const state = seed.state
        const sprite = this.add.image(x, cellY, 'fruit')
        sprite.setDisplaySize(this.fruitDisplaySize, this.fruitDisplaySize)
        sprite.setDepth(10)
        sprite.setTexture(this.getFruitTextureKey(state))
        sprite.setAngle(Phaser.Math.Between(-8, 8))

        const hitArea = this.add.zone(x, cellY, this.fruitHitSize, this.fruitHitSize)
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
    fruit.setTexture(this.getFruitTextureKey(state))

    const wobble = Math.sin(cell.elapsedMs * 0.006 + cell.wobblePhase)
    let scale = cell.baseScale
    if (state === 0) {
      scale += wobble * 0.015
    } else if (state === 1) {
      scale += wobble * 0.035
    } else if (state === 2) {
      scale += 0.03 + wobble * 0.085
    } else {
      scale = 0.93 + wobble * 0.02
    }

    fruit.setScale(scale)
    fruit.setAlpha(state === 3 ? 0.88 : 1)
    fruit.setAngle(Math.sin(cell.elapsedMs * 0.0025 + cell.wobblePhase) * (state === 3 ? 5 : 3))
  }

  update(_time: number, delta: number): void {
    if (this.gameEnded) {
      return
    }

    this.timerRemainingMs = Math.max(0, this.timerRemainingMs - delta)
    this.updateTimer()

    if (this.timerRemainingMs <= 0) {
      this.endRound('lose', "Time's up")
      return
    }

    const timeoutEvent = this.comboSystem.update(delta)
    if (timeoutEvent) {
      this.comboWidget?.onBreak(timeoutEvent)
      this.comboFx?.onComboBreak(timeoutEvent, this.comboWidgetX, this.comboWidgetY)
    }

    this.comboWidget?.updateMeter(
      this.comboSystem.timeRemainingRatio,
      this.comboSystem.tier.fxIntensity
    )

    for (let i = 0; i < this.fruits.length; i++) {
      const cell = this.fruits[i]
      if (!cell.active) {
        continue
      }

      cell.elapsedMs += delta * cell.ripenRate
      this.updateFruitVisual(cell)
    }

    this.refreshRipeCue()
  }

  private tapFruit(cell: FruitCell): void {
    if (this.gameEnded || !cell.active) {
      return
    }

    const state = this.getFruitState(cell.elapsedMs)
    cell.active = false
    cell.hitArea.disableInteractive()
    this.fruitsRemaining -= 1

    if (state === 2) {
      this.perfectPops += 1
      this.scoreSystem.add(this.levelConfig.perfectPoints)
      const comboUpdate = this.comboSystem.increment()
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
      this.comboWidget?.onIncrement(comboUpdate)
      this.comboFx?.onComboIncrease(comboUpdate, cell.sprite.x, cell.sprite.y)
    } else if (state === 3) {
      this.dirtMeter = Math.min(
        BALANCING.dirtFailThreshold,
        this.dirtMeter + this.levelConfig.dirtPerOverripe
      )
      const comboBreak = this.comboSystem.break('overripe_tap')
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
      if (comboBreak) {
        this.comboWidget?.onBreak(comboBreak)
        this.comboFx?.onComboBreak(comboBreak, cell.sprite.x, cell.sprite.y)
      }
    } else {
      const comboBreak = this.comboSystem.break('wrong_tap')
      this.spawnPopup(cell.sprite.x, cell.sprite.y - 4, POPUP_LABELS[state], POPUP_COLORS[state], 1)
      this.spawnSplatter(cell.sprite.x, cell.sprite.y, FRUIT_TINTS[state], 0.95)
      this.popParticles?.explode(BALANCING.particleBurstCount, cell.sprite.x, cell.sprite.y)
      AudioManager.playSfx(this, 'sfx_pop')
      if (comboBreak) {
        this.comboWidget?.onBreak(comboBreak)
        this.comboFx?.onComboBreak(comboBreak, cell.sprite.x, cell.sprite.y)
      }
    }

    this.animateFruitRemoval(cell.sprite)
    this.drawDirtMeter()
    this.updatePerfectText()
    this.refreshRipeCue()

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

  private updateHUD(force = false): void {
    if (force) {
      this.lastDirtValue = -1
      this.lastPerfectValue = -1
    }

    this.updateTimer(force)
    this.drawDirtMeter()
    this.updatePerfectText()
  }

  private updateTimer(force = false): void {
    this.topHud.setTimer(this.timerRemainingMs, force)
    this.topHud.pulseTimer(this.timerRemainingMs)
  }

  private drawDirtMeter(): void {
    if (this.dirtMeter === this.lastDirtValue) {
      return
    }

    this.lastDirtValue = this.dirtMeter
    const ratio = Phaser.Math.Clamp(this.dirtMeter / BALANCING.dirtFailThreshold, 0, 1)
    this.topHud.setDirt(ratio, `${this.dirtMeter} / ${BALANCING.dirtFailThreshold}`, this.dirtMeter > 0)
  }

  private updatePerfectText(): void {
    if (this.perfectPops === this.lastPerfectValue) {
      return
    }

    this.lastPerfectValue = this.perfectPops
    this.topHud.setPerfect(this.perfectPops, this.perfectPops > 0)
  }

  private endRound(outcome: FruitPopOutcome, reason: string): void {
    if (this.gameEnded || this.resultQueued) {
      return
    }

    this.gameEnded = true
    this.resultQueued = true
    pokiBridge.gameplayStop(outcome === 'win' ? 'round_end_win' : 'round_end_lose')
    this.disarmFirstInputGate()

    const comboBreak = this.comboSystem.break('round_end')
    if (comboBreak) {
      this.comboWidget?.onBreak(comboBreak)
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
    pokiBridge.gameplayStop('scene_shutdown')
    this.disarmFirstInputGate()
    if (this.resizeHandler) {
      this.scale.off('resize', this.resizeHandler, this)
      this.resizeHandler = null
    }
    this.comboFx?.destroy()
    this.comboFx = null
    this.backgroundGraphics?.destroy()
    this.backgroundGraphics = null
    if (this.ripeCue) {
      this.ripeCue.destroy()
    }
    if (this.topHud) {
      this.topHud.destroy()
    }
    if (this.comboWidget) {
      this.tweens.killTweensOf(this.comboWidget)
      this.comboWidget.destroy()
      this.comboWidget = null
    }
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

  private refreshRipeCue(): void {
    if (!this.ripeCue) {
      return
    }

    let primary: FruitCell | null = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (let i = 0; i < this.fruits.length; i++) {
      const cell = this.fruits[i]
      if (!cell.active || this.getFruitState(cell.elapsedMs) !== 2) {
        continue
      }

      const dx = cell.sprite.x - this.boardCenterX
      const dy = cell.sprite.y - this.boardCenterY
      const distance = dx * dx + dy * dy
      if (distance < bestDistance) {
        bestDistance = distance
        primary = cell
      }
    }

    if (!primary) {
      this.ripeCue.hide()
      return
    }

    this.ripeCue.show(primary.sprite.x, primary.sprite.y, this.ripeCueBaseSize)
  }

  private registerResizeHandler(): void {
    if (this.resizeHandler) return
    this.resizeHandler = () => this.relayoutForViewport()
    this.scale.on('resize', this.resizeHandler, this)
  }

  private relayoutForViewport(): void {
    if (this.gameEnded) return
    const layout = getViewportLayout(this)
    this.createBackground()
    this.relayoutHud(layout)
    this.relayoutFruitBoard(layout)
    this.refreshRipeCue()
  }

  private relayoutHud(layout: ViewportLayout): void {
    const panelX = layout.hudRect.x + layout.hudRect.width / 2
    const panelY = layout.hudRect.y + layout.hudRect.height / 2
    this.topHud.setLayout({
      x: panelX,
      y: panelY,
      width: layout.hudRect.width,
      height: layout.hudRect.height,
      variant: layout.profile === 'normal' ? 'normal' : 'compact',
      fontScale: layout.profile === 'compact' ? 1.02 : layout.profile === 'landscapeTight' ? 0.94 : 1.06
    })

    this.comboWidgetX = layout.comboAnchor.x
    this.comboWidgetY = layout.comboAnchor.y
    if (this.comboWidget) {
      this.comboWidget.setPosition(this.comboWidgetX, this.comboWidgetY)
    }
  }

  private relayoutFruitBoard(layout: ViewportLayout): void {
    const boardLayout = getFruitPopBoardLayout(this.levelConfig.boardCols, this.levelConfig.boardRows)
    this.computeBoardMetrics(layout, boardLayout)
    const spanX = this.levelConfig.boardCols * this.fruitDisplaySize + (this.levelConfig.boardCols - 1) * this.fruitGridGap
    const spanY = this.levelConfig.boardRows * this.fruitDisplaySize + (this.levelConfig.boardRows - 1) * this.fruitGridGap
    const startX = layout.boardRect.x + (layout.boardRect.width - spanX) / 2 + this.fruitDisplaySize / 2
    const startY = layout.boardRect.y + (layout.boardRect.height - spanY) / 2 + this.fruitDisplaySize / 2
    this.boardCenterX = startX + ((this.levelConfig.boardCols - 1) * (this.fruitDisplaySize + this.fruitGridGap)) / 2
    this.boardCenterY = startY + ((this.levelConfig.boardRows - 1) * (this.fruitDisplaySize + this.fruitGridGap)) / 2
    this.ripeCueBaseSize = this.fruitDisplaySize

    for (let i = 0; i < this.fruits.length; i++) {
      const cell = this.fruits[i]
      const x = startX + cell.col * (this.fruitDisplaySize + this.fruitGridGap)
      const y = startY + cell.row * (this.fruitDisplaySize + this.fruitGridGap)
      cell.sprite.setPosition(x, y).setDisplaySize(this.fruitDisplaySize, this.fruitDisplaySize)
      cell.hitArea.setPosition(x, y).setSize(this.fruitHitSize, this.fruitHitSize)
    }
  }

  private computeBoardMetrics(viewport: ViewportLayout, boardLayout: ReturnType<typeof getFruitPopBoardLayout>): void {
    const availableWidth = viewport.boardRect.width
    const availableHeight = viewport.boardRect.height
    const scaleToFit = Math.min(1, availableWidth / boardLayout.boardSpanX, availableHeight / boardLayout.boardSpanY)
    this.fruitDisplaySize = Math.max(28, Math.round(boardLayout.fruitSize * scaleToFit))
    this.fruitGridGap = Math.max(4, Math.round(boardLayout.gridGap * scaleToFit))
    this.fruitHitSize = Math.max(34, Math.round(boardLayout.hitSize * scaleToFit))
  }

  private getFruitTextureKey(state: FruitState): string {
    const key = getFruitStateTextureKey(state)
    if (this.textures.exists(key)) {
      return key
    }
    return this.textures.exists(FRUIT_TEXTURE_KEYS.legacy) ? FRUIT_TEXTURE_KEYS.legacy : key
  }
}
