/**
 * PreloadScene.ts
 * Loads all game assets and shows a progress bar during loading.
 *
 * Poki: The PokiPlugin automatically calls gameLoadingFinished
 * when this scene's load completes (configured via loadingSceneKey in main.ts).
 *
 * Fruit Pop currently uses generated placeholder textures so the
 * game runs without external art files. Replace these generated
 * textures with real assets when they are available.
 */

import { ProgressBar } from '../components/ProgressBar'
import { config } from '../core/Config'
import { pokiGameLoadingFinished } from '../core/PokiLifecycle'
import { GAME_CONFIG } from '../data/gameConfig'
import { BALANCING } from '../data/balancing'

const CX = GAME_CONFIG.width / 2
const CY = GAME_CONFIG.height / 2

export class PreloadScene extends Phaser.Scene {
  private progressBar!: ProgressBar
  private loadingText!: Phaser.GameObjects.Text
  private percentText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload(): void {
    this.cameras.main.setBackgroundColor(config.game.backgroundColor)

    this.createLoadingUI()
    this.registerLoadEvents()
    this.loadAssets()
  }

  create(): void {
    pokiGameLoadingFinished(this)
    this.cameras.main.fadeOut(BALANCING.sceneFadeDuration, 0, 0, 0)
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => this.scene.start('MenuScene')
    )
  }

  private createLoadingUI(): void {
    this.add
      .text(CX, CY - 100, config.game.title, {
        fontSize: '32px',
        fontFamily: 'Arial, sans-serif',
        color: '#5f4b2c',
        fontStyle: 'bold',
        resolution: 2
      })
      .setOrigin(0.5)

    this.loadingText = this.add
      .text(CX, CY - 20, 'Loading...', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a6141',
        resolution: 2
      })
      .setOrigin(0.5)

    this.progressBar = new ProgressBar({
      scene: this,
      x: CX,
      y: CY + 20,
      width: 300,
      height: 20,
      trackColor: 0xd8c4a1,
      fillColor: 0xf26b5d,
      highlightColor: 0xffb18f
    })

    this.percentText = this.add
      .text(CX, CY + 60, '0%', {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a6141',
        resolution: 2
      })
      .setOrigin(0.5)

    this.add
      .text(CX, GAME_CONFIG.height - 30, `v${config.game.version}`, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#8c7352',
        resolution: 2
      })
      .setOrigin(0.5)
  }

  private registerLoadEvents(): void {
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      this.progressBar.setValue(value)
      this.percentText.setText(`${Math.round(value * 100)}%`)
    })

    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      this.loadingText.setText('Ready!')
      this.progressBar.setValue(1)
      this.percentText.setText('100%')
    })
  }

  private loadAssets(): void {
    const fruitSize = 96
    const fruitHalf = fruitSize / 2

    const fruitGfx = this.make.graphics({ x: 0, y: 0 }, false)
    fruitGfx.fillStyle(0xffffff, 1)
    fruitGfx.fillCircle(fruitHalf, fruitHalf + 2, fruitHalf - 10)
    fruitGfx.fillStyle(0xffffff, 0.3)
    fruitGfx.fillCircle(fruitHalf - 18, fruitHalf - 18, 14)
    fruitGfx.fillStyle(0xffffff, 1)
    fruitGfx.fillRoundedRect(fruitHalf - 4, 10, 8, 18, 3)
    fruitGfx.fillStyle(0xffffff, 0.9)
    fruitGfx.fillEllipse(fruitHalf + 12, 16, 18, 10)
    fruitGfx.generateTexture('fruit', fruitSize, fruitSize)
    fruitGfx.destroy()

    const splatSize = 96
    const splatHalf = splatSize / 2
    const splatGfx = this.make.graphics({ x: 0, y: 0 }, false)
    splatGfx.fillStyle(0xffffff, 1)
    splatGfx.fillEllipse(splatHalf, splatHalf, 54, 40)
    splatGfx.fillEllipse(splatHalf - 22, splatHalf - 8, 20, 14)
    splatGfx.fillEllipse(splatHalf + 20, splatHalf - 10, 18, 12)
    splatGfx.fillEllipse(splatHalf - 10, splatHalf + 20, 16, 12)
    splatGfx.fillEllipse(splatHalf + 18, splatHalf + 14, 14, 10)
    splatGfx.generateTexture('splatter', splatSize, splatSize)
    splatGfx.destroy()

    const particleGfx = this.make.graphics({ x: 0, y: 0 }, false)
    particleGfx.fillStyle(0xffffff, 0.95)
    particleGfx.fillCircle(4, 4, 4)
    particleGfx.generateTexture('particle', 8, 8)
    particleGfx.destroy()

    this.load.audio('sfx_countdown', 'assets/sfx_countdown.wav')
    this.load.audio('sfx_go', 'assets/sfx_go.wav')
    this.load.audio('sfx_pop', 'assets/sfx_pop.wav')
    this.load.audio('sfx_perfect', 'assets/sfx_perfect.wav')
    this.load.audio('sfx_rotten', 'assets/sfx_rotten.wav')
    this.load.audio('sfx_win', 'assets/sfx_win.wav')
    this.load.audio('sfx_lose', 'assets/sfx_lose.wav')
  }
}
