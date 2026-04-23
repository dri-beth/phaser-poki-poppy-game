/**
 * CountdownScene.ts
 * Simple 3-2-1-GO transition before Fruit Pop gameplay begins.
 */

import { GAME_CONFIG } from '../data/gameConfig'
import { BALANCING, FRUIT_POP_MAX_LEVEL, getFruitPopLevel } from '../data/balancing'
import { config } from '../core/Config'
import type { FruitPopRunData } from '../types/fruitPop'

const CX = GAME_CONFIG.width / 2
const CY = GAME_CONFIG.height / 2

const STEPS = ['3', '2', '1', 'GO!']

export class CountdownScene extends Phaser.Scene {
  private level = 1
  private levelLabel = 'Warmup'
  private stepText!: Phaser.GameObjects.Text
  private stepIndex = 0

  constructor() {
    super({ key: 'CountdownScene' })
  }

  init(data: FruitPopRunData): void {
    this.level = Math.max(1, Math.floor(data?.level ?? 1))
    const levelConfig = getFruitPopLevel(this.level)
    this.levelLabel = levelConfig.label
  }

  create(): void {
    this.cameras.main.setBackgroundColor(config.game.backgroundColor)
    this.createBackdrop()
    this.createText()
    this.runSequence()
  }

  private createBackdrop(): void {
    const bg = this.add.graphics()
    bg.fillGradientStyle(0xf7ead4, 0xf7ead4, 0xe9f4dc, 0xe7f0ff, 1)
    bg.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)

    const fruit = this.add.image(CX, CY - 40, 'fruit')
    fruit.setDisplaySize(220, 220)
    fruit.setAlpha(0.16)
    fruit.setTint(0xf26b5d)
  }

  private createText(): void {
    this.add
      .text(CX, CY - 156, `LEVEL ${this.level} / ${FRUIT_POP_MAX_LEVEL}`, {
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        fontStyle: 'bold',
        resolution: 2
      })
      .setOrigin(0.5)

    this.add
      .text(CX, CY - 126, this.levelLabel, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#8c7352',
        resolution: 2
      })
      .setOrigin(0.5)

    this.add
      .text(CX, CY - 102, `BOARD ${getFruitPopLevel(this.level).boardLabel}`, {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#8c7352',
        resolution: 2
      })
      .setOrigin(0.5)

    this.stepText = this.add
      .text(CX, CY, '', {
        fontSize: '120px',
        fontFamily: 'Arial, sans-serif',
        color: '#f26b5d',
        fontStyle: 'bold',
        stroke: '#ffffff',
        strokeThickness: 8,
        resolution: 2
      })
      .setOrigin(0.5)

    this.add
      .text(CX, CY + 124, 'Ready to harvest', {
        fontSize: '22px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        resolution: 2
      })
      .setOrigin(0.5)
  }

  private runSequence(): void {
    const showStep = (): void => {
      const label = STEPS[this.stepIndex]
      this.stepText.setText(label)
      this.stepText.setScale(label === 'GO!' ? 1.15 : 1)

      this.tweens.killTweensOf(this.stepText)
      this.tweens.add({
        targets: this.stepText,
        scaleX: label === 'GO!' ? 1.35 : 1.2,
        scaleY: label === 'GO!' ? 1.35 : 1.2,
        duration: 180,
        yoyo: true,
        ease: 'Back.easeOut'
      })

      if (label === 'GO!') {
        this.cameras.main.flash(120, 255, 255, 255)
        this.time.delayedCall(BALANCING.countdownGoHoldMs, () => {
          this.scene.start('GameScene', { level: this.level })
        })
        return
      }

      this.stepIndex += 1
      this.time.delayedCall(BALANCING.countdownStepMs, showStep)
    }

    showStep()
  }
}
