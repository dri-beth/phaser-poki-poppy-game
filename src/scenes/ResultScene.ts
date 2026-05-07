/**
 * ResultScene.ts
 * Fruit Pop end screen for win/lose outcomes.
 */

import { UIButton } from '../components/UIButton'
import { config } from '../core/Config'
import { getViewportLayout, type ViewportLayout } from '../core/ViewportLayout'
import { GAME_CONFIG } from '../data/gameConfig'
import { BALANCING, FRUIT_POP_MAX_LEVEL } from '../data/balancing'
import { formatScore } from '../utils/helpers'
import type { FruitPopResultData } from '../types/fruitPop'

const DEFAULT_RESULT: FruitPopResultData = {
  level: 1,
  nextLevel: 1,
  outcome: 'lose',
  reason: "Time's up",
  score: 0,
  perfectPops: 0,
  totalFruits: 15,
  highScore: 0,
  isNewHighScore: false,
  grade: 'D'
}

export class ResultScene extends Phaser.Scene {
  private resultData: FruitPopResultData = DEFAULT_RESULT
  private enterKey!: Phaser.Input.Keyboard.Key
  private rKey!: Phaser.Input.Keyboard.Key
  private confettiEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null
  private confettiTimer: Phaser.Time.TimerEvent | null = null

  constructor() {
    super({ key: 'ResultScene' })
  }

  init(data: FruitPopResultData): void {
    this.resultData = {
      ...DEFAULT_RESULT,
      ...data
    }
  }

  create(): void {
    const layout = getViewportLayout(this)
    this.cameras.main.setBackgroundColor(config.game.backgroundColor)
    this.cameras.main.fadeIn(BALANCING.sceneFadeDuration, 0, 0, 0)

    this.createBackground(layout)
    this.createSummary(layout)
    this.createButtons(layout)
    this.setupKeyboard()
    this.startConfetti()

    // TODO: analytics hook - result_screen_shown
  }

  private createBackground(layout: ViewportLayout): void {
    const bg = this.add.graphics()
    const isWin = this.resultData.outcome === 'win'

    bg.fillGradientStyle(
      isWin ? 0xf7ead4 : 0xf1dbcc,
      isWin ? 0xf7ead4 : 0xf1dbcc,
      isWin ? 0xe9f4dc : 0xe9d7d0,
      isWin ? 0xe7f0ff : 0xded4ca,
      1
    )
    bg.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)

    bg.fillStyle(isWin ? 0x7ccf5b : 0x7a4b35, 0.1)
    bg.fillCircle(layout.cx - 110, 180, 170)
    bg.fillStyle(isWin ? 0xffb18f : 0x5f4b2c, 0.1)
    bg.fillCircle(layout.cx + 90, GAME_CONFIG.height - 180, 200)
  }

  private createSummary(layout: ViewportLayout): void {
    const { level, outcome, reason, score, perfectPops, highScore, isNewHighScore, grade } =
      this.resultData
    const isWin = outcome === 'win'
    const headline = isWin ? 'HARVEST COMPLETE' : 'ROUND OVER'
    const accent = isWin ? '#7ccf5b' : '#d95a4e'

    const topY = layout.isLandscape ? 86 : layout.cy - 232
    const cardY = layout.isLandscape ? 238 : layout.cy - 32
    const cardHeight = layout.isLandscape ? 220 : 262

    this.add
      .text(layout.cx, topY, `LEVEL ${level} / ${FRUIT_POP_MAX_LEVEL}`, {
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        fontStyle: 'bold',
        resolution: 3
      })
      .setOrigin(0.5)

    this.add
      .text(layout.cx, topY + 38, isWin ? 'WIN' : 'LOSE', {
        fontSize: '42px',
        fontFamily: 'Arial, sans-serif',
        color: accent,
        fontStyle: 'bold',
        resolution: 3,
        stroke: '#ffffff',
        strokeThickness: 4
      })
      .setOrigin(0.5)

    this.add
      .text(layout.cx, topY + 84, headline, {
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        fontStyle: 'bold',
        resolution: 3
      })
      .setOrigin(0.5)

    this.add
      .text(layout.cx, topY + 116, reason, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#8c7352',
        resolution: 3
      })
      .setOrigin(0.5)

    const card = this.add.graphics()
    card.fillStyle(0xffffff, 0.72)
    card.fillRoundedRect(layout.cx - 165, cardY, 330, cardHeight, 18)
    card.lineStyle(2, accent === '#7ccf5b' ? 0x7ccf5b : 0xd95a4e, 0.35)
    card.strokeRoundedRect(layout.cx - 165, cardY, 330, cardHeight, 18)

    this.add
      .text(layout.cx, cardY + 28, 'Score', {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#8c7352',
        resolution: 3
      })
      .setOrigin(0.5)

    const scoreValue = this.add
      .text(layout.cx, cardY + 56, formatScore(score), {
        fontSize: '54px',
        fontFamily: 'Arial, sans-serif',
        color: accent,
        fontStyle: 'bold',
        resolution: 3
      })
      .setOrigin(0.5)

    if (score > 0) {
      let displayed = 0
      const increment = Math.max(1, Math.ceil(score / 40))
      const counter = this.time.addEvent({
        delay: 30,
        repeat: 40,
        callback: () => {
          displayed = Math.min(score, displayed + increment)
          scoreValue.setText(formatScore(displayed))
          if (displayed >= score) {
            counter.remove()
          }
        }
      })
    }

    this.add
      .text(layout.cx, cardY + 116, `Perfect Pops: ${perfectPops}`, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        resolution: 2
      })
      .setOrigin(0.5)

    this.add
      .text(layout.cx, cardY + 146, `Grade: ${grade}`, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: isWin ? '#7ccf5b' : '#d95a4e',
        fontStyle: 'bold',
        resolution: 2
      })
      .setOrigin(0.5)

    if (isNewHighScore) {
      const banner = this.add
        .text(layout.cx, cardY + 198, 'NEW BEST!', {
          fontSize: '20px',
          fontFamily: 'Arial, sans-serif',
          color: '#f26b5d',
          fontStyle: 'bold',
          resolution: 2
        })
        .setOrigin(0.5)

      this.tweens.add({
        targets: banner,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    } else if (highScore > 0) {
      this.add
        .text(layout.cx, cardY + 206, `Best: ${formatScore(highScore)}`, {
          fontSize: '16px',
          fontFamily: 'Arial, sans-serif',
          color: '#8c7352',
          resolution: 2
        })
        .setOrigin(0.5)
    }
  }

  private startConfetti(): void {
    if (this.resultData.outcome !== 'win') {
      return
    }

    this.confettiEmitter = this.add.particles(0, 0, 'particle', {
      speedX: { min: -50, max: 50 },
      speedY: { min: 80, max: 180 },
      scale: { start: 1.4, end: 0.2 },
      alpha: { start: 0.95, end: 0 },
      lifespan: { min: 700, max: 1200 },
      quantity: 0,
      emitting: false
    })
    this.confettiEmitter.setDepth(25)

    this.scheduleNextConfettiBurst()
  }

  private scheduleNextConfettiBurst(): void {
    this.confettiTimer = this.time.delayedCall(Phaser.Math.Between(1000, 2000), () => {
      if (!this.confettiEmitter) return
      const burstX = Phaser.Math.Between(24, Math.floor(this.cameras.main.width - 24))
      const burstY = Phaser.Math.Between(24, Math.floor(this.cameras.main.height * 0.5))
      this.confettiEmitter.explode(Phaser.Math.Between(14, 24), burstX, burstY)
      this.scheduleNextConfettiBurst()
    })
  }

  private createButtons(layout: ViewportLayout): void {
    const primaryLabel =
      this.resultData.outcome === 'win' && this.resultData.nextLevel > this.resultData.level
        ? 'NEXT LEVEL'
        : this.resultData.outcome === 'win'
          ? 'REPLAY'
          : 'TRY AGAIN'

    new UIButton({
      scene: this,
      x: layout.cx,
      y: layout.isLandscape ? 700 : layout.cy + 196,
      width: 240,
      height: 64,
      label: primaryLabel,
      fontSize: 24,
      color: 0xf26b5d,
      hoverColor: 0xff7f73,
      pressColor: 0xd95a4e,
      onClick: () => this.restartGame()
    })

    new UIButton({
      scene: this,
      x: layout.cx,
      y: layout.isLandscape ? 772 : layout.cy + 274,
      width: 200,
      height: 52,
      label: 'MENU',
      fontSize: 20,
      color: 0x8c7352,
      hoverColor: 0xa28967,
      pressColor: 0x6d5740,
      onClick: () => this.goToMenu()
    })
  }

  private setupKeyboard(): void {
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R)

    this.enterKey.on('down', this.restartGame, this)
    this.rKey.on('down', this.restartGame, this)
  }

  private restartGame(): void {
    // TODO: analytics hook - game_restarted
    const nextLevel =
      this.resultData.outcome === 'win' ? this.resultData.nextLevel : 1
    this.cameras.main.fadeOut(BALANCING.sceneFadeDuration, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('CountdownScene', { level: nextLevel })
    })
  }

  private goToMenu(): void {
    this.cameras.main.fadeOut(BALANCING.sceneFadeDuration, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('MenuScene')
    })
  }

  shutdown(): void {
    this.enterKey?.destroy()
    this.rKey?.destroy()
    this.confettiTimer?.destroy()
    this.confettiTimer = null
    this.confettiEmitter?.destroy()
    this.confettiEmitter = null
  }
}
