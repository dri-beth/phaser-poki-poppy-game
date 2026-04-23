/**
 * ResultScene.ts
 * Fruit Pop end screen for win/lose outcomes.
 */

import { UIButton } from '../components/UIButton'
import { config } from '../core/Config'
import { GAME_CONFIG } from '../data/gameConfig'
import { BALANCING } from '../data/balancing'
import { formatScore } from '../utils/helpers'
import type { FruitPopResultData } from '../types/fruitPop'

const CX = GAME_CONFIG.width / 2
const CY = GAME_CONFIG.height / 2

const DEFAULT_RESULT: FruitPopResultData = {
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
    this.cameras.main.setBackgroundColor(config.game.backgroundColor)
    this.cameras.main.fadeIn(BALANCING.sceneFadeDuration, 0, 0, 0)

    this.createBackground()
    this.createSummary()
    this.createButtons()
    this.setupKeyboard()

    // TODO: analytics hook - result_screen_shown
  }

  private createBackground(): void {
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
    bg.fillCircle(CX - 110, 180, 170)
    bg.fillStyle(isWin ? 0xffb18f : 0x5f4b2c, 0.1)
    bg.fillCircle(CX + 90, GAME_CONFIG.height - 180, 200)
  }

  private createSummary(): void {
    const { outcome, reason, score, perfectPops, highScore, isNewHighScore, grade } =
      this.resultData
    const isWin = outcome === 'win'
    const headline = isWin ? 'HARVEST COMPLETE' : 'ROUND OVER'
    const accent = isWin ? '#7ccf5b' : '#d95a4e'

    this.add
      .text(CX, CY - 210, isWin ? 'WIN' : 'LOSE', {
        fontSize: '42px',
        fontFamily: 'Arial, sans-serif',
        color: accent,
        fontStyle: 'bold',
        resolution: 2,
        stroke: '#ffffff',
        strokeThickness: 4
      })
      .setOrigin(0.5)

    this.add
      .text(CX, CY - 160, headline, {
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        fontStyle: 'bold',
        resolution: 2
      })
      .setOrigin(0.5)

    this.add
      .text(CX, CY - 128, reason, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#8c7352',
        resolution: 2
      })
      .setOrigin(0.5)

    const card = this.add.graphics()
    card.fillStyle(0xffffff, 0.72)
    card.fillRoundedRect(CX - 165, CY - 80, 330, 250, 18)
    card.lineStyle(2, accent === '#7ccf5b' ? 0x7ccf5b : 0xd95a4e, 0.35)
    card.strokeRoundedRect(CX - 165, CY - 80, 330, 250, 18)

    this.add
      .text(CX, CY - 48, 'Score', {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#8c7352',
        resolution: 2
      })
      .setOrigin(0.5)

    const scoreValue = this.add
      .text(CX, CY - 20, formatScore(score), {
        fontSize: '54px',
        fontFamily: 'Arial, sans-serif',
        color: accent,
        fontStyle: 'bold',
        resolution: 2
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
      .text(CX, CY + 42, `Perfect Pops: ${perfectPops}`, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        resolution: 2
      })
      .setOrigin(0.5)

    this.add
      .text(CX, CY + 72, `Grade: ${grade}`, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: isWin ? '#7ccf5b' : '#d95a4e',
        fontStyle: 'bold',
        resolution: 2
      })
      .setOrigin(0.5)

    if (isNewHighScore) {
      const banner = this.add
        .text(CX, CY + 104, 'NEW BEST!', {
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
        .text(CX, CY + 104, `Best: ${formatScore(highScore)}`, {
          fontSize: '16px',
          fontFamily: 'Arial, sans-serif',
          color: '#8c7352',
          resolution: 2
        })
        .setOrigin(0.5)
    }
  }

  private createButtons(): void {
    new UIButton({
      scene: this,
      x: CX,
      y: CY + 176,
      width: 240,
      height: 64,
      label: 'PLAY AGAIN',
      fontSize: 24,
      color: 0xf26b5d,
      hoverColor: 0xff7f73,
      pressColor: 0xd95a4e,
      onClick: () => this.restartGame()
    })

    new UIButton({
      scene: this,
      x: CX,
      y: CY + 256,
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
    this.cameras.main.fadeOut(BALANCING.sceneFadeDuration, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('CountdownScene')
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
  }
}
