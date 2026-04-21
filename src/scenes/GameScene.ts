/**
 * GameScene.ts — Poppy · Zen Mode (M2 complete)
 *
 * What's implemented:
 *  • 5×5 bubble board — Classic palette
 *  • Tap → pop FX: scale punch + ring ripple + cell flash + particles + haptic
 *  • Combo multiplier (1x/2x/3x/5x), resets after 2s idle
 *  • Score wired to live combo multiplier
 *  • Board-cleared flash + stagger refill animation
 *  • Board counter ("Board N" in HUD)
 *  • Poki commercialBreak between boards
 *  • ✕ exits to ResultScene with final score
 *
 * What remains (see roadmap):
 *  • Theme hot-swap (M3)
 *  • Pattern / Rhythm / Daily modes (M4-M6)
 *  • Accessibility pass (M7)
 */

import { ScoreSystem } from '../systems/ScoreSystem'
import { ComboSystem } from '../systems/ComboSystem'
import { AudioManager } from '../core/AudioManager'
import { GAME_CONFIG } from '../data/gameConfig'
import { BALANCING } from '../data/balancing'
import { formatScore } from '../utils/helpers'

const CX = GAME_CONFIG.width / 2
const CY = GAME_CONFIG.height / 2

// ── Classic theme palette ────────────────────────────────────────────────────
const CLASSIC = {
  bubbleTints: [0xf48fb1, 0xce93d8, 0x90caf9, 0xa5d6a7, 0xffe082],
  background: 0xfce4ec,
  hudColor: '#5d4037',
  comboColors: ['#5d4037', '#e91e63', '#9c27b0', '#f44336'] // 1x/2x/3x/5x
}

type BubbleState = 'idle' | 'popped' | 'refilling'

interface BubbleCell {
  sprite: Phaser.GameObjects.Image
  ring: Phaser.GameObjects.Image
  state: BubbleState
  row: number
  col: number
}

export class GameScene extends Phaser.Scene {
  // ── Systems ────────────────────────────────────────────────────────────────
  private scoreSystem!: ScoreSystem
  private comboSystem!: ComboSystem
  private comboResetTimer: Phaser.Time.TimerEvent | null = null

  // ── Board ──────────────────────────────────────────────────────────────────
  private cells: BubbleCell[] = []
  private poppedCount = 0
  private totalBubbles = 0
  private isRefilling = false
  private boardCount = 0

  // ── HUD ───────────────────────────────────────────────────────────────────
  private scoreText!: Phaser.GameObjects.Text
  private comboText!: Phaser.GameObjects.Text
  private boardText!: Phaser.GameObjects.Text

  // ── FX ────────────────────────────────────────────────────────────────────
  private popParticles!: Phaser.GameObjects.Particles.ParticleEmitter
  /** Timestamp of the last flash — enforces WCAG MIN_FLASH_INTERVAL_MS */
  private lastFlashTime = 0

  constructor() {
    super({ key: 'GameScene' })
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  create(): void {
    this.cameras.main.setBackgroundColor(CLASSIC.background)
    this.cameras.main.fadeIn(BALANCING.sceneFadeDuration, 0, 0, 0)

    this.scoreSystem = new ScoreSystem()
    this.comboSystem = new ComboSystem(
      BALANCING.comboStreakThresholds,
      BALANCING.comboMultipliers
    )
    this.poppedCount = 0
    this.isRefilling = false
    this.boardCount = 0
    this.lastFlashTime = 0

    this.createBackground()
    this.createParticleEmitter()
    this.createBoard()
    this.createHUD()

    // TODO: analytics hook — gameplay_started
  }

  // ─── Background ────────────────────────────────────────────────────────────

  private createBackground(): void {
    const bg = this.add.graphics()
    bg.fillStyle(CLASSIC.background, 1)
    bg.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
    bg.setDepth(0)
  }

  // ─── Particles ─────────────────────────────────────────────────────────────

  private createParticleEmitter(): void {
    this.popParticles = this.add.particles(0, 0, 'particle', {
      speed: { min: 80, max: 200 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 400,
      quantity: 8,
      emitting: false
    })
    this.popParticles.setDepth(30)
  }

  // ─── Board ─────────────────────────────────────────────────────────────────

  private createBoard(): void {
    this.cells = []
    const { boardCols, boardRows, bubbleSize, gridGap } = BALANCING

    const boardW = boardCols * bubbleSize + (boardCols - 1) * gridGap
    const boardH = boardRows * bubbleSize + (boardRows - 1) * gridGap
    const startX = CX - boardW / 2 + bubbleSize / 2
    const startY = CY - boardH / 2 + bubbleSize / 2

    this.totalBubbles = boardCols * boardRows

    for (let row = 0; row < boardRows; row++) {
      for (let col = 0; col < boardCols; col++) {
        const x = startX + col * (bubbleSize + gridGap)
        const y = startY + row * (bubbleSize + gridGap)

        const tint = CLASSIC.bubbleTints[(row + col) % CLASSIC.bubbleTints.length]

        const sprite = this.add.image(x, y, 'bubble')
        sprite.setDisplaySize(bubbleSize, bubbleSize)
        sprite.setTint(tint)
        sprite.setDepth(10)
        sprite.setInteractive({ useHandCursor: true })

        const ring = this.add.image(x, y, 'bubble_ring')
        ring.setDisplaySize(bubbleSize, bubbleSize)
        ring.setTint(tint)
        ring.setAlpha(0)
        ring.setDepth(11)

        const cell: BubbleCell = { sprite, ring, state: 'idle', row, col }
        this.cells.push(cell)

        sprite.on('pointerdown', () => this.onBubbleTap(cell))
      }
    }
  }

  // ─── Pop Interaction ───────────────────────────────────────────────────────

  private onBubbleTap(cell: BubbleCell): void {
    if (cell.state !== 'idle' || this.isRefilling) return

    cell.state = 'popped'
    cell.sprite.disableInteractive()
    this.poppedCount++

    // Combo: record multiplier before pop so we can detect tier change
    const prevMult = this.comboSystem.multiplier
    const newMult = this.comboSystem.onPop()

    const points = BALANCING.pointsPerPop * newMult
    this.scoreSystem.add(points)

    this.playPopFX(cell)
    this.updateHUD(prevMult !== newMult)
    AudioManager.playSfx(this, 'sfx_pop')

    // Reset idle timer
    if (this.comboResetTimer) this.comboResetTimer.destroy()
    this.comboResetTimer = this.time.delayedCall(BALANCING.comboResetMs, () => {
      this.comboSystem.reset()
      this.updateHUD(true)
    })

    if (this.poppedCount >= this.totalBubbles) {
      this.onBoardCleared()
    }
  }

  // ─── Pop FX ────────────────────────────────────────────────────────────────

  private playPopFX(cell: BubbleCell): void {
    const { sprite, ring } = cell
    const { popPunchDuration, rippleDuration, flashDuration, hapticMs, minFlashIntervalMs } =
      BALANCING

    // 1. Scale punch — Back.easeIn → disappear
    this.tweens.add({
      targets: sprite,
      scaleX: 0,
      scaleY: 0,
      duration: popPunchDuration,
      ease: 'Back.easeIn',
      onComplete: () => sprite.setVisible(false)
    })

    // 2. Ring ripple — expand + alpha fade
    ring.setScale(1)
    ring.setAlpha(0.8)
    this.tweens.add({
      targets: ring,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: rippleDuration,
      ease: 'Quad.easeOut'
    })

    // 3. Cell flash — WCAG-capped: no more than 1 per minFlashIntervalMs
    const now = this.time.now
    if (now - this.lastFlashTime >= minFlashIntervalMs) {
      this.lastFlashTime = now
      const flash = this.add.circle(sprite.x, sprite.y, BALANCING.bubbleSize / 2, 0xffffff, 0.5)
      flash.setDepth(12)
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: flashDuration,
        onComplete: () => flash.destroy()
      })
    }

    // 4. Particle burst
    this.popParticles.explode(8, sprite.x, sprite.y)

    // 5. Haptic (mobile only)
    if ('vibrate' in navigator) navigator.vibrate(hapticMs)
  }

  // ─── Board Clear / Refill ─────────────────────────────────────────────────

  private onBoardCleared(): void {
    this.isRefilling = true
    this.boardCount++

    // Cancel combo idle timer — clearing the board keeps the streak alive
    if (this.comboResetTimer) this.comboResetTimer.destroy()

    this.showBoardClearedFlash()

    // TODO: analytics hook — board_cleared, board: this.boardCount, score: this.scoreSystem.getScore()

    const poki = this.plugins.get('poki') as import('@poki/phaser-3').PokiPlugin | null
    const afterBreak = () => this.refillBoard()

    if (poki) {
      poki.commercialBreak().then(afterBreak)
    } else {
      this.time.delayedCall(600, afterBreak)
    }
  }

  private showBoardClearedFlash(): void {
    const label = this.add
      .text(CX, CY, '✓ Board Cleared!', {
        fontSize: '34px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#e91e63',
        strokeThickness: 4,
        resolution: 2
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setAlpha(0)

    this.tweens.add({
      targets: label,
      alpha: 1,
      y: CY - 30,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: label,
          alpha: 0,
          y: CY - 70,
          delay: 400,
          duration: 350,
          ease: 'Quad.easeIn',
          onComplete: () => label.destroy()
        })
      }
    })
  }

  private refillBoard(): void {
    const { refillStaggerMs } = BALANCING
    this.poppedCount = 0

    for (const cell of this.cells) {
      const delay = (cell.row + cell.col) * refillStaggerMs
      this.time.delayedCall(delay, () => {
        cell.state = 'refilling'
        cell.sprite.setScale(0)
        cell.sprite.setVisible(true)
        cell.ring.setAlpha(0)
        cell.ring.setScale(1)

        this.tweens.add({
          targets: cell.sprite,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
          ease: 'Back.easeOut',
          onComplete: () => {
            cell.state = 'idle'
            cell.sprite.setInteractive({ useHandCursor: true })
          }
        })
      })
    }

    const maxDelay =
      (BALANCING.boardRows - 1 + BALANCING.boardCols - 1) * refillStaggerMs + 220
    this.time.delayedCall(maxDelay, () => {
      this.isRefilling = false
      this.updateHUD(false)
    })
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  private createHUD(): void {
    // Score — centered top
    this.scoreText = this.add
      .text(CX, 28, 'Score: 0', {
        fontSize: '22px',
        fontFamily: 'Arial, sans-serif',
        color: CLASSIC.hudColor,
        fontStyle: 'bold',
        resolution: 2
      })
      .setOrigin(0.5, 0)
      .setDepth(20)

    // Board counter — below score
    this.boardText = this.add
      .text(CX, 58, 'Board 1', {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#9e7c6e',
        resolution: 2
      })
      .setOrigin(0.5, 0)
      .setDepth(20)

    // Combo badge — below board counter, hidden until combo > 1x
    this.comboText = this.add
      .text(CX, 82, '', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: CLASSIC.comboColors[0],
        fontStyle: 'bold',
        resolution: 2
      })
      .setOrigin(0.5, 0)
      .setDepth(20)
      .setVisible(false)

    // Mute toggle — top left
    const muteBtn = this.add
      .text(16, 16, AudioManager.muted ? '🔇' : '🔊', {
        fontSize: '24px',
        resolution: 2
      })
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
    muteBtn.on('pointerdown', () => {
      AudioManager.toggleMute()
      muteBtn.setText(AudioManager.muted ? '🔇' : '🔊')
    })

    // Exit button — top right
    const exitBtn = this.add
      .text(GAME_CONFIG.width - 16, 16, '✕', {
        fontSize: '24px',
        color: CLASSIC.hudColor,
        resolution: 2
      })
      .setOrigin(1, 0)
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
    exitBtn.on('pointerdown', () => this.exitToMenu())
  }

  private updateHUD(animateCombo: boolean): void {
    this.scoreText.setText(`Score: ${formatScore(this.scoreSystem.getScore())}`)
    this.boardText.setText(`Board ${this.boardCount + 1}`)

    const mult = this.comboSystem.multiplier
    const streak = this.comboSystem.streak

    if (mult > 1) {
      const tierIndex = BALANCING.comboMultipliers.indexOf(mult as never)
      const color = CLASSIC.comboColors[tierIndex] ?? CLASSIC.comboColors[0]
      this.comboText
        .setText(`${mult}x COMBO  🔥 ${streak}`)
        .setColor(color)
        .setVisible(true)

      if (animateCombo) {
        this.tweens.killTweensOf(this.comboText)
        this.comboText.setScale(1.4)
        this.tweens.add({
          targets: this.comboText,
          scaleX: 1,
          scaleY: 1,
          duration: 220,
          ease: 'Back.easeOut'
        })
      }
    } else {
      this.comboText.setVisible(false)
    }
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  private exitToMenu(): void {
    if (this.comboResetTimer) this.comboResetTimer.destroy()
    this.cameras.main.fadeOut(BALANCING.sceneFadeDuration, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('ResultScene', {
        score: this.scoreSystem.getScore(),
        highScore: this.scoreSystem.getHighScore(),
        isNewHighScore: this.scoreSystem.isNewHighScore()
      })
    })
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  shutdown(): void {
    if (this.comboResetTimer) this.comboResetTimer.destroy()
    this.cells = []
  }
}
